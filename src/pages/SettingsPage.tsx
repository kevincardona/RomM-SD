import React, { useState, useRef, useId, ChangeEvent, FocusEvent, KeyboardEvent } from 'react';
import type { Config } from '../vite-env';

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

interface EditableSettingProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  onCommit?: () => void;
  revealable?: boolean;
  saved?: boolean;
}

function EditableSetting({ label, hint, value, onChange, type = 'text', onCommit, revealable = false, saved = false }: EditableSettingProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const inputId = useId();

  const effectiveType = revealable ? (revealed ? 'text' : 'password') : type;

  const activate = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    inputRef.current?.focus();
    inputRef.current?.select();
    window.electronAPI?.showKeyboard?.();
  };

  return (
    <div
      className={`editable-setting ${focused ? 'focused' : ''}`}
      onClick={(e) => { if (e.target === inputRef.current) return; activate(e); }}
    >
      <label
        htmlFor={inputId}
        onClick={(e) => { e.preventDefault(); activate(e); }}
        style={{ flex: '0 0 180px', minWidth: 0, fontWeight: 500, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '2px' }}
      >
        <span>{label}</span>
        {saved && <span style={{ fontSize: '0.65rem', color: 'var(--accent-color)' }}>✓ saved</span>}
      </label>
      {revealable ? (
        <div className="password-field">
          <input
            id={inputId}
            ref={inputRef}
            type={effectiveType}
            tabIndex={-1}
            placeholder={hint}
            value={value || ''}
            onChange={onChange}
            onFocus={() => setFocused(true)}
            onBlur={() => { setFocused(false); onCommit && onCommit(); }}
            onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.currentTarget.blur(); } }}
            style={{
              padding: '10px 16px',
              background: 'rgba(255,255,255,0.04)',
              border: focused ? '1px solid var(--accent-color)' : '1px solid var(--panel-border)',
              borderRadius: '8px',
              color: 'var(--text-main)',
              fontSize: '1rem',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
          <button
            type="button"
            className="password-toggle"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); setRevealed(r => !r); inputRef.current?.focus(); }}
            aria-label={revealed ? 'Hide password' : 'Show password'}
          >
            <EyeIcon open={revealed} />
          </button>
        </div>
      ) : (
        <input
          id={inputId}
          ref={inputRef}
          type={effectiveType}
          tabIndex={-1}
          placeholder={hint}
          value={value || ''}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); onCommit && onCommit(); }}
          onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.currentTarget.blur(); } }}
          style={{
            flex: 1,
            minWidth: 0,
            padding: '10px 16px',
            background: 'rgba(255,255,255,0.04)',
            border: focused ? '1px solid var(--accent-color)' : '1px solid var(--panel-border)',
            borderRadius: '8px',
            color: 'var(--text-main)',
            fontSize: '1rem',
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
        />
      )}
    </div>
  );
}

interface DiagnosticResult {
  name: string;
  path: string;
  exists: boolean;
}

interface SettingsPageProps {
  config: Config;
  setConfig: (config: Config) => void;
  updateConfig: (patch: Partial<Config>) => Promise<void>;
  onSave: () => Promise<any> | void;
  error?: string;
  onRerunWizard: () => void;
}

