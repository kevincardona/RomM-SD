import React, { useState } from 'react';
import SetupPage from './SetupPage';
import FirmwarePage from './FirmwarePage';
import type { Config } from '../vite-env';

type SubTab = 'emulators' | 'firmware';

interface EmulatorsPageProps {
  config: Config;
}

export default function EmulatorsPage({ config }: EmulatorsPageProps) {
  const [subTab, setSubTab] = useState<SubTab>('emulators');

  return (
    <>
      <div className="topbar" style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
        <h2 style={{ margin: 0, marginRight: '24px', flex: '0 0 auto' }}>Emulators</h2>
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['emulators', 'firmware'] as SubTab[]).map(tab => (
            <button
              key={tab}
              tabIndex={0}
              onClick={() => setSubTab(tab)}
              style={{
                padding: '6px 14px',
                fontSize: '0.85rem',
                borderRadius: '6px',
                border: '1px solid',
                cursor: 'pointer',
                background: subTab === tab ? 'var(--accent-color)' : 'transparent',
                color: subTab === tab ? '#000' : 'var(--text-muted)',
                borderColor: subTab === tab ? 'var(--accent-color)' : 'var(--panel-border)',
                fontWeight: subTab === tab ? 600 : 400,
                transition: 'all 0.15s',
              }}
            >
              {tab === 'emulators' ? 'Emulators' : 'BIOS & Firmware'}
            </button>
          ))}
        </div>
      </div>

      {subTab === 'emulators' && (
        <SetupPage onGoToFirmware={() => setSubTab('firmware')} />
      )}
      {subTab === 'firmware' && (
        <FirmwarePage config={config} embedded />
      )}
    </>
  );
}
