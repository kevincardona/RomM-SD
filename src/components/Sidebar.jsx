import React, { useState } from 'react';
import Focusable from './Focusable';

const PRIMARY_TABS = [
  { id: 'library_all', label: 'My Library' },
  { id: 'collections', label: 'Collections' },
  { id: 'savesync',    label: 'Cloud Saves' },
  { id: 'downloaded',  label: 'Ready to Play' },
  { id: 'firmware',    label: 'BIOS / Firmware' },
  { id: 'settings',    label: 'Settings' },
];

export default function Sidebar({ activeTab, setActiveTab, library, selectedPlatform, setSelectedPlatform }) {
  const [showPlatforms, setShowPlatforms] = useState(true);
  const platforms = Object.keys(library.platforms).sort();

  return (
    <div className="sidebar">
      <div className="sidebar-header">ROMM-SD</div>

      {PRIMARY_TABS.map(t => (
        <Focusable
          key={t.id}
          className={`nav-item ${activeTab === t.id ? 'active' : ''}`}
          onActivate={() => setActiveTab(t.id)}
        >
          {t.label}
        </Focusable>
      ))}

      <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
        <Focusable
          className="nav-item"
          style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '5px', display: 'flex', justifyContent: 'space-between', padding: '5px 20px', background: 'transparent' }}
          onActivate={() => setShowPlatforms(v => !v)}
        >
          PLATFORMS <span>{showPlatforms ? '▼' : '▶'}</span>
        </Focusable>
        {showPlatforms && platforms.map(p => (
          <Focusable
            key={p}
            className={`nav-item ${selectedPlatform === p && activeTab === 'platforms' ? 'active' : ''}`}
            onActivate={() => { setActiveTab('platforms'); setSelectedPlatform(p); }}
            style={{ fontSize: '0.9rem', padding: '10px 20px', paddingLeft: '30px' }}
          >
            {p}
          </Focusable>
        ))}
      </div>
    </div>
  );
}
