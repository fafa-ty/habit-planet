export const HABIT_TEMPLATES = [
  { name: "阅读 30 分钟", icon: "📚", color: "#6366f1", category: "study" },
  { name: "运动 20 分钟", icon: "🏃", color: "#10b981", category: "health" },
  { name: "喝 8 杯水", icon: "💧", color: "#06b6d4", category: "health" },
  { name: "冥想 10 分钟", icon: "🧘", color: "#8b5cf6", category: "health" },
  { name: "23 点前睡觉", icon: "😴", color: "#3b82f6", category: "health" },
  { name: "写日记", icon: "✍️", color: "#f59e0b", category: "life" },
  { name: "学习一门技能", icon: "🧠", color: "#ec4899", category: "study" },
  { name: "整理房间", icon: "🧹", color: "#10b981", category: "life" },
  { name: "记账", icon: "💰", color: "#f59e0b", category: "life" },
  { name: "背单词 20 个", icon: "📝", color: "#6366f1", category: "study" },
  { name: "早起 6:30", icon: "🌅", color: "#f59e0b", category: "life" },
  { name: "练习编程", icon: "💻", color: "#3b82f6", category: "work" },
];

export const MOTIVATIONAL_QUOTES = [
  "每一次打卡，都是对未来的投资。",
  "习惯的力量，在于重复。",
  "今天的坚持，是明天的底气。",
  "不要小看每天 1% 的进步。",
  "你比昨天更接近理想的自己。",
  "小步快跑，胜过原地等待。",
  "自律给我自由。",
  "星星之火，可以燎原。",
  "种一棵树最好的时间是十年前，其次是现在。",
  "完成比完美更重要。",
];

export function getDailyQuote() {
  const day = new Date().getDate();
  return MOTIVATIONAL_QUOTES[day % MOTIVATIONAL_QUOTES.length];
}
