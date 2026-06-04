import {
  getTotalCheckIns,
  getGlobalBestStreak,
  getOverallStreak,
  getHabitStreak,
  getTotalActiveDays,
} from "./stats.js";

export const ACHIEVEMENTS = [
  {
    id: "first-check",
    icon: "🌟",
    name: "初次打卡",
    desc: "完成第一次打卡",
    check: (habits, checkIns) => checkIns.length >= 1,
  },
  {
    id: "streak-3",
    icon: "🔥",
    name: "三日之火",
    desc: "单个习惯连续 3 天",
    check: (habits, checkIns) =>
      habits.some((h) => getHabitStreak(checkIns, h.id, habits) >= 3),
  },
  {
    id: "streak-7",
    icon: "⚡",
    name: "一周达人",
    desc: "单个习惯连续 7 天",
    check: (habits, checkIns) =>
      habits.some((h) => getHabitStreak(checkIns, h.id, habits) >= 7),
  },
  {
    id: "streak-30",
    icon: "💎",
    name: "月度传奇",
    desc: "单个习惯连续 30 天",
    check: (habits, checkIns) => getGlobalBestStreak(habits, checkIns) >= 30,
  },
  {
    id: "check-10",
    icon: "🎯",
    name: "十连击",
    desc: "累计打卡 10 次",
    check: (habits, checkIns) => getTotalCheckIns(checkIns) >= 10,
  },
  {
    id: "check-50",
    icon: "💯",
    name: "半百打卡",
    desc: "累计打卡 50 次",
    check: (habits, checkIns) => getTotalCheckIns(checkIns) >= 50,
  },
  {
    id: "check-100",
    icon: "🏆",
    name: "百次打卡",
    desc: "累计打卡 100 次",
    check: (habits, checkIns) => getTotalCheckIns(checkIns) >= 100,
  },
  {
    id: "habits-3",
    icon: "🌱",
    name: "习惯萌芽",
    desc: "创建 3 个习惯",
    check: (habits) => habits.filter((h) => !h.archived).length >= 3,
  },
  {
    id: "habits-5",
    icon: "🌳",
    name: "习惯森林",
    desc: "创建 5 个习惯",
    check: (habits) => habits.filter((h) => !h.archived).length >= 5,
  },
  {
    id: "all-done",
    icon: "🎉",
    name: "完美一天",
    desc: "一天内完成所有习惯",
    check: (habits, checkIns) => getOverallStreak(habits, checkIns) >= 1,
  },
  {
    id: "active-7",
    icon: "📅",
    name: "活跃一周",
    desc: "累计活跃 7 天",
    check: (habits, checkIns) => getTotalActiveDays(habits, checkIns) >= 7,
  },
  {
    id: "active-30",
    icon: "🗓️",
    name: "活跃一月",
    desc: "累计活跃 30 天",
    check: (habits, checkIns) => getTotalActiveDays(habits, checkIns) >= 30,
  },
];

export function getUnlockedAchievements(habits, checkIns) {
  return ACHIEVEMENTS.filter((a) => a.check(habits, checkIns));
}

export function getNewlyUnlocked(habits, checkIns, previouslyUnlocked) {
  const current = getUnlockedAchievements(habits, checkIns);
  const prevSet = new Set(previouslyUnlocked);
  return current.filter((a) => !prevSet.has(a.id));
}
