export default function ProgressRing({ percent, label }) {
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (percent / 100) * circumference;
  const stroke = percent === 100 ? "var(--color-success)" : "var(--color-primary)";

  return (
    <div className="progress-ring-wrap">
      <svg className="progress-ring" viewBox="0 0 120 120">
        <circle className="progress-ring-bg" cx="60" cy="60" r="52" />
        <circle className="progress-ring-fill" cx="60" cy="60" r="52"
          style={{ strokeDasharray: circumference, strokeDashoffset: offset, stroke }} />
      </svg>
      <div className="progress-ring-text">
        <span className="progress-percent">{percent}%</span>
        <span className="progress-label">{label}</span>
      </div>
    </div>
  );
}
