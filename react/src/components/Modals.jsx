import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { HABIT_TEMPLATES } from "../lib/templates.js";
import { todayStr } from "../lib/utils.js";
import { getCheckIn } from "../lib/stats.js";
import { buildWeeklyReport } from "../lib/weekly-report.js";

export function HabitModal() {
  const { habitModal, setHabitModal, saveHabit, ICONS, COLORS } = useApp();
  const [form, setForm] = useState({ name: "", category: "health", icon: "📚", color: COLORS[0], reminderEnabled: false, reminderTime: "08:00" });

  useEffect(() => {
    if (habitModal) {
      setForm(habitModal.id ? { ...habitModal } : { name: "", category: "health", icon: "📚", color: COLORS[0], reminderEnabled: false, reminderTime: "08:00" });
    }
  }, [habitModal, COLORS]);

  if (habitModal === null) return null;

  const submit = (e) => {
    e.preventDefault();
    saveHabit({
      ...form,
      id: habitModal.id,
      reminderTime: form.reminderEnabled ? form.reminderTime : null,
    });
  };

  return (
    <div className="modal">
      <div className="modal-backdrop" onClick={() => setHabitModal(null)} />
      <div className="modal-content">
        <div className="modal-header">
          <h2>{habitModal.id ? "编辑习惯" : "新建习惯"}</h2>
          <button type="button" className="modal-close" onClick={() => setHabitModal(null)}>&times;</button>
        </div>
        <form onSubmit={submit}>
          <label className="field"><span>习惯名称</span>
            <input required maxLength={30} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="例如：阅读 30 分钟" />
          </label>
          <label className="field"><span>分类</span>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="health">🏃 健康</option><option value="study">📚 学习</option>
              <option value="life">🏠 生活</option><option value="work">💼 工作</option>
            </select>
          </label>
          <div className="field"><span>图标</span>
            <div className="icon-picker">{ICONS.map((icon) => (
              <button key={icon} type="button" className={`icon-option${form.icon === icon ? " selected" : ""}`} onClick={() => setForm({ ...form, icon })}>{icon}</button>
            ))}</div>
          </div>
          <div className="field"><span>颜色</span>
            <div className="color-picker">{COLORS.map((color) => (
              <button key={color} type="button" className={`color-option${form.color === color ? " selected" : ""}`} style={{ background: color }} onClick={() => setForm({ ...form, color })} />
            ))}</div>
          </div>
          {!habitModal.id && (
            <div className="field"><span>快速模板</span>
              <div className="template-picker">{HABIT_TEMPLATES.map((t) => (
                <button key={t.name} type="button" className="template-chip" onClick={() => setForm({ ...form, ...t })}>{t.icon} {t.name}</button>
              ))}</div>
            </div>
          )}
          <div className="field"><span>每日提醒</span>
            <div className="reminder-field">
              <label className="toggle toggle-sm"><input type="checkbox" checked={form.reminderEnabled} onChange={(e) => setForm({ ...form, reminderEnabled: e.target.checked })} /><span className="toggle-slider" /></label>
              <input type="time" value={form.reminderTime} onChange={(e) => setForm({ ...form, reminderTime: e.target.value })} />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setHabitModal(null)}>取消</button>
            <button type="submit" className="btn btn-primary">保存</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function NoteModal() {
  const { noteModal, setNoteModal, completeCheckIn, data, persistLocal } = useApp();
  const [note, setNote] = useState("");

  useEffect(() => {
    if (noteModal) {
      const c = getCheckIn(data.checkIns, noteModal.habitId, todayStr());
      setNote(c?.note || "");
    }
  }, [noteModal, data.checkIns]);

  if (!noteModal) return null;

  const save = () => {
    const today = todayStr();
    const existing = getCheckIn(data.checkIns, noteModal.habitId, today);
    if (existing) {
      const checkIns = data.checkIns.map((c) =>
        c.habitId === noteModal.habitId && c.date === today ? { ...c, note: note || undefined } : c
      );
      persistLocal({ ...data, checkIns });
      setNoteModal(null);
    } else {
      completeCheckIn(note);
    }
  };

  return (
    <div className="modal">
      <div className="modal-backdrop" onClick={() => setNoteModal(null)} />
      <div className="modal-content modal-sm">
        <div className="modal-header"><h2>打卡备注</h2><button type="button" className="modal-close" onClick={() => setNoteModal(null)}>&times;</button></div>
        <p className="note-habit-name">{noteModal.habit?.icon} {noteModal.habit?.name}</p>
        <label className="field"><span>今日感想（可选）</span>
          <textarea rows={3} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="记录今天的感受..." />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={() => noteModal.mode === "checkin" ? completeCheckIn(null) : setNoteModal(null)}>跳过</button>
          <button type="button" className="btn btn-primary" onClick={save}>{getCheckIn(data.checkIns, noteModal.habitId, todayStr()) ? "保存备注" : "完成打卡"}</button>
        </div>
      </div>
    </div>
  );
}

export function WeeklyReportModal() {
  const { weeklyReport, setWeeklyReport, data } = useApp();
  if (!weeklyReport) return null;
  const report = buildWeeklyReport(data.habits, data.checkIns);
  const maxRate = Math.max(...report.dailyRates.map((d) => d.rate), 1);

  return (
    <div className="modal">
      <div className="modal-backdrop" onClick={() => setWeeklyReport(false)} />
      <div className="modal-content modal-lg">
        <div className="modal-header"><h2>📋 上周总结</h2><button type="button" className="modal-close" onClick={() => setWeeklyReport(false)}>&times;</button></div>
        <p className="weekly-report-range">{report.weekRange}</p>
        <div className="weekly-report-stats">
          {[["平均完成率", report.avgRate + "%"], ["打卡次数", report.totalCheckIns], ["完美天数", report.perfectDays]].map(([l, v]) => (
            <div key={l} className="weekly-stat"><span className="weekly-stat-value">{v}</span><span className="weekly-stat-label">{l}</span></div>
          ))}
        </div>
        <div className="weekly-report-chart">
          {report.dailyRates.map((d) => (
            <div key={d.date} className="weekly-report-bar-wrap">
              <div className="weekly-report-bar" style={{ height: `${Math.max(4, (d.rate / maxRate) * 100)}%` }} />
              <span className="weekly-report-bar-label">{d.label.replace("周", "")}</span>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={() => setWeeklyReport(false)}>继续加油 💪</button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmModal() {
  return null;
}
