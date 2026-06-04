import { useApp } from "../context/AppContext";
import { todayStr } from "../lib/utils.js";

export default function Onboarding() {
  const { onboarding, onboardingStep, setOnboardingStep, finishOnboarding } = useApp();
  if (!onboarding) return null;

  const steps = [
    { emoji: "🌍", title: "欢迎来到习惯星球", desc: <>在这里，每一个小习惯都是一颗星星。<br />坚持打卡，点亮你的星空。</> },
    { emoji: "✅", title: "每日一键打卡", desc: <>创建习惯后，每天只需轻轻一点<br />记录你的坚持。</> },
    { emoji: "🔥", title: "连续天数激励", desc: <>Streak 火焰会提醒你：<br />别断签，你比想象中更强大。</> },
    { emoji: "📊", title: "数据可视化", desc: <>热力图、完成率、成就徽章<br />让进步看得见。</> },
  ];

  const next = () => {
    if (onboardingStep >= steps.length - 1) finishOnboarding();
    else setOnboardingStep(onboardingStep + 1);
  };

  return (
    <div className="onboarding">
      <div className="onboarding-inner">
        <div className="onboarding-step active">
          <div className="onboarding-emoji">{steps[onboardingStep].emoji}</div>
          <h1>{steps[onboardingStep].title}</h1>
          <p>{steps[onboardingStep].desc}</p>
        </div>
        <div className="onboarding-dots">
          {steps.map((_, i) => <span key={i} className={`dot${i === onboardingStep ? " active" : ""}`} />)}
        </div>
        <div className="onboarding-actions">
          <button type="button" className="btn btn-ghost" onClick={finishOnboarding}>跳过</button>
          <button type="button" className="btn btn-primary" onClick={next}>
            {onboardingStep === steps.length - 1 ? "开始使用" : "下一步"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ReminderBanner() {
  const { data, settings, persistSettings, getDueReminders } = useApp();
  const today = todayStr();
  const dismissed = settings.dismissedReminders?.[today] || [];
  const due = getDueReminders(data.habits, data.checkIns, dismissed);
  if (due.length === 0) return null;

  const dismiss = () => {
    persistSettings({
      ...settings,
      dismissedReminders: { ...settings.dismissedReminders, [today]: due.map((h) => h.id) },
    });
  };

  return (
    <div className="reminder-banner">
      <div className="reminder-banner-content">
        <span className="reminder-banner-icon">⏰</span>
        <div className="reminder-banner-text">
          <strong>还有 {due.length} 个习惯未完成</strong>
          <span>{due.map((h) => `${h.icon} ${h.name}`).join("、")}</span>
        </div>
      </div>
      <button type="button" className="btn btn-sm btn-primary" onClick={dismiss}>知道了</button>
    </div>
  );
}

export function ConfettiCanvas() {
  return <canvas id="confetti-canvas" className="confetti-canvas" />;
}

export function ToastContainer() {
  return <div className="toast-container" id="toast-container" />;
}
