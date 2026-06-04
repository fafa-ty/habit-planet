import {
  loadData, saveData, loadSettings, saveSettings,
  generateId, exportData, importData, clearAllData,
  todayStr, addDays, formatDisplayDate, getGreeting, getDayLabel,
  CATEGORY_LABELS, ICONS, COLORS, DEFAULT_HABITS,
} from "./utils.js";

import {
  isCheckedIn, getCheckIn, getHabitStreak, getBestStreak,
  getTodayProgress,   getWeekStats, getWeekCompletionRate,
  getMonthCompletionRate, getTotalCheckIns, getTotalActiveDays,
  getGlobalBestStreak, getHeatmapData, getHabitRanking,
  getOverallStreak, getDayCompletionRate,
} from "./stats.js";

import {
  ACHIEVEMENTS, getUnlockedAchievements, getNewlyUnlocked,
} from "./achievements.js";

import { launchConfetti, showToast, showConfirm } from "./ui.js";
import { HABIT_TEMPLATES, getDailyQuote } from "./templates.js";
import {
  getDueReminders, requestNotificationPermission, sendReminderNotification,
} from "./reminders.js";
import { shouldShowWeeklyReport, buildWeeklyReport } from "./weekly-report.js";
import {
  SyncManager, isSyncEnabled, getSyncConfig, getDeviceId,
  createSyncSpace, verifySyncCredentials, checkServerHealth, formatSyncTime,
} from "./sync.js";

class HabitPlanetApp {
  constructor() {
    this.data = loadData();
    this.settings = loadSettings();
    this.currentPage = "today";
    this.categoryFilter = "all";
    this.previousAchievements = getUnlockedAchievements(
      this.data.habits, this.data.checkIns
    ).map((a) => a.id);

    this.initTheme();
    this.bindEvents();
    this.initOnboarding();
    this.initSettingsUI();
    this.initSync();
    this.render();
    this.startReminderLoop();
    this.checkWeeklyReport();
    this.syncManager.init();
  }

  initSync() {
    if (!this.settings.sync) {
      this.settings.sync = getSyncConfig(this.settings);
    }
    if (!this.settings.sync.deviceId) {
      this.settings.sync.deviceId = getDeviceId(this.settings);
      saveSettings(this.settings);
    }
    this.syncManager = new SyncManager(this);
    this.updateSyncUI();
  }

  persistLocal() {
    saveData(this.data);
    this.syncManager.schedulePush();
  }

  persistSettings() {
    saveSettings(this.settings);
    this.syncManager.schedulePush();
  }

  saveSettingsOnly() {
    saveSettings(this.settings);
  }

  showSyncToast(message, type = "info") {
    showToast(message, type);
  }

  initSettingsUI() {
    const notifToggle = document.getElementById("notifications-toggle");
    const weeklyToggle = document.getElementById("weekly-report-toggle");
    if (notifToggle) notifToggle.checked = this.settings.notificationsEnabled;
    if (weeklyToggle) weeklyToggle.checked = this.settings.weeklyReportEnabled !== false;

    const serverInput = document.getElementById("sync-server-url");
    if (serverInput) {
      serverInput.value = getSyncConfig(this.settings).serverUrl;
    }
  }

  updateSyncUI() {
    const sync = getSyncConfig(this.settings);
    const dot = document.getElementById("sync-status-dot");
    const label = document.getElementById("sync-status-label");
    const desc = document.getElementById("sync-status-desc");
    const idDisplay = document.getElementById("sync-id-display");
    const idText = document.getElementById("sync-id-text");
    const lastTime = document.getElementById("sync-last-time");
    const disconnected = document.getElementById("sync-actions-disconnected");
    const connected = document.getElementById("sync-actions-connected");

    if (!dot) return;

    dot.className = "sync-status-dot";
    if (!sync.enabled) {
      label.textContent = "未开启";
      desc.textContent = "创建或加入同步空间，多设备共享数据";
      idDisplay.classList.add("hidden");
      lastTime.textContent = "";
      disconnected.classList.remove("hidden");
      connected.classList.add("hidden");
    } else {
      dot.classList.add(sync.status || "idle");
      const statusLabels = {
        synced: "已同步",
        syncing: "同步中…",
        error: "同步失败",
        idle: "已连接",
      };
      label.textContent = statusLabels[sync.status] || "已连接";
      desc.textContent = `同步 ID：${sync.syncId}`;
      idDisplay.classList.remove("hidden");
      idText.textContent = sync.syncId;
      lastTime.textContent = `上次同步：${formatSyncTime(sync.lastSyncedAt)}`;
      disconnected.classList.add("hidden");
      connected.classList.remove("hidden");
    }
  }

  getDismissedReminders() {
    const today = todayStr();
    return this.settings.dismissedReminders?.[today] || [];
  }

  dismissReminders() {
    const today = todayStr();
    const due = getDueReminders(
      this.data.habits, this.data.checkIns, this.getDismissedReminders()
    );
    if (!this.settings.dismissedReminders) this.settings.dismissedReminders = {};
    this.settings.dismissedReminders[today] = due.map((h) => h.id);
    this.persistSettings();
    this.renderReminderBanner();
  }

