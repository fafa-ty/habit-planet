import { useApp } from "../context/AppContext";
import {
  getTotalActiveDays, getTotalCheckIns, getGlobalBestStreak,
  getMonthCompletionRate, getWeekStats, getHeatmapData,
  getHabitRanking, getDayCompletionRate,
} from "../lib/stats.js";
import { ACHIEVEMENTS, getUnlockedAchievements } from "../lib/achievements.js";
import { getDayLabel, todayStr } from "../lib/utils.js";

export default function StatsPage() {
  const { data } = useApp();
  const { habits, checkIns } = data;
  const today = todayStr();
  const weekStats = getWeekStats(habits, checkIns);
  const maxRate = Math.max(...weekStats.map((s) => s.rate), 1);
  const heatmap = getHeatmapData(habits, checkIns);
  const ranking = getHabitRanking(habits, checkIns);
  const maxCount = Math.max(...ranking.map((r) => r.count), 1);
  const unlocked = new Set(getUnlockedAchievements(habits, checkIns).map((a) => a.id));

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return (
    <>
      <header className="page-header"><h1>数据统计</h1></header>

      <div className="stats-cards">
        {[
          ["📅", getTotalActiveDays(habits, checkIns), "累计打卡天"],
          ["✅", getTotalCheckIns(checkIns), "总打卡次数"],
          ["🔥", getGlobalBestStreak(habits, checkIns), "最长连续"],
          ["📈", getMonthCompletionRate(habits, checkIns) + "%", "本月完成率"],
        ].map(([icon, val, label]) => (
          <div key={label} className="stat-card">
            <span className="stat-card-icon">{icon}</span>
            <span className="stat-card-value">{val}</span>
            <span className="stat-card-label">{label}</span>
          </div>
        ))}
      </div>

      <div className="panel">
        <h2>本周完成趋势</h2>
        <div className="week-chart">
          {weekStats.map((s) => (
            <div key={s.date} className="week-bar-wrap">
              <span className="week-bar-value">{s.rate}%</span>
              <div className={`week-bar${s.date === today ? " today" : ""}`} style={{ height: `${Math.max(4, (s.rate / maxRate) * 100)}%` }} />
              <span className="week-bar-label">{getDayLabel(s.date)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h2>本月日历</h2>
        <div className="month-calendar">
          {["日", "一", "二", "三", "四", "五", "六"].map((h) => <div key={h} className="calendar-header">{h}</div>)}
          {Array.from({ length: firstDay }, (_, i) => <div key={`e${i}`} className="calendar-day empty" />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const d = i + 1;
            const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const rate = getDayCompletionRate(habits, checkIns, date);
            return (
              <div key={d} className={`calendar-day${date === today ? " today" : ""}${rate === 100 ? " completed" : rate > 0 ? " partial" : ""}`}>
                {d}{rate > 0 && <span className="calendar-dot" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel">
        <h2>打卡热力图</h2>
        <p className="panel-desc">过去 12 周的坚持记录</p>
        <div className="heatmap-wrap">
          <div className="heatmap">
            {heatmap.map((week, wi) => (
              <div key={wi} className="heatmap-week">
                {week.map((day) => (
                  day.level < 0
                    ? <div key={day.date} className="heatmap-cell" style={{ visibility: "hidden" }} />
                    : <div key={day.date} className={`heatmap-cell level-${day.level}`} title={`${day.date}: ${day.rate ?? 0}%`} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>习惯排行</h2>
        <div className="habit-ranking">
          {ranking.map((r, i) => (
            <div key={r.habit.id} className="ranking-item">
              <div className={`ranking-rank${i < 3 ? " top" : ""}`}>{i + 1}</div>
              <span className="ranking-icon">{r.habit.icon}</span>
              <div className="ranking-info">
                <div className="ranking-name">{r.habit.name}</div>
                <div className="ranking-bar-wrap"><div className="ranking-bar" style={{ width: `${(r.count / maxCount) * 100}%` }} /></div>
              </div>
              <span className="ranking-count">{r.count} 次</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h2>成就徽章</h2>
        <div className="achievements-grid">
          {ACHIEVEMENTS.map((a) => (
            <div key={a.id} className={`achievement${unlocked.has(a.id) ? " unlocked" : " locked"}`}>
              <span className="achievement-icon">{a.icon}</span>
              <span className="achievement-name">{a.name}</span>
              <span className="achievement-desc">{a.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
