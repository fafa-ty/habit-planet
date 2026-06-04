import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  loadData, saveData, loadSettings, saveSettings,
  generateId, todayStr, addDays, getGreeting, formatDisplayDate,
  CATEGORY_LABELS, ICONS, COLORS, DEFAULT_HABITS, exportData, importData, clearAllData,
} from "../lib/utils.js";
import {
  isCheckedIn, getCheckIn, getHabitStreak, getBestStreak,
  getTodayProgress, getWeekCompletionRate, getGlobalBestStreak,
} from "../lib/stats.js";
import { getUnlockedAchievements, getNewlyUnlocked } from "../lib/achievements.js";
import { getDailyQuote } from "../lib/templates.js";
import { getDueReminders, requestNotificationPermission, sendReminderNotification } from "../lib/reminders.js";
import { shouldShowWeeklyReport, buildWeeklyReport } from "../lib/weekly-report.js";
import { SyncManager, isSyncEnabled, getSyncConfig, getDeviceId, createSyncSpace, verifySyncCredentials, checkServerHealth, formatSyncTime } from "../lib/sync.js";
import { launchConfetti, showToast, showConfirm } from "../lib/ui.js";

const AppContext = createContext(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function AppProvider({ children }) {
  const [data, setData] = useState(loadData);
  const [settings, setSettings] = useState(() => {
    const s = loadSettings();
    if (!s.sync) s.sync = getSyncConfig(s);
    if (!s.sync.deviceId) s.sync.deviceId = getDeviceId(s);
    return s;
  });
  const [page, setPage] = useState("today");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [onboarding, setOnboarding] = useState(!loadSettings().onboarded);
  const [onboardingStep, setOnboardingStep] = useState(0);

  const [habitModal, setHabitModal] = useState(null);
  const [noteModal, setNoteModal] = useState(null);
  const [weeklyReport, setWeeklyReport] = useState(false);
  const [syncModal, setSyncModal] = useState(null);
  const [pendingSync, setPendingSync] = useState(null);

  const prevAchievements = useRef(
    getUnlockedAchievements(loadData().habits, loadData().checkIns).map((a) => a.id)
  );
  const syncManagerRef = useRef(null);
  const appRef = useRef({});

  const persistLocal = useCallback((newData) => {
    const d = newData ?? data;
    setData(d);
    saveData(d);
    syncManagerRef.current?.schedulePush();
  }, [data]);

  const persistSettings = useCallback((newSettings) => {
    const s = newSettings ?? settings;
    setSettings(s);
    saveSettings(s);
    syncManagerRef.current?.schedulePush();
  }, [settings]);

  const saveSettingsOnly = useCallback((s) => {
    setSettings(s);
    saveSettings(s);
  }, []);

  const checkAchievements = useCallback((habits, checkIns) => {
    const newly = getNewlyUnlocked(habits, checkIns, prevAchievements.current);
    newly.forEach((a) => showToast(`🏆 解锁成就：${a.name}`, "success", 4000));
    prevAchievements.current = getUnlockedAchievements(habits, checkIns).map((a) => a.id);
  }, []);

  appRef.current = {
    data, settings, setData, setSettings,
    persistLocal, persistSettings, saveSettingsOnly,
    render: () => {}, updateSyncUI: () => {},
    showSyncToast: showToast,
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme || "light");
  }, [settings.theme]);

  useEffect(() => {
    syncManagerRef.current = new SyncManager(appRef.current);
    syncManagerRef.current.init();
    if (shouldShowWeeklyReport(settings)) {
      setTimeout(() => setWeeklyReport(true), 800);
    }
    const id = setInterval(() => {
      if (!settings.notificationsEnabled) return;
      const dismissed = settings.dismissedReminders?.[todayStr()] || [];
      getDueReminders(data.habits, data.checkIns, dismissed).forEach(sendReminderNotification);
    }, 60000);
    return () => { clearInterval(id); syncManagerRef.current?.destroy(); };
  }, []);

  useEffect(() => { appRef.current.data = data; }, [data]);
  useEffect(() => { appRef.current.settings = settings; }, [settings]);

  const finishOnboarding = useCallback(() => {
    setOnboarding(false);
    const s = { ...settings, onboarded: true };
    persistSettings(s);
    if (data.habits.length === 0) {
      const habitIds = DEFAULT_HABITS.map((t) => {
        const id = generateId();
        return { id, ...t, createdAt: addDays(todayStr(), -14), archived: false };
      });
      const habits = habitIds.map(({ id, ...rest }) => ({ id, ...rest }));
      const checkIns = [];
      const today = todayStr();
      for (let i = 14; i >= 0; i--) {
        const date = addDays(today, -i);
        habits.forEach((h, idx) => {
          if (Math.random() < [0.85, 0.7, 0.6][idx]) {
            checkIns.push({ habitId: h.id, date, completedAt: new Date(date + "T08:00:00Z").toISOString() });
          }
        });
      }
      persistLocal({ habits, checkIns });
      showToast("已为你创建 3 个示例习惯", "info");
    }
  }, [settings, data, persistSettings, persistLocal]);

  const toggleCheckIn = useCallback((habitId) => {
    const today = todayStr();
    if (getCheckIn(data.checkIns, habitId, today)) {
      persistLocal({ ...data, checkIns: data.checkIns.filter((c) => !(c.habitId === habitId && c.date === today)) });
      return;
    }
    const habit = data.habits.find((h) => h.id === habitId);
    setNoteModal({ habitId, habit, mode: "checkin" });
  }, [data, persistLocal]);

  const completeCheckIn = useCallback((note) => {
    if (!noteModal) return;
    const today = todayStr();
    const newCheckIns = [...data.checkIns, {
      habitId: noteModal.habitId, date: today,
      completedAt: new Date().toISOString(),
      ...(note ? { note } : {}),
    }];
    const newData = { ...data, checkIns: newCheckIns };
    persistLocal(newData);
    setNoteModal(null);
    const progress = getTodayProgress(newData.habits, newCheckIns);
    if (progress.percent === 100 && progress.total > 0) {
      launchConfetti(document.getElementById("confetti-canvas"));
      showToast("🎉 太棒了！今日习惯全部完成！", "success");
    } else {
      showToast("打卡成功", "success");
    }
    checkAchievements(newData.habits, newCheckIns);
  }, [noteModal, data, persistLocal, checkAchievements]);

  const saveHabit = useCallback((form) => {
    if (form.id) {
      const habits = data.habits.map((h) => h.id === form.id ? { ...h, ...form } : h);
      persistLocal({ ...data, habits });
      showToast("习惯已更新", "success");
    } else {
      persistLocal({
        ...data,
        habits: [...data.habits, { ...form, id: generateId(), createdAt: todayStr(), archived: false }],
      });
      showToast("习惯已创建", "success");
    }
    setHabitModal(null);
    checkAchievements(data.habits, data.checkIns);
  }, [data, persistLocal, checkAchievements]);

  const deleteHabit = useCallback(async (id) => {
    const habit = data.habits.find((h) => h.id === id);
    if (!habit) return;
    if (!await showConfirm("删除习惯", `确定要删除「${habit.name}」吗？`)) return;
    persistLocal({
      ...data,
      habits: data.habits.filter((h) => h.id !== id),
      checkIns: data.checkIns.filter((c) => c.habitId !== id),
    });
    showToast("习惯已删除", "info");
  }, [data, persistLocal]);

  const archiveHabit = useCallback(async (id) => {
    const habit = data.habits.find((h) => h.id === id);
    if (!habit || !await showConfirm("归档习惯", `确定归档「${habit.name}」吗？`)) return;
    persistLocal({
      ...data,
      habits: data.habits.map((h) => h.id === id ? { ...h, archived: true, archivedAt: todayStr() } : h),
    });
    showToast("习惯已归档", "info");
  }, [data, persistLocal]);

  const restoreHabit = useCallback((id) => {
    persistLocal({
      ...data,
      habits: data.habits.map((h) => {
        if (h.id !== id) return h;
        const { archivedAt, ...rest } = h;
        return { ...rest, archived: false };
      }),
    });
    showToast("习惯已恢复", "success");
  }, [data, persistLocal]);

  const value = {
    data, settings, page, setPage, categoryFilter, setCategoryFilter,
    onboarding, onboardingStep, setOnboardingStep, finishOnboarding,
    habitModal, setHabitModal, noteModal, setNoteModal,
    weeklyReport, setWeeklyReport, syncModal, setSyncModal, pendingSync, setPendingSync,
    persistLocal, persistSettings, saveSettingsOnly,
    toggleCheckIn, completeCheckIn, saveHabit, deleteHabit, archiveHabit, restoreHabit,
    syncManager: syncManagerRef,
    getGreeting, formatDisplayDate, getDailyQuote, CATEGORY_LABELS, ICONS, COLORS,
    isCheckedIn, getCheckIn, getHabitStreak, getBestStreak,
    getTodayProgress, getWeekCompletionRate, getGlobalBestStreak,
    isSyncEnabled, getSyncConfig, formatSyncTime,
    createSyncSpace, verifySyncCredentials, checkServerHealth, getDeviceId,
    buildWeeklyReport, exportData, importData, clearAllData,
    showToast, showConfirm, getDueReminders,
    requestNotificationPermission,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
