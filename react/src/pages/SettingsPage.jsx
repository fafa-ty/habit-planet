import { useState } from "react";
import { useApp } from "../context/AppContext";

export default function SettingsPage() {
  const {
    settings, persistSettings, saveSettingsOnly, exportData, clearAllData, data, persistLocal,
    getSyncConfig, formatSyncTime, syncManager, createSyncSpace, verifySyncCredentials,
    checkServerHealth, getDeviceId, showToast, showConfirm, requestNotificationPermission,
    setWeeklyReport,
  } = useApp();

  const [syncModal, setSyncModal] = useState(null);
  const [pendingSync, setPendingSync] = useState(null);
  const [joinId, setJoinId] = useState("");
  const [joinToken, setJoinToken] = useState("");
  const sync = getSyncConfig(settings);

  const handleCreateSync = async () => {
    if (!await checkServerHealth(settings)) return showToast("无法连接同步服务器", "error");
    try {
      const result = await createSyncSpace(settings);
      setPendingSync(result);
      setSyncModal("create");
    } catch (e) { showToast(e.message, "error"); }
  };

  const finishCreateSync = () => {
    if (!pendingSync) return;
    persistSettings({
      ...settings,
      sync: { ...sync, enabled: true, syncId: pendingSync.syncId, token: pendingSync.token, deviceId: getDeviceId(settings), status: "idle" },
    });
    setSyncModal(null);
    setPendingSync(null);
    syncManager.current?.push();
    showToast("云同步已开启", "success");
  };

  const handleJoinSync = async () => {
    if (!joinId || !joinToken) return showToast("请填写同步 ID 和密钥", "error");
    try {
      await verifySyncCredentials(settings, joinId.trim().toUpperCase(), joinToken.trim());
      persistSettings({
        ...settings,
        sync: { ...sync, enabled: true, syncId: joinId.trim().toUpperCase(), token: joinToken.trim(), deviceId: getDeviceId(settings), status: "idle" },
      });
      setSyncModal(null);
      await syncManager.current?.pullAndMerge(false);
      showToast("已成功加入同步空间", "success");
    } catch (e) { showToast(e.message, "error"); }
  };

  return (
    <>
      <header className="page-header"><h1>设置</h1></header>

      <div className="settings-group">
        <h2>云同步</h2>
        <div className="sync-status-card">
          <div className="sync-status-row">
            <span className={`sync-status-dot ${sync.enabled ? sync.status || "synced" : ""}`} />
            <div className="sync-status-info">
              <span className="sync-status-label">{sync.enabled ? "已连接" : "未开启"}</span>
              <span className="sync-status-desc">{sync.enabled ? `同步 ID：${sync.syncId}` : "多设备实时同步习惯数据"}</span>
            </div>
          </div>
          {sync.enabled && <p className="sync-last-time">上次同步：{formatSyncTime(sync.lastSyncedAt)}</p>}
          <div className="sync-actions">
            {!sync.enabled ? (
              <>
                <button type="button" className="btn btn-sm btn-primary" onClick={handleCreateSync}>创建同步空间</button>
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => setSyncModal("join")}>加入同步空间</button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => syncManager.current?.pullAndMerge(false)}>立即同步</button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={async () => {
                  if (await showConfirm("断开云同步", "确定断开吗？")) {
                    saveSettingsOnly({ ...settings, sync: { ...sync, enabled: false, syncId: null, token: null } });
                  }
                }}>断开连接</button>
              </>
            )}
          </div>
        </div>
        <label className="field field-inline">
          <input type="url" defaultValue={sync.serverUrl} placeholder="http://localhost:8787"
            onChange={(e) => saveSettingsOnly({ ...settings, sync: { ...sync, serverUrl: e.target.value } })} />
        </label>
      </div>

      <div className="settings-group">
        <h2>提醒与通知</h2>
        <Row label="浏览器通知" desc="到点提醒未完成的习惯" checked={settings.notificationsEnabled}
          onChange={async (v) => {
            if (v && (await requestNotificationPermission()) !== "granted") return showToast("请允许通知权限", "error");
            persistSettings({ ...settings, notificationsEnabled: v });
          }} />
        <Row label="每周报告" desc="每周一推送上周总结" checked={settings.weeklyReportEnabled !== false}
          onChange={(v) => persistSettings({ ...settings, weeklyReportEnabled: v })} />
        <div className="setting-row">
          <div className="setting-info"><span className="setting-label">查看上周报告</span></div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setWeeklyReport(true)}>查看</button>
        </div>
      </div>

      <div className="settings-group">
        <h2>外观</h2>
        <Row label="深色模式" checked={settings.theme === "dark"} onChange={(v) => persistSettings({ ...settings, theme: v ? "dark" : "light" })} />
      </div>

      <div className="settings-group">
        <h2>数据</h2>
        <div className="setting-row">
          <div className="setting-info"><span className="setting-label">导出数据</span></div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => { exportData(data); showToast("已导出", "success"); }}>导出</button>
        </div>
        <div className="setting-row danger">
          <div className="setting-info"><span className="setting-label">清除所有数据</span></div>
          <button type="button" className="btn btn-danger btn-sm" onClick={async () => {
            if (await showConfirm("清除所有数据", "确定吗？")) { clearAllData(); persistLocal({ habits: [], checkIns: [] }); showToast("已清除", "info"); }
          }}>清除</button>
        </div>
      </div>

      <div className="settings-group">
        <h2>关于</h2>
        <div className="about-card">
          <span className="about-icon">🌍</span>
          <div><strong>习惯星球 HabitPlanet</strong><p>v1.2.0 React · 养成好习惯，看见每一天的进步</p></div>
        </div>
      </div>

      {syncModal === "create" && pendingSync && (
        <SyncModal title="同步空间已创建" onClose={() => setSyncModal(null)}>
          <p className="sync-modal-desc">在其他设备输入以下凭证：</p>
          <Cred label="同步 ID" value={pendingSync.syncId} />
          <Cred label="密钥" value={pendingSync.token} small />
          <div className="modal-actions"><button type="button" className="btn btn-primary" onClick={finishCreateSync}>开始同步</button></div>
        </SyncModal>
      )}
      {syncModal === "join" && (
        <SyncModal title="加入同步空间" onClose={() => setSyncModal(null)}>
          <label className="field"><span>同步 ID</span><input value={joinId} onChange={(e) => setJoinId(e.target.value)} /></label>
          <label className="field"><span>密钥</span><input value={joinToken} onChange={(e) => setJoinToken(e.target.value)} /></label>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setSyncModal(null)}>取消</button>
            <button type="button" className="btn btn-primary" onClick={handleJoinSync}>连接</button>
          </div>
        </SyncModal>
      )}
    </>
  );
}

function Row({ label, desc, checked, onChange }) {
  return (
    <div className="setting-row">
      <div className="setting-info"><span className="setting-label">{label}</span>{desc && <span className="setting-desc">{desc}</span>}</div>
      <label className="toggle"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /><span className="toggle-slider" /></label>
    </div>
  );
}

function Cred({ label, value, small }) {
  return (
    <div className="sync-credential"><label>{label}</label>
      <div className="credential-row"><code className={small ? "token-text" : ""}>{value}</code>
        <button type="button" className="btn-copy" onClick={() => navigator.clipboard.writeText(value)}>📋</button></div></div>
  );
}

function SyncModal({ title, onClose, children }) {
  return (
    <div className="modal"><div className="modal-backdrop" onClick={onClose} />
      <div className="modal-content modal-sm"><div className="modal-header"><h2>{title}</h2><button type="button" className="modal-close" onClick={onClose}>&times;</button></div>{children}</div></div>
  );
}
