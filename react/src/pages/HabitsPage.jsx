import { useApp } from "../context/AppContext";

export default function HabitsPage() {
  const {
    data, categoryFilter, setCategoryFilter, CATEGORY_LABELS,
    getHabitStreak, getBestStreak, setHabitModal,
    archiveHabit, restoreHabit, deleteHabit,
  } = useApp();

  const isArchived = categoryFilter === "archived";
  let habits = data.habits.filter((h) => isArchived ? h.archived : !h.archived);
  if (!isArchived && categoryFilter !== "all") {
    habits = habits.filter((h) => h.category === categoryFilter);
  }

  const filters = [
    ["all", "全部"], ["health", "🏃 健康"], ["study", "📚 学习"],
    ["life", "🏠 生活"], ["work", "💼 工作"], ["archived", "📦 已归档"],
  ];

  return (
    <>
      <header className="page-header">
        <h1>习惯管理</h1>
        <button type="button" className="btn btn-primary" onClick={() => setHabitModal({})}>+ 新建习惯</button>
      </header>

      <div className="filter-bar">
        {filters.map(([cat, label]) => (
          <button key={cat} type="button" className={`filter-chip${categoryFilter === cat ? " active" : ""}`}
            onClick={() => setCategoryFilter(cat)}>{label}</button>
        ))}
      </div>

      {habits.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h3>{isArchived ? "暂无归档习惯" : "暂无习惯"}</h3>
        </div>
      ) : (
        <div className="habit-grid">
          {habits.map((habit) => {
            const streak = getHabitStreak(data.checkIns, habit.id, data.habits);
            const best = getBestStreak(data.checkIns, habit.id);
            const count = data.checkIns.filter((c) => c.habitId === habit.id).length;
            return (
              <div key={habit.id} className={`habit-manage-card${habit.archived ? " archived" : ""}`} style={{ "--habit-color": habit.color }}>
                <div className="habit-manage-header">
                  <div className="habit-manage-icon">{habit.icon}</div>
                  <div>
                    <div className="habit-manage-name">{habit.name}{habit.archived && <span className="archived-badge">已归档</span>}</div>
                    <div className="habit-manage-category">{CATEGORY_LABELS[habit.category]}</div>
                  </div>
                </div>
                <div className="habit-manage-stats">
                  {[["总打卡", count], ["当前连续", streak], ["最长连续", best]].map(([l, v]) => (
                    <div key={l} className="habit-manage-stat">
                      <span className="habit-manage-stat-value">{v}</span>
                      <span className="habit-manage-stat-label">{l}</span>
                    </div>
                  ))}
                </div>
                <div className="habit-manage-actions">
                  {habit.archived ? (
                    <>
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => restoreHabit(habit.id)}>恢复</button>
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => deleteHabit(habit.id)}>删除</button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="btn btn-sm btn-secondary" onClick={() => setHabitModal(habit)}>编辑</button>
                      <button type="button" className="btn btn-sm btn-secondary" onClick={() => archiveHabit(habit.id)}>归档</button>
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => deleteHabit(habit.id)}>删除</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
