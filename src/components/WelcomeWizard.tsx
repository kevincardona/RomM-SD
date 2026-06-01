import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import type { Config } from '../vite-env';

const STEPS = {
  WELCOME: 'welcome',
  SERVER: 'server',
  ROMS: 'roms',
  SUCCESS: 'success',
} as const;

type StepId = typeof STEPS[keyof typeof STEPS];

const ORDER: StepId[] = [STEPS.WELCOME, STEPS.SERVER, STEPS.ROMS, STEPS.SUCCESS];

interface WelcomeWizardProps {
  onComplete: (config: Partial<Config>) => void | Promise<void>;
  initialConfig?: Config;
  onTestConnection: (creds: { url: string; username: string; password: string }) => Promise<boolean>;
  onClose?: () => void;
}

export default function WelcomeWizard({ onComplete, initialConfig, onTestConnection, onClose }: WelcomeWizardProps) {
  const [step, setStep] = useState<StepId>(STEPS.WELCOME);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testOk, setTestOk] = useState(false);
  const [showWizardPassword, setShowWizardPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState<boolean>(!!(initialConfig?.password));
  const [config, setConfig] = useState({
    url: initialConfig?.url || 'http://',
    username: initialConfig?.username || '',
    password: initialConfig?.password || '',
  });
  const [romsPath, setRomsPath] = useState<string>(initialConfig?.emudeckPath || '~/Emulation/roms');

  const stepIndex = ORDER.indexOf(step);

  const next = () => {
    const i = ORDER.indexOf(step);
    if (i < ORDER.length - 1) setStep(ORDER[i + 1]);
  };
  const prev = () => {
    const i = ORDER.indexOf(step);
    if (i > 0) setStep(ORDER[i - 1]);
  };
  const closeOrPrev = () => {
    if (stepIndex === 0) {
      if (onClose) onClose();
    } else {
      prev();
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeOrPrev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stepIndex]);

  const test = async () => {
    setTesting(true);
    setTestError(null);
    setTestOk(false);
    try {
      const ok = await onTestConnection(config);
      if (ok) { setTestOk(true); setPasswordSaved(true); }
      else setTestError('Could not reach the server. Check the URL and try again.');
    } catch (e: any) {
      setTestError(e.message);
    }
    setTesting(false);
  };

  const finish = () => {
    onComplete({ ...config, emudeckPath: romsPath });
  };

  const Indicator = () => (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
      {ORDER.map((s, i) => (
        <div
          key={s}
          style={{
            width: i === stepIndex ? '32px' : '12px',
            height: '4px',
            borderRadius: '2px',
            background: i <= stepIndex ? 'var(--accent-color)' : 'rgba(255,255,255,0.15)',
            transition: 'width 0.3s, background 0.3s',
          }}
        />
      ))}
    </div>
  );

  return (
    <Modal width="560px" maxWidth="90vw" onClose={() => {}}>
      {() => (
        <div style={{ minHeight: '380px', display: 'flex', flexDirection: 'column' }}>          <Indicator />

          {step === STEPS.WELCOME && (
            <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🎮</div>
              <h2 style={{ margin: '0 0 12px', fontSize: '2rem' }}>Welcome to ROMM-SD</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.6, maxWidth: '400px', margin: '0 auto' }}>
                A game launcher for your <strong style={{ color: 'white' }}>RomM</strong> library, designed for the Steam Deck.
                Browse your collection, download games, launch emulators — all from your couch.
              </p>
            </div>
          )}

          {step === STEPS.SERVER && (
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: '0 0 8px' }}>Connect to your server</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.9rem' }}>
                Enter the address of your RomM server and your login.
              </p>

              <label style={{ display: 'block', marginBottom: '16px' }}>
                <div style={{ marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Server URL</div>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  placeholder="http://192.168.1.100:3000"
                  tabIndex={0}
                  value={config.url}
                  onChange={e => setConfig({ ...config, url: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') test(); }}
                  autoFocus
                />
              </label>

              <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', marginBottom: '16px', minWidth: 0 }}>
                <label style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Username</div>
                  <input
                    type="text"
                    className="search-input"
                    style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}
                    placeholder="admin"
                    tabIndex={0}
                    value={config.username}
                    onChange={e => setConfig({ ...config, username: e.target.value })}
                  />
                </label>
                <label style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span>Password</span>
                    {passwordSaved && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent-color)' }}>✓ saved</span>
                    )}
                  </div>
                  <div className="password-field">
                    <input
                      type={showWizardPassword ? 'text' : 'password'}
                      className="search-input"
                      style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}
                      placeholder={passwordSaved ? '•••••••• (leave blank to keep current)' : '••••••••'}
                      tabIndex={0}
                      value={config.password}
                      onChange={e => setConfig({ ...config, password: e.target.value })}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      tabIndex={0}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowWizardPassword(p => !p); }}
                      aria-label={showWizardPassword ? 'Hide password' : 'Show password'}
                    >
                      {showWizardPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8-4 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      )}
                    </button>
                  </div>
                </label>
              </div>

              {testError && (
                <div style={{ padding: '10px 12px', background: 'rgba(255,0,0,0.15)', color: '#ff6b6b', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '12px' }}>
                  {testError}
                </div>
              )}
              {testOk && (
                <div style={{ padding: '10px 12px', background: 'rgba(76,175,80,0.15)', color: '#4caf50', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '12px' }}>
                  ✓ Connected successfully!
                </div>
              )}

              <button
                className="btn"
                style={{ width: '100%' }}
                tabIndex={0}
                onClick={test}
                disabled={testing || !config.url}
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
          )}

          {step === STEPS.ROMS && (
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: '0 0 8px' }}>Where are your games?</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.9rem' }}>
                ROMM-SD needs to know where to download ROMs and check which games are already on disk.
                The default works for most EmuDeck installs.
              </p>

              <label style={{ display: 'block', marginBottom: '16px' }}>
                <div style={{ marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>ROMs folder</div>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  tabIndex={0}
                  value={romsPath}
                  onChange={e => setRomsPath(e.target.value)}
                  autoFocus
                />
              </label>

              <div style={{ padding: '12px 16px', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <strong style={{ color: 'var(--accent-color)' }}>Tip:</strong> On a Steam Deck with EmuDeck, the default is usually correct. You can change this later in Settings.
              </div>
            </div>
          )}

          {step === STEPS.SUCCESS && (
            <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>✓</div>
              <h2 style={{ margin: '0 0 12px', fontSize: '2rem' }}>You're all set</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.6, maxWidth: '400px', margin: '0 auto 24px' }}>
                Your library is loading. You can browse games, download them, and launch emulators from anywhere in the app.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', textAlign: 'left', maxWidth: '400px', margin: '0 auto' }}>
                <ControllerHint button="A" label="Confirm" />
                <ControllerHint button="B" label="Back" />
                <ControllerHint button="Y" label="Search" />
                <ControllerHint button="LT/RT" label="Jump letter" />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '24px' }}>
            <button
              className="btn"
              style={{ flex: 1 }}
              tabIndex={0}
              onClick={closeOrPrev}
            >
              {stepIndex === 0 ? 'Skip' : 'Back'}
            </button>
            {step !== STEPS.SUCCESS ? (
              <button
                className="btn btn-primary"
                style={{ flex: 2 }}
                tabIndex={0}
                onClick={next}
                disabled={step === STEPS.SERVER && !testOk}
              >
                {step === STEPS.ROMS ? 'Finish' : 'Next'}
              </button>
            ) : (
              <button
                className="btn btn-primary"
                style={{ flex: 2 }}
                tabIndex={0}
                onClick={finish}
                autoFocus
              >
                Start using ROMM-SD
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function ControllerHint({ button, label }: { button: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
      <span style={{
        background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '4px', padding: '2px 8px', fontWeight: 600, color: 'var(--accent-color)',
        minWidth: '40px', textAlign: 'center', fontSize: '0.75rem',
      }}>{button}</span>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
    </div>
  );
}
