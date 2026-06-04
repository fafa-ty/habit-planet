import {
  getWeekDates, getDayLabel, addDays, todayStr,
} from "./utils.js";
import {
  getDayCompletionRate, getHabitRanking, getGlobalBestStreak,
} from "./stats.js";

export function getLastWeekDates() {
  const thisWeek = getWeekDates();
  const lastMonday = addDays(thisWeek[0], -7);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    dates.push(addDays(lastMonday, i));
  }
  return dates;
}

export function shouldShowWeeklyReport(settings) {
  if (!settings.weeklyReportEnabled) return false;
  const today = todayStr();
  const day = new Date().getDay();
  if (day !== 1) return false;
  return settings.lastWeeklyReportShown !== today;
}

export function buildWeeklyReport(habits, checkIns) {
  const weekDates = getLastWeekDates();
  const active = habits.filter((h) => !h.archived);

  const dailyRates = weekDates.map((date) => ({
    date,
    label: getDayLabel(date),
    rate: getDayCompletionRate(habits, checkIns, date),
  }));

  const weekCheckIns = checkIns.filter((c) =>
    weekDates.includes(c.date) && active.some((h) => h.id === c.habitId)
  );

  const avgRate = dailyRates.length
    ? Math.round(dailyRates.reduce((s, d) => s + d.rate, 0) / dailyRates.length)
    : 0;

  const bestDay = dailyRates.reduce(
    (best, d) => (d.rate > best.rate ? d : best),
    { rate: -1, label: "" }
  );

  const ranking = getHabitRanking(habits, checkIns)
    .filter((r) => weekCheckIns.some((c) => c.habitId === r.habit.id))
    .slice(0, 3);

  const perfectDays = dailyRates.filter((d) => d.rate === 100).length;

  return {
    weekRange: `${weekDates[0].slice(5).replace("-", "/")} – ${weekDates[6].slice(5).replace("-", "/")}`,
    avgRate,
    totalCheckIns: weekCheckIns.length,
    bestDay: bestDay.rate >= 0 ? bestDay : null,
    perfectDays,
    dailyRates,
    topHabits: ranking,
    bestStreak: getGlobalBestStreak(habits, checkIns),
  };
}

export function getWeekKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${weekNum}`;
}