  startReminderLoop() {
    this.checkReminders();
    setInterval(() => this.checkReminders(), 60000);
  }

  checkReminders() {
    const dismissed = this.getDismissedReminders();
    const due = getDueReminders(this.data.habits, this.data.checkIns, dismissed);

    if (due.length > 0 && this.settings.notificationsEnabled) {
      for (const habit of due) {
        sendReminderNotification(habit);
      }
    }

    this.renderReminderBanner();
  }

  renderReminderBanner() {
    const banner = document.getElementById("reminder-banner");
    if (!banner) return;

    const due = getDueReminders(
      this.data.habits, this.data.checkIns, this.getDismissedReminders()
    );

    if (due.length === 0) {
      banner.classList.add("hidden");
      return;
    }

    banner.classList.remove("hidden");
    document.getElementById("reminder-banner-title").textContent =
      `还有 ${due.length} 个习惯未完成`;
    document.getElementById("reminder-banner-desc").textContent =
      due.map((h) => `${h.icon} ${h.name}`).join("、");
  }

  checkWeeklyReport() {
    if (shouldShowWeeklyReport(this.settings)) {
      setTimeout(() => this.openWeeklyReport(true), 800);
    }
  }

  openWeeklyReport(markShown = false) {
    const report = buildWeeklyReport(this.data.habits, this.data.checkIns);
    const modal = document.getElementById("weekly-report-modal");

    document.getElementById("weekly-report-range").textContent = report.weekRange;
    document.getElementById("weekly-report-stats").innerHTML = `
      <div class="weekly-stat">
        <span class="weekly-stat-value">${report.avgRate}%</span>
        <span class="weekly-stat-label">平均完成率</span>
      </div>
      <div class="weekly-stat">
        <span class="weekly-stat-value">${report.totalCheckIns}</span>
        <span class="weekly-stat-label">打卡次数</span>
      </div>
      <div class="weekly-stat">
        <span class="weekly-stat-value">${report.perfectDays}</span>
        <span class="weekly-stat-label">完美天数</span>
      </div>
    `;

    const maxRate = Math.max(...report.dailyRates.map((d) => d.rate), 1);
    document.getElementById("weekly-report-chart").innerHTML = report.dailyRates.map((d) => `
      <div class="weekly-report-bar-wrap">
        <div class="weekly-report-bar" style="height: ${Math.max(4, (d.rate / maxRate) * 100)}%"></div>
        <span class="weekly-report-bar-label">${d.label.replace("周", "")}</span>
      </div>
    `).join("");

    const topEl = document.getElementById("weekly-report-top");
    if (report.topHabits.length > 0) {
      topEl.innerHTML = `
        <h3>🏅 上周最活跃习惯</h3>
        ${report.topHabits.map((r, i) => `
          <div class="weekly-top-item">
            <span class="weekly-top-rank">${i + 1}</span>
            <span>${r.habit.icon} ${this.escape(r.habit.name)}</span>
            <span style="margin-left:auto;color:var(--color-text-secondary)">${r.count} 次</span>
          </div>
        `).join("")}
      `;
    } else {
      topEl.innerHTML = "<p style='color:var(--color-text-secondary);font-size:0.9rem'>上周暂无打卡记录</p>";
    }

    modal.classList.remove("hidden");

    if (markShown) {
      this.settings.lastWeeklyReportShown = todayStr();
      this.persistSettings();
    }
  }

  closeWeeklyReport() {
    document.getElementById("weekly-report-modal").classList.add("hidden");
  }

  closeWeeklyReport() {
    document.getElementById("weekly-report-modal").classList.add("hidden");
  }

