import { useApp } from "../context/AppContext";
import { todayStr } from "../lib/utils.js";
import { getOverallStreak } from "../lib/stats.js";
import ProgressRing from "../components/ProgressRing";
import { ReminderBanner } from "../components/Onboarding";

export default function TodayPage() {
  const {
    data, getGreeting, formatDisplayDate, getDailyQuote,
    getTodayProgress, getWeekCompletionRate, getHabitStreak,
    isCheckedIn, getCheckIn, CATEGORY_LABELS, toggleCheckIn,
    setNoteModal, setHabitModal,
  } = useApp();

  const today = todayStr();
  const active = data.habits.filter((h) => !h.archived);
  const progress = getTodayProgress(data.habits, data.checkIns);

  return (
    <>
      <header className="page-header">
        <div className="greeting">
          <h1>{getGreeting()}</h1>
          <p className="date-text">{formatDisplayDate()}</p>
          <p className="quote-text">"{getDailyQuote()}"</p>
        </div>
      </header>

      <div className="today-hero">
        <ProgressRing percent={progress.percent} label={`${progress.completed}/${progress.total} 完成`} />
        <div className="today-stats">
          <div className="stat-pill">
            <span className="stat-pill-value">{getOverallStreak(data.habits, data.checkIns)}</span>
            <span className="stat-pill-label">今日连续</span>
          </div>
          <div className="stat-pill">
            <span className="stat-pill-value">{getWeekCompletionRate(data.habits, data.checkIns)}%</span>
            <span className="stat-pill-label">本周完成率</span>
          </div>
        </div>
      </div>

      <ReminderBanner />

      <div className="section-header">
        <h2>今日习惯</h2>
        <button type="button" className="btn btn-sm btn-primary" onClick={() => setHabitModal({})}>+ 添加</button>
      </div>

      {active.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🌱</div>
          <h3>还没有习惯</h3>
          <p>创建你的第一个习惯，开始改变吧！</p>
          <button type="button" className="btn btn-primary" onClick={() => setHabitModal({})}>创建第一个习惯</button>
        </div>
      ) : (
        <div className="habit-list">
          {active.map((habit) => {
            const completed = isCheckedIn(data.checkIns, habit.id, today);
            const checkIn = getCheckIn(data.checkIns, habit.id, today);
            const streak = getHabitStreak(data.checkIns, habit.id, data.habits);
            return (
              <div key={habit.id} className={`habit-card${completed ? " completed" : ""}`}
                style={{ "--habit-color": habit.color }} onClick={() => toggleCheckIn(habit.id)}>
                <div className="habit-icon">{habit.icon}</div>
                <div className="habit-info">
                  <div className="habit-name">{habit.name}</div>
                  <div className="habit-meta">
                    <span>{CATEGORY_LABELS[habit.category]}</span>
                    {streak > 0 && <span className="habit-streak">🔥 {streak} 天</span>}
                    {habit.reminderEnabled && habit.reminderTime && <span>⏰ {habit.reminderTime}</span>}
                  </div>
                  {checkIn?.note && <div className="habit-note">"{checkIn.note}"</div>}
                </div>
                <div className="habit-card-actions">
                  <button type="button" className={`habit-note-btn${checkIn?.note ? " has-note" : ""}`}
                    onClick={(e) => { e.stopPropagation(); setNoteModal({ habitId: habit.id, habit, mode: checkIn ? "edit" : "checkin" }); }}>📝</button>
                  <div className="habit-check">{completed ? "✓" : ""}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