export default function SettingsPage({ config, setConfig, updateConfig, onSave, error, onRerunWizard }: SettingsPageProps) {
  const [logs, setLogs] = useState<string>('');
  const [showLogs, setShowLogs] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[] | null>(null);
  const [selfSteamMsg, setSelfSteamMsg] = useState<string | null>(null);

  const handleAddSelfToSteam = async () => {
    setSelfSteamMsg(null);
    const res = await window.electronAPI!.addSelfToSteam();
    setSelfSteamMsg(res.success ? '✓ Added! Restart Steam to see ROMM-SD.' : `✗ ${res.error}`);
  };

  const fetchLogs = async () => {
    const l = await window.electronAPI!.getLogs();
    setLogs(l);
    setShowLogs(true);
  };

  const runDiagnostics = async () => {
    const homeDir = await window.electronAPI!.getHomeDir();
    const checks = [
      { name: 'ROMs Folder', path: config.emudeckPath.replace('~', homeDir) },
      { name: 'BIOS Folder', path: config.emudeckPath.replace('~', homeDir).replace('/roms', '/bios') },
      { name: 'Steam ROM Manager', path: `${homeDir}/.config/EmuDeck/backend/tools/launchers/srm` },
      { name: 'RetroArch (Flatpak)', path: `${homeDir}/.var/app/org.libretro.RetroArch` },
      { name: 'Yuzu (Flatpak)', path: `${homeDir}/.var/app/org.yuzu_emu.yuzu` },
      { name: 'Ryujinx (Flatpak)', path: `${homeDir}/.var/app/org.ryujinx.Ryujinx` },
      { name: 'Dolphin (Flatpak)', path: `${homeDir}/.var/app/org.DolphinEmu.dolphin-emu` },
      { name: 'PCSX2 (Flatpak)', path: `${homeDir}/.var/app/net.pcsx2.PCSX2` },
      { name: 'RPCS3 (Flatpak)', path: `${homeDir}/.var/app/net.rpcs3.RPCS3` },
      { name: 'DuckStation (Flatpak)', path: `${homeDir}/.var/app/org.duckstation.DuckStation` },
      { name: 'PPSSPP (Flatpak)', path: `${homeDir}/.var/app/org.ppsspp.PPSSPP` },
      { name: 'Citra (Flatpak)', path: `${homeDir}/.var/app/org.citra_emu.citra` },
      { name: 'mGBA (Flatpak)', path: `${homeDir}/.var/app/io.mgba.mGBA` },
      { name: 'Snes9x (Flatpak)', path: `${homeDir}/.var/app/org.snes9x.Snes9x` },
      { name: 'Simple64 (Flatpak)', path: `${homeDir}/.var/app/org.simple64.simple64-gui` },
    ];

    const results: DiagnosticResult[] = [];
    for (const check of checks) {
      const res = await window.electronAPI!.checkFileExists(check.path);
      results.push({ ...check, exists: res.exists });
    }
    setDiagnostics(results);
  };

  return (
    <div className="content-area">
      <h2>Settings</h2>
      {error && <div style={{ color: '#ff4444', marginBottom: '20px', background: 'rgba(255,0,0,0.1)', padding: '10px', borderRadius: '8px' }}>{error}</div>}

      <div className="settings-form">
        <EditableSetting
          label="RomM Server URL"
          hint="http://192.168.1.100:3000"
          value={config.url}
          onChange={e => setConfig({...config, url: e.target.value})}
        />
        <EditableSetting
          label="Username"
          hint="admin"
          value={config.username}
          onChange={e => setConfig({...config, username: e.target.value})}
        />
        <EditableSetting
          label="Password"
          hint="••••••••"
          type="password"
          revealable
          value={config.password}
          saved={!!config.password}
          onChange={e => setConfig({...config, password: e.target.value})}
        />
        <EditableSetting
          label="EmuDeck ROMs Folder Path"
          hint="~/Emulation/roms"
          value={config.emudeckPath}
          onChange={e => setConfig({...config, emudeckPath: e.target.value})}
        />
        <div className="settings-row">
          <span style={{ flex: '0 0 auto', minWidth: '180px', fontWeight: 500 }}>Grid Cover Size</span>
          <select
            tabIndex={0}
            value={config.gridSize || 'medium'}
            onChange={e => updateConfig({gridSize: e.target.value})}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>

        <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', marginTop: '10px', cursor: 'pointer', minWidth: 0 }}>
          <input
            type="checkbox"
            tabIndex={0}
            checked={config.showGameTitles !== false}
            onChange={e => updateConfig({showGameTitles: e.target.checked})}
            onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.currentTarget.checked = !e.currentTarget.checked; e.currentTarget.dispatchEvent(new Event('change', { bubbles: true })); } }}
            style={{ width: '18px', height: '18px', margin: 0, flex: '0 0 auto' }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 'bold' }}>Show Text on Game Tiles</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Display game titles and platforms underneath cover artwork.</div>
          </div>
        </label>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button className="btn btn-primary" tabIndex={0} onClick={onSave}>
            Save & Connect
          </button>
          <button className="btn" tabIndex={0} onClick={fetchLogs}>
            View System Logs
          </button>
          <button className="btn" tabIndex={0} onClick={runDiagnostics}>
            Run EmuDeck Diagnostics
          </button>
        </div>

        <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--panel-border)' }}>
          <div style={{ fontWeight: 600, marginBottom: '6px' }}>Add ROMM-SD to Steam</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Adds this app as a non-Steam game so you can launch it from Game Mode or Steam Big Picture.
          </div>
          <button className="btn" tabIndex={0} onClick={handleAddSelfToSteam}>
            + Add ROMM-SD to Steam
          </button>
          {selfSteamMsg && (
            <div style={{
              marginTop: '10px',
              padding: '10px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              background: selfSteamMsg.startsWith('✓') ? 'rgba(76,175,80,0.15)' : 'rgba(255,68,68,0.15)',
              color: selfSteamMsg.startsWith('✓') ? '#4caf50' : '#ff4444',
            }}>
              {selfSteamMsg}
            </div>
          )}
        </div>

        <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--panel-border)' }}>
          <div style={{ fontWeight: 600, marginBottom: '6px' }}>Setup Wizard</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Re-run the first-time setup wizard to reconfigure your server, ROMs path, or test the connection.
          </div>
          <button className="btn" tabIndex={0} onClick={onRerunWizard}>
            Re-run Setup Wizard
          </button>
        </div>

        <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--panel-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontWeight: 600 }}>Experimental</span>
            <span style={{
              fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px',
              background: 'rgba(255, 152, 0, 0.18)', color: '#ff9800',
              padding: '2px 8px', borderRadius: '4px', fontWeight: 700,
            }}>EXPERIMENTAL</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
            These features are off by default. Enable at your own risk — they may not work in all setups.
          </div>

          <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', marginTop: '10px', cursor: 'pointer', minWidth: 0 }}>
            <input
              type="checkbox"
              tabIndex={0}
              checked={!!config.saveSyncEnabled}
              onChange={e => updateConfig({saveSyncEnabled: e.target.checked})}
              onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.currentTarget.checked = !e.currentTarget.checked; e.currentTarget.dispatchEvent(new Event('change', { bubbles: true })); } }}
              style={{ width: '18px', height: '18px', margin: 0, flex: '0 0 auto' }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 'bold' }}>Save Sync</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Track and version every game's save files locally
                (<code style={{ color: 'var(--accent-color)' }}>~/.config/emudeck-romm-connector/saves/</code>).
                Detects conflicts before overwriting and auto-pushes when the emulator writes.
                Adds a "Cloud Saves" tab with push/pull controls.
              </div>
            </div>
          </label>

          <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', marginTop: '14px', cursor: 'pointer', minWidth: 0 }}>
            <input
              type="checkbox"
              tabIndex={0}
              checked={!!config.browserPlayEnabled}
              onChange={e => updateConfig({browserPlayEnabled: e.target.checked})}
              onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.currentTarget.checked = !e.currentTarget.checked; e.currentTarget.dispatchEvent(new Event('change', { bubbles: true })); } }}
              style={{ width: '18px', height: '18px', margin: 0, flex: '0 0 auto' }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 'bold' }}>Browser Play (no download)</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Adds a "Play in Browser" option to game cards. When clicked, ROMM-SD
                <strong style={{ color: 'var(--text-main)' }}> auto-logs you into RomM</strong> using
                the credentials from this app and opens a streaming window powered by
                RomM's emulatorjs. No download, no disk usage — your gamepad still drives
                the in-stream emulator. Limited to cores emulatorjs supports (NES, SNES,
                GB/GBA, Genesis, PSX, NDS, etc — not GameCube, Wii, Switch, PS2/PSP).
              </div>
            </div>
          </label>

          <div style={{ marginTop: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontWeight: 500 }}>BIOS Install Layout</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>EmuDeck convention</span>
            </div>
            <select
              tabIndex={0}
              value={config.biosLayout || 'emudeck'}
              onChange={e => updateConfig({biosLayout: e.target.value})}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
            >
              <option value="emudeck">EmuDeck — per-platform subfolder (recommended)</option>
              <option value="flat">Flat — all files in BIOS root (RetroArch default)</option>
            </select>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              "Per-platform subfolder" puts each file in <code>Emulation/bios/&lt;platform&gt;/</code> so
              Dolphin, PCSX2, DuckStation, etc. find them. Switch keys are always written to Yuzu &
              Ryujinx's config dirs regardless of this setting.
            </div>
          </div>
        </div>

        {diagnostics && (
          <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0 }}>Diagnostic Results</h3>
            {diagnostics.map(d => (
              <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                <span>{d.name}</span>
                <span style={{ color: d.exists ? '#4caf50' : '#ff4444' }}>{d.exists ? 'Found ✓' : 'Missing ✗'}</span>
              </div>
            ))}
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '10px' }}>
              Note: Missing Flatpaks are fine if you don't use those emulators!
            </div>
          </div>
        )}
      </div>

      {showLogs && (
        <div className="modal-overlay" onClick={() => setShowLogs(false)}>
          <div className="modal" style={{ maxWidth: '800px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <h2>System Logs</h2>
            <pre style={{ background: '#111', padding: '10px', borderRadius: '8px', maxHeight: '400px', overflowY: 'auto', fontSize: '0.8rem', color: '#ccc', whiteSpace: 'pre-wrap' }}>
              {logs || "No logs available."}
            </pre>
            <button className="btn" tabIndex={0} onClick={() => setShowLogs(false)} style={{ marginTop: '20px' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
