import { useApp } from "../context/AppContext";

const NAV = [
  { id: "today", icon: "☀️", label: "今日" },
  { id: "habits", icon: "📋", label: "习惯" },
  { id: "stats", icon: "📊", label: "统计" },
  { id: "settings", icon: "⚙️", label: "设置" },
];

export default function Sidebar() {
  const { page, setPage, getGlobalBestStreak, data } = useApp();
  const best = getGlobalBestStreak(data.habits, data.checkIns);

  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-icon">🌍</span>
        <span className="brand-text">习惯星球</span>
      </div>
      <ul className="nav-list">
        {NAV.map((n) => (
          <li key={n.id}>
            <button type="button" className={`nav-item${page === n.id ? " active" : ""}`} onClick={() => setPage(n.id)}>
              <span className="nav-icon">{n.icon}</span><span>{n.label}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="sidebar-footer">
        <div className="streak-badge">
          <span className="streak-fire">🔥</span>
          <span className="streak-count">{best}</span>
          <span className="streak-label">最长连续</span>
        </div>
      </div>
    </nav>
  );
}

export function BottomNav() {
  const { page, setPage } = useApp();
  return (
    <nav className="bottom-nav">
      {NAV.map((n) => (
        <button key={n.id} type="button" className={`bottom-nav-item${page === n.id ? " active" : ""}`} onClick={() => setPage(n.id)}>
          <span>{n.icon}</span><span>{n.label}</span>
        </button>
      ))}
    </nav>
  );
}
