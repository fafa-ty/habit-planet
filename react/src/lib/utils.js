const STORAGE_KEY = "habit-planet-data";
const SETTINGS_KEY = "habit-planet-settings";

export function generateId() {
  return crypto.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { habits: [], checkIns: [] };
    const data = JSON.parse(raw);
    return {
      habits: data.habits || [],
      checkIns: data.checkIns || [],
    };
  } catch {
    return { habits: [], checkIns: [] };
  }
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return {
      theme: "light",
      onboarded: false,
      notificationsEnabled: false,
      weeklyReportEnabled: true,
      lastWeeklyReportShown: null,
      dismissedReminders: {},
    };
    return JSON.parse(raw);
  } catch {
    return { theme: "light", onboarded: false, notificationsEnabled: false, weeklyReportEnabled: true, lastWeeklyReportShown: null, dismissedReminders: {} };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function exportData(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `habit-planet-backup-${formatDate(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.habits || !data.checkIns) throw new Error("Invalid format");
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export function clearAllData() {
  localStorage.removeItem(STORAGE_KEY);
}

export function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayStr() {
  return formatDate(new Date());
}

export function addDays(dateStr, n) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + n);
  return formatDate(d);
}

export function getWeekDates(refDate = new Date()) {
  const day = refDate.getDay();
  const monday = new Date(refDate);
  monday.setDate(refDate.getDate() - ((day + 6) % 7));

  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(formatDate(d));
  }
  return dates;
}

export function getDayLabel(dateStr) {
  const labels = ["日", "一", "二", "三", "四", "五", "六"];
  const d = parseDate(dateStr);
  const today = todayStr();
  if (dateStr === today) return "今天";
  return "周" + labels[d.getDay()];
}

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return "夜深了";
  if (hour < 12) return "早上好";
  if (hour < 14) return "中午好";
  if (hour < 18) return "下午好";
  return "晚上好";
}

export function formatDisplayDate(date = new Date()) {
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${m}月${d}日 ${weekdays[date.getDay()]}`;
}

export function daysBetween(a, b) {
  const da = parseDate(a);
  const db = parseDate(b);
  return Math.round((db - da) / 86400000);
}

export function getMonthDates(year, month) {
  const dates = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    dates.push(formatDate(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

export const CATEGORY_LABELS = {
  health: "🏃 健康",
  study: "📚 学习",
  life: "🏠 生活",
  work: "💼 工作",
};

export const ICONS = [
  "📚", "🏃", "💧", "🧘", "😴", "🍎", "✍️", "🎸",
  "💪", "🧠", "🚶", "🥗", "📖", "🎯", "💊", "🦷",
  "🧹", "💰", "📝", "🌅", "🎨", "🗣️", "💻", "🌱",
];

export const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f59e0b", "#10b981", "#06b6d4", "#3b82f6",
];

export const DEFAULT_HABITS = [
  { name: "阅读 30 分钟", icon: "📚", color: "#6366f1", category: "study" },
  { name: "运动 20 分钟", icon: "🏃", color: "#10b981", category: "health" },
  { name: "喝 8 杯水", icon: "💧", color: "#06b6d4", category: "health" },
];
