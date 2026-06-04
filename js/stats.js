import {
  todayStr, addDays, formatDate, parseDate,
  getWeekDates, getMonthDates, daysBetween,
} from "./utils.js";

export function isCheckedIn(checkIns, habitId, date) {
  return checkIns.some((c) => c.habitId === habitId && c.date === date);
}

export function getCheckIn(checkIns, habitId, date) {
  return checkIns.find((c) => c.habitId === habitId && c.date === date) || null;
}

export function getHabitStreak(checkIns, habitId, habits) {
  const habit = habits.find((h) => h.id === habitId);
  if (!habit) return 0;

  const dates = checkIns
    .filter((c) => c.habitId === habitId)
    .map((c) => c.date)
    .sort()
    .reverse();

  if (dates.length === 0) return 0;

  const today = todayStr();
  const yesterday = addDays(today, -1);

  let startDate;
  if (dates.includes(today)) {
    startDate = today;
  } else if (dates.includes(yesterday)) {
    startDate = yesterday;
  } else {
    return 0;
  }

  let streak = 0;
  let current = startDate;
  while (dates.includes(current)) {
    streak++;
    current = addDays(current, -1);
  }
  return streak;
}

export function getBestStreak(checkIns, habitId) {
  const dates = checkIns
    .filter((c) => c.habitId === habitId)
    .map((c) => c.date)
    .sort();

  if (dates.length === 0) return 0;

  let best = 1;
  let current = 1;

  for (let i = 1; i < dates.length; i++) {
    if (daysBetween(dates[i - 1], dates[i]) === 1) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }
  return best;
}

export function getTodayProgress(habits, checkIns) {
  const active = habits.filter((h) => !h.archived);
  if (active.length === 0) return { completed: 0, total: 0, percent: 0 };

  const today = todayStr();
  const completed = active.filter((h) =>
    isCheckedIn(checkIns, h.id, today)
  ).length;

  return {
    completed,
    total: active.length,
    percent: Math.round((completed / active.length) * 100),
  };
}

export function getDayCompletionRate(habits, checkIns, date) {
  const active = habits.filter((h) => !h.archived);
  if (active.length === 0) return 0;

  const createdBefore = active.filter((h) => h.createdAt <= date);
  if (createdBefore.length === 0) return 0;

  const completed = createdBefore.filter((h) =>
    isCheckedIn(checkIns, h.id, date)
  ).length;

  return Math.round((completed / createdBefore.length) * 100);
}

export function getWeekStats(habits, checkIns) {
  const weekDates = getWeekDates();
  return weekDates.map((date) => ({
    date,
    rate: getDayCompletionRate(habits, checkIns, date),
  }));
}

export function getWeekCompletionRate(habits, checkIns) {
  const stats = getWeekStats(habits, checkIns);
  const today = todayStr();
  const relevant = stats.filter((s) => s.date <= today);
  if (relevant.length === 0) return 0;
  const sum = relevant.reduce((a, s) => a + s.rate, 0);
  return Math.round(sum / relevant.length);
}

export function getMonthCompletionRate(habits, checkIns) {
  const now = new Date();
  const dates = getMonthDates(now.getFullYear(), now.getMonth());
  const today = todayStr();
  const relevant = dates.filter((d) => d <= today);
  if (relevant.length === 0) return 0;

  const sum = relevant.reduce(
    (a, d) => a + getDayCompletionRate(habits, checkIns, d),
    0
  );
  return Math.round(sum / relevant.length);
}

export function getTotalCheckIns(checkIns) {
  return checkIns.length;
}

export function getTotalActiveDays(habits, checkIns) {
  const active = habits.filter((h) => !h.archived);
  if (active.length === 0) return 0;

  const dateSet = new Set();
  for (const c of checkIns) {
    if (active.some((h) => h.id === c.habitId)) {
      dateSet.add(c.date);
    }
  }
  return dateSet.size;
}

export function getGlobalBestStreak(habits, checkIns) {
  const active = habits.filter((h) => !h.archived);
  if (active.length === 0) return 0;

  let best = 0;
  for (const h of active) {
    best = Math.max(best, getBestStreak(checkIns, h.id));
  }
  return best;
}

export function getHeatmapData(habits, checkIns, weeks = 12) {
  const today = todayStr();
  const d = parseDate(today);
  const dayOfWeek = d.getDay();
  const startOffset = (dayOfWeek + 6) % 7 + (weeks - 1) * 7;
  const startDate = addDays(today, -startOffset);

  const result = [];
  for (let w = 0; w < weeks; w++) {
    const week = [];
    for (let day = 0; day < 7; day++) {
      const date = addDays(startDate, w * 7 + day);
      if (date > today) {
        week.push({ date, level: -1 });
      } else {
        const rate = getDayCompletionRate(habits, checkIns, date);
        let level = 0;
        if (rate > 0) level = 1;
        if (rate >= 25) level = 2;
        if (rate >= 50) level = 3;
        if (rate >= 75) level = 4;
        week.push({ date, level, rate });
      }
    }
    result.push(week);
  }
  return result;
}

export function getHabitRanking(habits, checkIns) {
  const active = habits.filter((h) => !h.archived);
  return active
    .map((h) => ({
      habit: h,
      count: checkIns.filter((c) => c.habitId === h.id).length,
      streak: getHabitStreak(checkIns, h.id, habits),
      bestStreak: getBestStreak(checkIns, h.id),
    }))
    .sort((a, b) => b.count - a.count);
}

export function getOverallStreak(habits, checkIns) {
  const active = habits.filter((h) => !h.archived);
  if (active.length === 0) return 0;

  const today = todayStr();
  const yesterday = addDays(today, -1);

  const allDone = (date) =>
    active.every((h) => {
      if (h.createdAt > date) return true;
      return isCheckedIn(checkIns, h.id, date);
    });

  let startDate;
  if (allDone(today)) {
    startDate = today;
  } else if (allDone(yesterday)) {
    startDate = yesterday;
  } else {
    return 0;
  }

  let streak = 0;
  let current = startDate;
  while (allDone(current)) {
    streak++;
    current = addDays(current, -1);
  }
  return streak;
}
