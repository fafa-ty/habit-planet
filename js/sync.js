import { generateId, saveData, saveSettings } from "./utils.js";

const DEFAULT_SERVER = detectDefaultServer();

function detectDefaultServer() {
  if (typeof window === "undefined") return "http://localhost:8787";
  const { protocol, hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${protocol}//${hostname}:8787`;
  }
  return `${protocol}//${hostname}:8787`;
}

export function getDeviceId(settings) {
  if (settings.sync?.deviceId) return settings.sync.deviceId;
  return generateId();
}

export function isSyncEnabled(settings) {
  return !!(settings.sync?.enabled && settings.sync?.syncId && settings.sync?.token);
}

export function getSyncConfig(settings) {
  return {
    enabled: false,
    syncId: null,
    token: null,
    serverUrl: DEFAULT_SERVER,
    lastSyncedAt: null,
    deviceId: null,
    status: "idle",
    ...(settings.sync || {}),
  };
}

export function mergeData(local, remote) {
  if (!remote) return local;
  if (!local) return remote;

  const habitsMap = new Map();
  for (const h of [...(local.habits || []), ...(remote.habits || [])]) {
    const existing = habitsMap.get(h.id);
    if (!existing) {
      habitsMap.set(h.id, h);
      continue;
    }
    const localTime = existing.archivedAt || existing.createdAt || "";
    const remoteTime = h.archivedAt || h.createdAt || "";
    habitsMap.set(h.id, remoteTime >= localTime ? h : existing);
  }

  const checkInsMap = new Map();
  for (const c of [...(local.checkIns || []), ...(remote.checkIns || [])]) {
    const key = `${c.habitId}:${c.date}`;
    const existing = checkInsMap.get(key);
    if (!existing) {
      checkInsMap.set(key, c);
      continue;
    }
    const localTime = existing.completedAt || "";
    const remoteTime = c.completedAt || "";
    checkInsMap.set(key, remoteTime >= localTime ? c : existing);
  }

  return {
    habits: [...habitsMap.values()],
    checkIns: [...checkInsMap.values()],
  };
}

export function mergeSettings(local, remote) {
  if (!remote) return local;
  const merged = { ...local, ...remote };
  merged.sync = local.sync;
  merged.dismissedReminders = {
    ...(remote.dismissedReminders || {}),
    ...(local.dismissedReminders || {}),
  };
  return merged;
}

async function apiFetch(settings, path, options = {}) {
  const sync = getSyncConfig(settings);
  const url = `${sync.serverUrl.replace(/\/$/, "")}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (sync.syncId && sync.token) {
    headers["X-Sync-Id"] = sync.syncId;
    headers["X-Sync-Token"] = sync.token;
  }
  const res = await fetch(url, { ...options, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `请求失败 (${res.status})`);
  }
  return body;
}

export async function checkServerHealth(settings) {
  try {
    const sync = getSyncConfig(settings);
    const res = await fetch(`${sync.serverUrl.replace(/\/$/, "")}/api/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function createSyncSpace(settings) {
  const body = await apiFetch(settings, "/api/sync/create", { method: "POST" });
  return body;
}

export async function verifySyncCredentials(settings, syncId, token) {
  const sync = getSyncConfig(settings);
  const url = `${sync.serverUrl.replace(/\/$/, "")}/api/sync/verify`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ syncId, token }),
    signal: AbortSignal.timeout(8000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "验证失败");
  return body;
}

export async function pullRemoteData(settings) {
  const body = await apiFetch(settings, "/api/sync/data");
  if (!body.data) return null;
  return {
    data: body.data,
    settings: body.settings,
    updatedAt: body.updatedAt,
    deviceId: body.deviceId,
  };
}

export async function pushLocalData(settings, data, appSettings) {
  const sync = getSyncConfig(settings);
  const payload = {
    data,
    settings: sanitizeSettingsForSync(appSettings),
    deviceId: sync.deviceId,
  };
  const body = await apiFetch(settings, "/api/sync/data", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return body.updatedAt;
}

function sanitizeSettingsForSync(settings) {
  const copy = { ...settings };
  delete copy.sync;
  return copy;
}

export function formatSyncTime(iso) {
  if (!iso) return "从未同步";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  if (diffMs < 60000) return "刚刚";
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)} 分钟前`;
  if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)} 小时前`;
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export class SyncManager {
  constructor(app) {
    this.app = app;
    this.pushTimer = null;
    this.pullInterval = null;
    this.syncing = false;
  }

  init() {
    if (!isSyncEnabled(this.app.settings)) return;

    this.pullAndMerge(true);
    this.pullInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        this.pullAndMerge(false);
      }
    }, 30000);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && isSyncEnabled(this.app.settings)) {
        this.pullAndMerge(false);
      }
    });
  }

  schedulePush() {
    if (!isSyncEnabled(this.app.settings)) return;
    clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => this.push(), 1500);
  }

  async push() {
    if (!isSyncEnabled(this.app.settings) || this.syncing) return;
    this.setStatus("syncing");
    try {
      const updatedAt = await pushLocalData(
        this.app.settings,
        this.app.data,
        this.app.settings
      );
      this.app.settings.sync.lastSyncedAt = updatedAt;
      this.app.settings.sync.status = "synced";
      this.app.saveSettingsOnly();
      this.app.updateSyncUI();
    } catch (err) {
      this.app.settings.sync.status = "error";
      this.app.saveSettingsOnly();
      this.app.updateSyncUI();
      console.warn("Sync push failed:", err.message);
    }
  }

  async pullAndMerge(silent = false) {
    if (!isSyncEnabled(this.app.settings) || this.syncing) return;
    this.syncing = true;
    this.setStatus("syncing");
    try {
      const remote = await pullRemoteData(this.app.settings);
      if (!remote) {
        await this.push();
        this.setStatus("synced");
        return;
      }

      const localUpdated = this.app.settings.sync.lastSyncedAt;
      const remoteUpdated = remote.updatedAt;

      if (!localUpdated || new Date(remoteUpdated) > new Date(localUpdated)) {
        const mergedData = mergeData(this.app.data, remote.data);
        const mergedSettings = mergeSettings(this.app.settings, remote.settings);

        const syncConfig = this.app.settings.sync;
        this.app.data = mergedData;
        this.app.settings = { ...mergedSettings, sync: syncConfig };
        saveData(this.app.data);
        saveSettings(this.app.settings);
        this.app.render();

        if (!silent) {
          this.app.showSyncToast("已从云端同步最新数据");
        }
      } else if (JSON.stringify(this.app.data) !== JSON.stringify(remote.data)) {
        await this.push();
      }

      this.app.settings.sync.lastSyncedAt = remoteUpdated || new Date().toISOString();
      this.setStatus("synced");
    } catch (err) {
      this.setStatus("error");
      if (!silent) {
        this.app.showSyncToast(err.message, "error");
      }
      console.warn("Sync pull failed:", err.message);
    } finally {
      this.syncing = false;
      this.app.updateSyncUI();
    }
  }

  setStatus(status) {
    if (this.app.settings.sync) {
      this.app.settings.sync.status = status;
      this.app.updateSyncUI();
    }
  }

  destroy() {
    clearTimeout(this.pushTimer);
    clearInterval(this.pullInterval);
  }
}
