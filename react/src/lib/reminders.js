import { todayStr } from "./utils.js";
import { isCheckedIn } from "./stats.js";

export function getDueReminders(habits, checkIns, dismissed = []) {
  const today = todayStr();
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return habits
    .filter((h) => !h.archived && h.reminderEnabled && h.reminderTime)
    .filter((h) => !isCheckedIn(checkIns, h.id, today))
    .filter((h) => !dismissed.includes(h.id))
    .filter((h) => {
      const [hh, mm] = h.reminderTime.split(":").map(Number);
      return hh * 60 + mm <= currentMinutes;
    });
}

export async function requestNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  const result = await Notification.requestPermission();
  return result;
}

export function sendReminderNotification(habit) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  new Notification("习惯星球 · 提醒", {
    body: `别忘了「${habit.name}」${habit.icon}`,
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌍</text></svg>",
    tag: `reminder-${habit.id}`,
  });
}

export function formatReminderTime(time) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
