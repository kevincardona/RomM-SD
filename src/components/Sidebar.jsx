import React from 'react';
import Focusable from './Focusable';

const ALL_TABS = [
  { id: 'library_all', label: 'My Library' },
  { id: 'downloaded',  label: 'Ready to Play' },
  { id: 'collections', label: 'Collections' },
  { id: 'savesync',    label: 'Cloud Saves', experimental: true, requiresFlag: 'saveSyncEnabled' },
  { id: 'firmware',    label: 'BIOS / Firmware' },
  { id: 'settings',    label: 'Settings' },
];

export default function Sidebar({ activeTab, setActiveTab, config }) {
  const tabs = ALL_TABS.filter(t => {
    if (!t.requiresFlag) return true;
    return !!config?.[t.requiresFlag];
  });

  return (
    <div className="sidebar">
      <div className="sidebar-header">ROMM-SD</div>

      {tabs.map(t => (
        <Focusable
          key={t.id}
          className={`nav-item ${activeTab === t.id ? 'active' : ''}`}
          onActivate={() => setActiveTab(t.id)}
        >
          {t.label}
        </Focusable>
      ))}
    </div>
  );
}