  async handleCreateSync() {
    const serverUrl = document.getElementById("sync-server-url")?.value.trim();
    if (serverUrl) this.settings.sync = { ...getSyncConfig(this.settings), serverUrl };

    const online = await checkServerHealth(this.settings);
    if (!online) {
      showToast("无法连接同步服务器，请先启动 server（npm start）", "error");
      return;
    }

    try {
      const { syncId, token } = await createSyncSpace(this.settings);
      document.getElementById("sync-modal-title").textContent = "同步空间已创建";
      document.getElementById("sync-modal-join").classList.add("hidden");
      document.getElementById("sync-modal-create").classList.remove("hidden");
      document.getElementById("new-sync-id").textContent = syncId;
      document.getElementById("new-sync-token").textContent = token;
      document.getElementById("sync-modal").classList.remove("hidden");

      this._pendingSync = { syncId, token };
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  finishCreateSync() {
    if (!this._pendingSync) return;
    this.settings.sync = {
      ...getSyncConfig(this.settings),
      enabled: true,
      syncId: this._pendingSync.syncId,
      token: this._pendingSync.token,
      deviceId: getDeviceId(this.settings),
      status: "idle",
      lastSyncedAt: null,
    };
    this._pendingSync = null;
    this.persistSettings();
    this.closeSyncModal();
    this.updateSyncUI();
    this.syncManager.push();
    showToast("云同步已开启", "success");
  }

  openSyncJoinModal() {
    document.getElementById("sync-modal-title").textContent = "加入同步空间";
    document.getElementById("sync-modal-create").classList.add("hidden");
    document.getElementById("sync-modal-join").classList.remove("hidden");
    document.getElementById("join-sync-id").value = "";
    document.getElementById("join-sync-token").value = "";
    document.getElementById("sync-modal").classList.remove("hidden");
  }

  closeSyncModal() {
    document.getElementById("sync-modal").classList.add("hidden");
  }

  async handleJoinSync() {
    const syncId = document.getElementById("join-sync-id").value.trim().toUpperCase();
    const token = document.getElementById("join-sync-token").value.trim();
    const serverUrl = document.getElementById("sync-server-url")?.value.trim();

    if (!syncId || !token) {
      showToast("请填写同步 ID 和密钥", "error");
      return;
    }

    if (serverUrl) {
      this.settings.sync = { ...getSyncConfig(this.settings), serverUrl };
    }

    const online = await checkServerHealth(this.settings);
    if (!online) {
      showToast("无法连接同步服务器", "error");
      return;
    }

    try {
      await verifySyncCredentials(this.settings, syncId, token);
      this.settings.sync = {
        ...getSyncConfig(this.settings),
        enabled: true,
        syncId,
        token,
        deviceId: getDeviceId(this.settings),
        status: "idle",
        lastSyncedAt: null,
      };
      this.persistSettings();
      this.closeSyncModal();
      this.updateSyncUI();
      await this.syncManager.pullAndMerge(false);
      showToast("已成功加入同步空间", "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async handleDisconnectSync() {
    const ok = await showConfirm("断开云同步", "断开后本机数据保留，但不再与云端同步。确定吗？");
    if (!ok) return;
    this.settings.sync = {
      ...getSyncConfig(this.settings),
      enabled: false,
      syncId: null,
      token: null,
      status: "idle",
    };
    this.saveSettingsOnly();
    this.updateSyncUI();
    showToast("已断开云同步", "info");
  }

  async copyText(text) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast("已复制到剪贴板", "success");
    } catch {
      showToast("复制失败", "error");
    }
  }

  initTheme() {
    document.documentElement.setAttribute("data-theme", this.settings.theme);
    const toggle = document.getElementById("theme-toggle");
    if (toggle) toggle.checked = this.settings.theme === "dark";
  }

  bindEvents() {
    document.querySelectorAll("[data-page]").forEach((el) => {
      el.addEventListener("click", () => this.navigate(el.dataset.page));
    });

    document.getElementById("add-habit-btn")?.addEventListener("click", () => this.openHabitModal());
    document.getElementById("quick-add-habit")?.addEventListener("click", () => this.openHabitModal());
    document.getElementById("empty-add-habit")?.addEventListener("click", () => this.openHabitModal());

    document.getElementById("habit-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.saveHabit();
    });

    document.getElementById("habit-modal-close")?.addEventListener("click", () => this.closeHabitModal());
    document.getElementById("habit-cancel")?.addEventListener("click", () => this.closeHabitModal());
    document.querySelector("#habit-modal .modal-backdrop")?.addEventListener("click", () => this.closeHabitModal());

    document.querySelectorAll("#category-filter .filter-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        this.categoryFilter = chip.dataset.category;
        document.querySelectorAll("#category-filter .filter-chip").forEach((c) =>
          c.classList.toggle("active", c === chip)
        );
        this.renderHabitsPage();
      });
    });

    document.getElementById("theme-toggle")?.addEventListener("change", (e) => {
      this.settings.theme = e.target.checked ? "dark" : "light";
      this.persistSettings();
      this.initTheme();
    });

    document.getElementById("notifications-toggle")?.addEventListener("change", async (e) => {
      if (e.target.checked) {
        const perm = await requestNotificationPermission();
        if (perm !== "granted") {
          e.target.checked = false;
          showToast("请在浏览器中允许通知权限", "error");
          return;
        }
      }
      this.settings.notificationsEnabled = e.target.checked;
      this.persistSettings();
      showToast(e.target.checked ? "通知已开启" : "通知已关闭", "info");
    });

    document.getElementById("weekly-report-toggle")?.addEventListener("change", (e) => {
      this.settings.weeklyReportEnabled = e.target.checked;
      this.persistSettings();
    });

    document.getElementById("view-weekly-report")?.addEventListener("click", () => {
      this.openWeeklyReport(false);
    });

    document.getElementById("weekly-report-close")?.addEventListener("click", () => this.closeWeeklyReport());
    document.getElementById("weekly-report-ok")?.addEventListener("click", () => this.closeWeeklyReport());
    document.querySelector("#weekly-report-modal .modal-backdrop")?.addEventListener("click", () => this.closeWeeklyReport());

    document.getElementById("reminder-banner-dismiss")?.addEventListener("click", () => this.dismissReminders());

    document.getElementById("note-modal-close")?.addEventListener("click", () => this.closeNoteModal());
    document.getElementById("note-skip")?.addEventListener("click", () => this.completeCheckIn(null));
    document.getElementById("note-save")?.addEventListener("click", () => {
      const note = document.getElementById("note-text").value.trim();
      const today = todayStr();
      const existing = this.pendingCheckIn &&
        getCheckIn(this.data.checkIns, this.pendingCheckIn, today);
      if (existing) {
        this.saveNoteOnly();
      } else {
        this.completeCheckIn(note || null);
      }
    });
    document.querySelector("#note-modal .modal-backdrop")?.addEventListener("click", () => this.closeNoteModal());

    document.getElementById("sync-create")?.addEventListener("click", () => this.handleCreateSync());
    document.getElementById("sync-join")?.addEventListener("click", () => this.openSyncJoinModal());
    document.getElementById("sync-now")?.addEventListener("click", () => this.syncManager.pullAndMerge(false));
    document.getElementById("sync-disconnect")?.addEventListener("click", () => this.handleDisconnectSync());
    document.getElementById("sync-modal-close")?.addEventListener("click", () => this.closeSyncModal());
    document.getElementById("sync-join-cancel")?.addEventListener("click", () => this.closeSyncModal());
    document.getElementById("sync-join-confirm")?.addEventListener("click", () => this.handleJoinSync());
    document.getElementById("sync-create-done")?.addEventListener("click", () => this.finishCreateSync());
    document.querySelector("#sync-modal .modal-backdrop")?.addEventListener("click", () => this.closeSyncModal());
    document.getElementById("copy-sync-id")?.addEventListener("click", () => this.copyText(this.settings.sync?.syncId));
    document.querySelectorAll(".btn-copy[data-copy]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const el = document.getElementById(btn.dataset.copy);
        if (el) this.copyText(el.textContent);
      });
    });
    document.getElementById("sync-server-url")?.addEventListener("change", (e) => {
      if (!this.settings.sync) this.settings.sync = getSyncConfig(this.settings);
      this.settings.sync.serverUrl = e.target.value.trim() || getSyncConfig({}).serverUrl;
      this.saveSettingsOnly();
    });

    document.getElementById("export-data")?.addEventListener("click", () => {
      exportData(this.data);
      showToast("数据已导出", "success");
    });

    document.getElementById("import-data")?.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const data = await importData(file);
        this.data = data;
        this.persistLocal();
        this.render();
        showToast("数据导入成功", "success");
      } catch {
        showToast("导入失败，文件格式不正确", "error");
      }
      e.target.value = "";
    });

    document.getElementById("clear-data")?.addEventListener("click", async () => {
      const syncWarn = isSyncEnabled(this.settings)
        ? "云同步已开启，清除后也会同步到云端。"
        : "";
      const ok = await showConfirm("清除所有数据", `确定要删除所有习惯和打卡记录吗？此操作不可恢复。${syncWarn}`);
      if (ok) {
        clearAllData();
        this.data = { habits: [], checkIns: [] };
        this.persistLocal();
        this.render();
        showToast("数据已清除", "info");
      }
    });

    document.getElementById("onboarding-next")?.addEventListener("click", () => this.nextOnboardingStep());
    document.getElementById("onboarding-skip")?.addEventListener("click", () => this.finishOnboarding());

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeHabitModal();
        this.closeNoteModal();
        this.closeWeeklyReport();
        this.closeSyncModal();
        document.getElementById("confirm-modal")?.classList.add("hidden");
      }
      if (e.altKey && e.key >= "1" && e.key <= "4") {
        const pages = ["today", "habits", "stats", "settings"];
        this.navigate(pages[parseInt(e.key) - 1]);
      }
    });
  }

  initOnboarding() {
    if (this.settings.onboarded) return;

    document.getElementById("onboarding").classList.remove("hidden");
    this.onboardingStep = 0;
  }

  nextOnboardingStep() {
    const steps = document.querySelectorAll(".onboarding-step");
    const dots = document.querySelectorAll(".onboarding-dots .dot");

    steps[this.onboardingStep].classList.remove("active");
    dots[this.onboardingStep].classList.remove("active");

    this.onboardingStep++;

    if (this.onboardingStep >= steps.length) {
      this.finishOnboarding();
      return;
    }

    steps[this.onboardingStep].classList.add("active");
    dots[this.onboardingStep].classList.add("active");

    const btn = document.getElementById("onboarding-next");
    if (this.onboardingStep === steps.length - 1) {
      btn.textContent = "开始使用";
    }
  }

  finishOnboarding() {
    document.getElementById("onboarding").classList.add("hidden");
    this.settings.onboarded = true;
    this.persistSettings();

    if (this.data.habits.length === 0) {
      this.seedDefaultHabits();
    }
  }

  seedDefaultHabits() {
    const habitIds = [];
    for (const template of DEFAULT_HABITS) {
      const id = generateId();
      habitIds.push(id);
      this.data.habits.push({
        id,
        ...template,
        createdAt: addDays(todayStr(), -14),
        archived: false,
      });
    }
    this.seedDemoCheckIns(habitIds);
    this.persistLocal();
    showToast("已为你创建 3 个示例习惯", "info");
  }

  seedDemoCheckIns(habitIds) {
    const today = todayStr();
    for (let i = 14; i >= 0; i--) {
      const date = addDays(today, -i);
      for (const habitId of habitIds) {
        const chance = habitId === habitIds[0] ? 0.85 : habitId === habitIds[1] ? 0.7 : 0.6;
        if (Math.random() < chance) {
          this.data.checkIns.push({
            habitId,
            date,
            completedAt: new Date(date + "T08:00:00.000Z").toISOString(),
          });
        }
      }
    }
    const todayHabits = habitIds.slice(0, 2);
    for (const habitId of todayHabits) {
      if (!isCheckedIn(this.data.checkIns, habitId, today)) {
        this.data.checkIns.push({
          habitId,
          date: today,
          completedAt: new Date().toISOString(),
        });
      }
    }
  }

  navigate(page) {
    this.currentPage = page;
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
    document.getElementById(`page-${page}`)?.classList.add("active");

    document.querySelectorAll(".nav-item, .bottom-nav-item").forEach((el) => {
      el.classList.toggle("active", el.dataset.page === page);
    });

    if (page === "stats") this.renderStatsPage();
  }

  toggleCheckIn(habitId) {
    const today = todayStr();
    const existing = getCheckIn(this.data.checkIns, habitId, today);

    if (existing) {
      this.data.checkIns = this.data.checkIns.filter(
        (c) => !(c.habitId === habitId && c.date === today)
      );
      this.persistLocal();
      this.renderTodayPage();
      this.updateSidebar();
      this.renderReminderBanner();
      return;
    }

    this.pendingCheckIn = habitId;
    const habit = this.data.habits.find((h) => h.id === habitId);
    document.getElementById("note-habit-name").textContent =
      habit ? `${habit.icon} ${habit.name}` : "";
    document.getElementById("note-text").value = "";
    document.getElementById("note-save").textContent = "完成打卡";
    document.getElementById("note-modal").classList.remove("hidden");
    document.getElementById("note-text").focus();
  }

  closeNoteModal() {
    document.getElementById("note-modal").classList.add("hidden");
    this.pendingCheckIn = null;
    this.editingNote = false;
    document.getElementById("note-save").textContent = "完成打卡";
  }

  completeCheckIn(note) {
    if (!this.pendingCheckIn) return;

    const habitId = this.pendingCheckIn;
    const today = todayStr();

    this.data.checkIns.push({
      habitId,
      date: today,
      completedAt: new Date().toISOString(),
      note: note || undefined,
    });

    this.persistLocal();
    this.closeNoteModal();

    const progress = getTodayProgress(this.data.habits, this.data.checkIns);
    if (progress.percent === 100 && progress.total > 0) {
      launchConfetti(document.getElementById("confetti-canvas"));
      showToast("🎉 太棒了！今日习惯全部完成！", "success");
    } else {
      showToast("打卡成功", "success");
    }

    this.checkNewAchievements();
    this.renderTodayPage();
    this.updateSidebar();
    this.renderReminderBanner();
  }

  openNoteEditor(habitId) {
    const today = todayStr();
    const checkIn = getCheckIn(this.data.checkIns, habitId, today);
    const habit = this.data.habits.find((h) => h.id === habitId);

    if (!checkIn) {
      this.pendingCheckIn = habitId;
    } else {
      this.pendingCheckIn = habitId;
      this.editingNote = true;
    }

    document.getElementById("note-habit-name").textContent =
      habit ? `${habit.icon} ${habit.name}` : "";
    document.getElementById("note-text").value = checkIn?.note || "";
    document.getElementById("note-save").textContent = checkIn ? "保存备注" : "完成打卡";
    document.getElementById("note-modal").classList.remove("hidden");
    document.getElementById("note-text").focus();
  }

  saveNoteOnly() {
    const note = document.getElementById("note-text").value.trim();
    const today = todayStr();
    const checkIn = getCheckIn(this.data.checkIns, this.pendingCheckIn, today);

    if (checkIn) {
      if (note) {
        checkIn.note = note;
      } else {
        delete checkIn.note;
      }
      this.persistLocal();
      showToast("备注已保存", "success");
      this.closeNoteModal();
      this.renderTodayPage();
      return;
    }

    this.completeCheckIn(note || null);
  }

  checkNewAchievements() {
    const newly = getNewlyUnlocked(
      this.data.habits,
      this.data.checkIns,
      this.previousAchievements
    );
    for (const a of newly) {
      showToast(`🏆 解锁成就：${a.name}`, "success", 4000);
    }
    this.previousAchievements = getUnlockedAchievements(
      this.data.habits, this.data.checkIns
    ).map((a) => a.id);
  }

  openHabitModal(habit = null) {
    const modal = document.getElementById("habit-modal");
    document.getElementById("habit-modal-title").textContent =
      habit ? "编辑习惯" : "新建习惯";
    document.getElementById("habit-id").value = habit?.id || "";
    document.getElementById("habit-name").value = habit?.name || "";
    document.getElementById("habit-category").value = habit?.category || "health";
    document.getElementById("habit-reminder-enabled").checked = habit?.reminderEnabled ?? false;
    document.getElementById("habit-reminder-time").value = habit?.reminderTime || "08:00";

    this.renderIconPicker(habit?.icon || "📚");
    this.renderColorPicker(habit?.color || COLORS[0]);
    this.renderTemplatePicker(habit);

    document.getElementById("template-field").style.display = habit ? "none" : "block";

    modal.classList.remove("hidden");
    document.getElementById("habit-name").focus();
  }

  closeHabitModal() {
    document.getElementById("habit-modal").classList.add("hidden");
  }

  renderIconPicker(selected) {
    const picker = document.getElementById("icon-picker");
    picker.innerHTML = ICONS.map((icon) =>
      `<button type="button" class="icon-option${icon === selected ? " selected" : ""}" data-icon="${icon}">${icon}</button>`
    ).join("");

    picker.querySelectorAll(".icon-option").forEach((btn) => {
      btn.addEventListener("click", () => {
        picker.querySelectorAll(".icon-option").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
      });
    });
  }

  renderColorPicker(selected) {
    const picker = document.getElementById("color-picker");
    picker.innerHTML = COLORS.map((color) =>
      `<button type="button" class="color-option${color === selected ? " selected" : ""}" data-color="${color}" style="background:${color}"></button>`
    ).join("");

    picker.querySelectorAll(".color-option").forEach((btn) => {
      btn.addEventListener("click", () => {
        picker.querySelectorAll(".color-option").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
      });
    });
  }

  renderTemplatePicker() {
    const picker = document.getElementById("template-picker");
    picker.innerHTML = HABIT_TEMPLATES.map((t) =>
      `<button type="button" class="template-chip" data-template='${JSON.stringify(t)}'>${t.icon} ${t.name}</button>`
    ).join("");

    picker.querySelectorAll(".template-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        const t = JSON.parse(btn.dataset.template);
        document.getElementById("habit-name").value = t.name;
        document.getElementById("habit-category").value = t.category;
        this.renderIconPicker(t.icon);
        this.renderColorPicker(t.color);
      });
    });
  }

  saveHabit() {
    const id = document.getElementById("habit-id").value;
    const name = document.getElementById("habit-name").value.trim();
    const category = document.getElementById("habit-category").value;
    const icon = document.querySelector("#icon-picker .icon-option.selected")?.dataset.icon || "📚";
    const color = document.querySelector("#color-picker .color-option.selected")?.dataset.color || COLORS[0];
    const reminderEnabled = document.getElementById("habit-reminder-enabled").checked;
    const reminderTime = document.getElementById("habit-reminder-time").value || "08:00";

    if (!name) return;

    const habitData = {
      name, category, icon, color,
      reminderEnabled,
      reminderTime: reminderEnabled ? reminderTime : null,
    };

    if (id) {
      const habit = this.data.habits.find((h) => h.id === id);
      if (habit) {
        Object.assign(habit, habitData);
      }
      showToast("习惯已更新", "success");
    } else {
      this.data.habits.push({
        id: generateId(),
        ...habitData,
        createdAt: todayStr(),
        archived: false,
      });
      showToast("习惯已创建", "success");
    }

    this.persistLocal();
    this.closeHabitModal();
    this.checkNewAchievements();
    this.render();
  }

  async archiveHabit(habitId) {
    const habit = this.data.habits.find((h) => h.id === habitId);
    if (!habit) return;

    const ok = await showConfirm("归档习惯", `确定归档「${habit.name}」吗？归档后不会出现在今日列表，但数据保留。`);
    if (!ok) return;

    habit.archived = true;
    habit.archivedAt = todayStr();
    this.persistLocal();
    showToast("习惯已归档", "info");
    this.render();
  }

  async restoreHabit(habitId) {
    const habit = this.data.habits.find((h) => h.id === habitId);
    if (!habit) return;

    habit.archived = false;
    delete habit.archivedAt;
    this.persistLocal();
    showToast("习惯已恢复", "success");
    this.render();
  }

  async deleteHabit(habitId) {
    const habit = this.data.habits.find((h) => h.id === habitId);
    if (!habit) return;

    const ok = await showConfirm("删除习惯", `确定要删除「${habit.name}」吗？相关打卡记录也会被删除。`);
    if (!ok) return;

    this.data.habits = this.data.habits.filter((h) => h.id !== habitId);
    this.data.checkIns = this.data.checkIns.filter((c) => c.habitId !== habitId);
    this.persistLocal();
    showToast("习惯已删除", "info");
    this.render();
  }

  render() {
    this.renderTodayPage();
    this.renderHabitsPage();
    this.updateSidebar();
    this.renderReminderBanner();
    document.getElementById("greeting-text").textContent = getGreeting();
    document.getElementById("date-text").textContent = formatDisplayDate();
    document.getElementById("quote-text").textContent = `"${getDailyQuote()}"`;
  }

  updateSidebar() {
    const best = getGlobalBestStreak(this.data.habits, this.data.checkIns);
    const el = document.getElementById("sidebar-streak");
    if (el) {
      el.querySelector(".streak-count").textContent = best;
    }
  }

  renderTodayPage() {
    const active = this.data.habits.filter((h) => !h.archived);
    const list = document.getElementById("today-habit-list");
    const empty = document.getElementById("today-empty");
    const today = todayStr();

    if (active.length === 0) {
      list.innerHTML = "";
      empty.classList.remove("hidden");
      this.updateProgressRing(0, 0);
      return;
    }

    empty.classList.add("hidden");

    list.innerHTML = active.map((habit) => {
      const completed = isCheckedIn(this.data.checkIns, habit.id, today);
      const checkIn = getCheckIn(this.data.checkIns, habit.id, today);
      const streak = getHabitStreak(this.data.checkIns, habit.id, this.data.habits);
      const reminderLabel = habit.reminderEnabled && habit.reminderTime
        ? `⏰ ${habit.reminderTime}` : "";
      return `
        <div class="habit-card${completed ? " completed" : ""}"
             data-habit-id="${habit.id}"
             style="--habit-color: ${habit.color}">
          <div class="habit-icon">${habit.icon}</div>
          <div class="habit-info">
            <div class="habit-name">${this.escape(habit.name)}</div>
            <div class="habit-meta">
              <span>${CATEGORY_LABELS[habit.category] || habit.category}</span>
              ${streak > 0 ? `<span class="habit-streak">🔥 ${streak} 天</span>` : ""}
              ${reminderLabel ? `<span>${reminderLabel}</span>` : ""}
            </div>
            ${checkIn?.note ? `<div class="habit-note">"${this.escape(checkIn.note)}"</div>` : ""}
          </div>
          <div class="habit-card-actions">
            <button type="button" class="habit-note-btn${checkIn?.note ? " has-note" : ""}" data-note-id="${habit.id}" title="备注">📝</button>
            <div class="habit-check">${completed ? "✓" : ""}</div>
          </div>
        </div>
      `;
    }).join("");

    list.querySelectorAll(".habit-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest(".habit-note-btn")) return;
        card.classList.add("just-checked");
        setTimeout(() => card.classList.remove("just-checked"), 400);
        this.toggleCheckIn(card.dataset.habitId);
      });
    });

    list.querySelectorAll(".habit-note-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.openNoteEditor(btn.dataset.noteId);
      });
    });

    const progress = getTodayProgress(this.data.habits, this.data.checkIns);
    this.updateProgressRing(progress.completed, progress.total);

    document.getElementById("today-streak").textContent = getOverallStreak(this.data.habits, this.data.checkIns);
    document.getElementById("week-rate").textContent = getWeekCompletionRate(this.data.habits, this.data.checkIns) + "%";
  }

  updateProgressRing(completed, total) {
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const circumference = 2 * Math.PI * 52;
    const offset = circumference - (percent / 100) * circumference;

    const fill = document.getElementById("progress-ring-fill");
    fill.style.strokeDashoffset = offset;

    if (percent === 100 && total > 0) {
      fill.style.stroke = "var(--color-success)";
    } else {
      fill.style.stroke = "var(--color-primary)";
    }

    document.getElementById("progress-percent").textContent = percent + "%";
    document.getElementById("progress-label").textContent = `${completed}/${total} 完成`;
  }

  renderHabitsPage() {
    const isArchivedView = this.categoryFilter === "archived";
    let habits = this.data.habits.filter((h) => isArchivedView ? h.archived : !h.archived);

    if (!isArchivedView && this.categoryFilter !== "all") {
      habits = habits.filter((h) => h.category === this.categoryFilter);
    }

    const grid = document.getElementById("habit-grid");
    const empty = document.getElementById("habits-empty");

    if (habits.length === 0) {
      grid.innerHTML = "";
      empty.classList.remove("hidden");
      empty.querySelector("h3").textContent = isArchivedView ? "暂无归档习惯" : "暂无习惯";
      empty.querySelector("p").textContent = isArchivedView
        ? "归档的习惯会显示在这里"
        : "点击上方按钮创建你的第一个习惯";
      return;
    }

    empty.classList.add("hidden");

    grid.innerHTML = habits.map((habit) => {
      const streak = getHabitStreak(this.data.checkIns, habit.id, this.data.habits);
      const best = getBestStreak(this.data.checkIns, habit.id);
      const count = this.data.checkIns.filter((c) => c.habitId === habit.id).length;
      const reminderInfo = habit.reminderEnabled && habit.reminderTime
        ? `⏰ ${habit.reminderTime}` : "";

      return `
        <div class="habit-manage-card${habit.archived ? " archived" : ""}" style="--habit-color: ${habit.color}">
          <div class="habit-manage-header">
            <div class="habit-manage-icon">${habit.icon}</div>
            <div>
              <div class="habit-manage-name">
                ${this.escape(habit.name)}
                ${habit.archived ? '<span class="archived-badge">已归档</span>' : ""}
              </div>
              <div class="habit-manage-category">
                ${CATEGORY_LABELS[habit.category] || ""}
                ${reminderInfo ? ` · ${reminderInfo}` : ""}
              </div>
            </div>
          </div>
          <div class="habit-manage-stats">
            <div class="habit-manage-stat">
              <span class="habit-manage-stat-value">${count}</span>
              <span class="habit-manage-stat-label">总打卡</span>
            </div>
            <div class="habit-manage-stat">
              <span class="habit-manage-stat-value">${streak}</span>
              <span class="habit-manage-stat-label">当前连续</span>
            </div>
            <div class="habit-manage-stat">
              <span class="habit-manage-stat-value">${best}</span>
              <span class="habit-manage-stat-label">最长连续</span>
            </div>
          </div>
          <div class="habit-manage-actions">
            ${habit.archived ? `
              <button type="button" class="btn btn-sm btn-primary restore-habit" data-id="${habit.id}">恢复</button>
              <button type="button" class="btn btn-sm btn-danger delete-habit" data-id="${habit.id}">删除</button>
            ` : `
              <button type="button" class="btn btn-sm btn-secondary edit-habit" data-id="${habit.id}">编辑</button>
              <button type="button" class="btn btn-sm btn-secondary archive-habit" data-id="${habit.id}">归档</button>
              <button type="button" class="btn btn-sm btn-danger delete-habit" data-id="${habit.id}">删除</button>
            `}
          </div>
        </div>
      `;
    }).join("");

    grid.querySelectorAll(".edit-habit").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const habit = this.data.habits.find((h) => h.id === btn.dataset.id);
        if (habit) this.openHabitModal(habit);
      });
    });

    grid.querySelectorAll(".archive-habit").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.archiveHabit(btn.dataset.id);
      });
    });

    grid.querySelectorAll(".restore-habit").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.restoreHabit(btn.dataset.id);
      });
    });

    grid.querySelectorAll(".delete-habit").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.deleteHabit(btn.dataset.id);
      });
    });
  }

  renderStatsPage() {
    document.getElementById("stat-total-days").textContent =
      getTotalActiveDays(this.data.habits, this.data.checkIns);
    document.getElementById("stat-total-checkins").textContent =
      getTotalCheckIns(this.data.checkIns);
    document.getElementById("stat-best-streak").textContent =
      getGlobalBestStreak(this.data.habits, this.data.checkIns);
    document.getElementById("stat-month-rate").textContent =
      getMonthCompletionRate(this.data.habits, this.data.checkIns) + "%";

    this.renderWeekChart();
    this.renderMonthCalendar();
    this.renderHeatmap();
    this.renderRanking();
    this.renderAchievements();
  }

  renderWeekChart() {
    const stats = getWeekStats(this.data.habits, this.data.checkIns);
    const today = todayStr();
    const maxRate = Math.max(...stats.map((s) => s.rate), 1);

    document.getElementById("week-chart").innerHTML = stats.map((s) => {
      const height = Math.max(4, (s.rate / maxRate) * 100);
      return `
        <div class="week-bar-wrap">
          <span class="week-bar-value">${s.rate}%</span>
          <div class="week-bar${s.date === today ? " today" : ""}" style="height: ${height}%"></div>
          <span class="week-bar-label">${getDayLabel(s.date)}</span>
        </div>
      `;
    }).join("");
  }

  renderMonthCalendar() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = todayStr();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const headers = ["日", "一", "二", "三", "四", "五", "六"];

    let html = headers.map((h) => `<div class="calendar-header">${h}</div>`).join("");

    for (let i = 0; i < firstDay; i++) {
      html += `<div class="calendar-day empty"></div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const rate = getDayCompletionRate(this.data.habits, this.data.checkIns, date);
      let cls = "calendar-day";
      if (date === today) cls += " today";
      if (rate === 100) cls += " completed";
      else if (rate > 0) cls += " partial";

      html += `<div class="${cls}">${d}${rate > 0 ? '<span class="calendar-dot"></span>' : ""}</div>`;
    }

    document.getElementById("month-calendar").innerHTML = html;
  }

  renderHeatmap() {
    const data = getHeatmapData(this.data.habits, this.data.checkIns);
    document.getElementById("heatmap").innerHTML = data.map((week) =>
      `<div class="heatmap-week">${week.map((day) =>
        day.level < 0
          ? `<div class="heatmap-cell" style="visibility:hidden"></div>`
          : `<div class="heatmap-cell level-${day.level}" title="${day.date}: ${day.rate ?? 0}%"></div>`
      ).join("")}</div>`
    ).join("");
  }

  renderRanking() {
    const ranking = getHabitRanking(this.data.habits, this.data.checkIns);
    const maxCount = Math.max(...ranking.map((r) => r.count), 1);

    const el = document.getElementById("habit-ranking");
    if (ranking.length === 0) {
      el.innerHTML = '<p style="color:var(--color-text-secondary);font-size:0.9rem">暂无数据</p>';
      return;
    }

    el.innerHTML = ranking.map((r, i) => `
      <div class="ranking-item">
        <div class="ranking-rank${i < 3 ? " top" : ""}">${i + 1}</div>
        <span class="ranking-icon">${r.habit.icon}</span>
        <div class="ranking-info">
          <div class="ranking-name">${this.escape(r.habit.name)}</div>
          <div class="ranking-bar-wrap">
            <div class="ranking-bar" style="width: ${(r.count / maxCount) * 100}%"></div>
          </div>
        </div>
        <span class="ranking-count">${r.count} 次</span>
      </div>
    `).join("");
  }

  renderAchievements() {
    const unlocked = getUnlockedAchievements(this.data.habits, this.data.checkIns);
    const unlockedIds = new Set(unlocked.map((a) => a.id));

    document.getElementById("achievements-grid").innerHTML = ACHIEVEMENTS.map((a) => `
      <div class="achievement${unlockedIds.has(a.id) ? " unlocked" : " locked"}">
        <span class="achievement-icon">${a.icon}</span>
        <span class="achievement-name">${a.name}</span>
        <span class="achievement-desc">${a.desc}</span>
      </div>
    `).join("");
  }

  escape(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.app = new HabitPlanetApp();
});
