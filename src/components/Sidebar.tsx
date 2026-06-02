import React from 'react';
import Focusable from './Focusable';
import type { Config, Tab } from '../vite-env';

interface TabDef {
  id: Tab;
  label: string;
  experimental?: boolean;
  requiresFlag?: keyof Config;
}

const ALL_TABS: TabDef[] = [
  { id: 'library_all', label: 'My Library' },
  { id: 'downloaded',  label: 'Ready to Play' },
  { id: 'collections', label: 'Collections' },
  { id: 'emulators',   label: 'Emulators' },
  { id: 'savesync',    label: 'Cloud Saves', experimental: true, requiresFlag: 'saveSyncEnabled' },
  { id: 'settings',    label: 'Settings' },
];

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  config?: Config;
}

export default function Sidebar({ activeTab, setActiveTab, config }: SidebarProps) {
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
