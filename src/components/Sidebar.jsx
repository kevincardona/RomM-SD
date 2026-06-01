import React from 'react';
import Focusable from './Focusable';

const PRIMARY_TABS = [
  { id: 'library_all', label: 'My Library' },
  { id: 'collections', label: 'Collections' },
  { id: 'savesync',    label: 'Cloud Saves' },
  { id: 'downloaded',  label: 'Ready to Play' },
  { id: 'firmware',    label: 'BIOS / Firmware' },
  { id: 'settings',    label: 'Settings' },
];

export default function Sidebar({ activeTab, setActiveTab }) {
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
    </div>
  );
}
