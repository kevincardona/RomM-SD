import React, { useState, useEffect } from 'react';

export default function SettingsPage({ config, setConfig, onSave, error }) {
  const [logs, setLogs] = useState('');
  const [showLogs, setShowLogs] = useState(false);
  const [diagnostics, setDiagnostics] = useState(null);
  const [selfSteamMsg, setSelfSteamMsg] = useState(null);

  const handleAddSelfToSteam = async () => {
    setSelfSteamMsg(null);
    const res = await window.electronAPI.addSelfToSteam();
    setSelfSteamMsg(res.success ? '✓ Added! Restart Steam to see ROMM-SD.' : `✗ ${res.error}`);
  };

  const fetchLogs = async () => {
    const l = await window.electronAPI.getLogs();
    setLogs(l);
    setShowLogs(true);
  };

  const runDiagnostics = async () => {
    const homeDir = await window.electronAPI.getHomeDir();
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
    
    const results = [];
    for (const check of checks) {
      const res = await window.electronAPI.checkFileExists(check.path);
      results.push({ ...check, exists: res.exists });
    }
    setDiagnostics(results);
  };

  return (
    <div className="content-area">
      <h2>Settings</h2>
      {error && <div style={{ color: '#ff4444', marginBottom: '20px', background: 'rgba(255,0,0,0.1)', padding: '10px', borderRadius: '8px' }}>{error}</div>}
      
      <div className="settings-form">
        <label>
          RomM Server URL
          <input 
            type="text" 
            placeholder="http://192.168.1.100:3000" 
            tabIndex={0}
            value={config.url}
            onChange={e => setConfig({...config, url: e.target.value})}
          />
        </label>
        <label>
          Username
          <input 
            type="text" 
            placeholder="admin" 
            tabIndex={0}
            value={config.username}
            onChange={e => setConfig({...config, username: e.target.value})}
          />
        </label>
        <label>
          Password
          <input 
            type="password" 
            placeholder="••••••••" 
            tabIndex={0}
            value={config.password}
            onChange={e => setConfig({...config, password: e.target.value})}
          />
        </label>
        <label>
          EmuDeck ROMs Folder Path
          <input 
            type="text" 
            placeholder="~/Emulation/roms" 
            tabIndex={0}
            value={config.emudeckPath}
            onChange={e => setConfig({...config, emudeckPath: e.target.value})}
          />
        </label>
        <label>
          Grid Cover Size
          <select 
            tabIndex={0}
            value={config.gridSize || 'medium'} 
            onChange={e => setConfig({...config, gridSize: e.target.value})}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </label>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={config.showGameTitles !== false}
            onChange={e => setConfig({...config, showGameTitles: e.target.checked})}
            style={{ width: '18px', height: '18px', margin: 0 }}
          />
          <div>
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
