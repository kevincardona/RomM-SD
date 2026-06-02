import React, { useEffect, useState, useCallback, useMemo } from 'react';
import type { Prereq, PrereqCheckResult } from '../vite-env';

function StatusDot({ installed, viaFlatpak, viaEmuDeck }: { installed: boolean; viaFlatpak: boolean; viaEmuDeck: boolean }) {
  const color = installed ? '#4caf50' : '#ff6b6b';
  const label = installed
    ? (viaFlatpak && viaEmuDeck ? 'Installed (Flatpak + EmuDeck)'
       : viaFlatpak ? 'Installed (Flatpak)'
       : viaEmuDeck ? 'Installed (EmuDeck)'
       : 'Installed')
    : 'Not installed';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <span style={{
        width: '10px', height: '10px', borderRadius: '50%',
        background: color, boxShadow: `0 0 8px ${color}55`,
        flex: '0 0 auto',
      }} />
      <span style={{ fontSize: '0.85rem', color, fontWeight: 500 }}>{label}</span>
    </span>
  );
}

function BiosBadge({ exists }: { exists: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px',
      background: exists ? 'rgba(76,175,80,0.15)' : 'rgba(255,152,0,0.15)',
      color: exists ? '#4caf50' : '#ff9800',
      fontWeight: 600, letterSpacing: '0.4px',
    }}>
      {exists ? '✓ BIOS present' : '⚠ BIOS needed'}
    </span>
  );
}

function PrereqCard({ p, onInstall, onGoToFirmware }: { p: Prereq; onInstall: (url: string) => void; onGoToFirmware?: () => void; }) {
  const pathHint = p.installed ? p.flatpakPath || p.emudeckPath || null : null;
  const showBios = p.installed && (p.biosDir || p.biosNote);
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      gap: '16px',
      alignItems: 'start',
      padding: '14px 16px',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid var(--panel-border)',
      borderRadius: '8px',
      minWidth: 0,
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '4px' }}>
          <span style={{ fontWeight: 600, fontSize: '1rem' }}>{p.name}</span>
          <StatusDot installed={p.installed} viaFlatpak={p.viaFlatpak} viaEmuDeck={p.viaEmuDeck} />
          {showBios && p.biosDir && <BiosBadge exists={p.biosDirExists} />}
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{p.description}</div>
        {p.flatpakRemoved && !p.installed && (
          <div style={{ fontSize: '0.78rem', color: '#ff9800', marginTop: '4px', lineHeight: 1.4 }}>
            ⚠ No longer on Flathub. Install via EmuDeck (recommended).
          </div>
        )}
        {pathHint && (
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '6px', wordBreak: 'break-all' }}>
            {pathHint}
          </div>
        )}
        {showBios && (
          <div style={{
            marginTop: '10px',
            padding: '8px 10px',
            background: 'rgba(0,229,255,0.05)',
            border: '1px solid rgba(0,229,255,0.15)',
            borderRadius: '6px',
            fontSize: '0.78rem',
          }}>
            {p.biosDir && (
              <div style={{ fontFamily: 'monospace', color: 'var(--accent-color)', marginBottom: p.biosNote ? '4px' : 0, wordBreak: 'break-all' }}>
                {p.biosDir}
              </div>
            )}
            {p.biosNote && (
              <div style={{ color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {p.biosNote}
                {onGoToFirmware && (
                  <button
                    className="btn"
                    tabIndex={0}
                    onClick={onGoToFirmware}
                    style={{ marginLeft: '8px', padding: '2px 8px', fontSize: '0.75rem', display: 'inline' }}
                  >
                    Open Firmware →
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <div style={{ flex: '0 0 auto', paddingTop: '2px' }}>
        {p.installed ? (
          <button
            className="btn"
            tabIndex={0}
            onClick={() => onInstall(p.installUrl)}
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            aria-label={`Open ${p.name} page`}
          >
            Details
          </button>
        ) : (
          <button
            className="btn btn-primary"
            tabIndex={0}
            onClick={() => onInstall(p.installUrl)}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            aria-label={`Install ${p.name}`}
          >
            Get
          </button>
        )}
      </div>
    </div>
  );
}

function groupByCategory(prereqs: Prereq[]) {
  const order = ['system', 'meta', 'multi', 'emulator'];
  const groups: Record<string, Prereq[]> = {};
  for (const p of prereqs) {
    if (!groups[p.category]) groups[p.category] = [];
    groups[p.category].push(p);
  }
  return order
    .filter(cat => groups[cat] && groups[cat].length > 0)
    .map(cat => ({ category: cat, items: groups[cat] }));
}

const CATEGORY_TITLES: Record<string, string> = {
  system: 'System',
  meta: 'Recommended',
  multi: 'Multi-system',
  emulator: 'Emulators',
};

export default function SetupPage({ onGoToFirmware }: { onGoToFirmware?: () => void }) {
  const [result, setResult] = useState<PrereqCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runCheck = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.electronAPI!.checkPrerequisites();
      if (!res.success) throw new Error(res.error || 'Unknown error');
      setResult(res);
    } catch (e: any) {
      setError(e.message || String(e));
    }
    setLoading(false);
  }, []);

  useEffect(() => { runCheck(); }, [runCheck]);

  const handleInstall = useCallback(async (url: string) => {
    setOpening(url);
    setError(null);
    try {
      const res = await window.electronAPI!.openExternal(url);
      if (!res.success) setError(res.error || 'Could not open URL.');
    } catch (e: any) {
      setError(e.message || String(e));
    }
    setOpening(null);
  }, []);

  const grouped = useMemo(() => groupByCategory(result?.prereqs || []), [result]);
  const installedCount = (result?.prereqs || []).filter(p => p.installed).length;
  const totalCount = (result?.prereqs || []).length;
  const hasFlatpak = (result?.prereqs || []).find(p => p.id === 'flatpak')?.installed;
  const hasEmuDeck = (result?.prereqs || []).find(p => p.id === 'emudeck')?.installed;

  return (
    <div className="content-area">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>Setup &amp; Prerequisites</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {!loading && totalCount > 0 && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {installedCount} of {totalCount} installed
            </span>
          )}
          <button className="btn" tabIndex={0} onClick={runCheck} disabled={loading}>
            {loading ? 'Checking…' : 'Refresh'}
          </button>
        </div>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, marginTop: '8px' }}>
        ROMM-SD launches games through system emulators. Install whichever ones you need —
        the <strong style={{ color: 'var(--text-main)' }}>Get</strong> button opens the official source in your browser.
        If you have EmuDeck, most emulators are already there. If you don't, we recommend
        starting with <strong style={{ color: 'var(--text-main)' }}>Flatpak</strong> + the per-emulator Flathub pages.
      </p>

      {hasFlatpak === false && !loading && (
        <div style={{
          padding: '12px 14px',
          background: 'rgba(255, 152, 0, 0.10)',
          border: '1px solid rgba(255, 152, 0, 0.35)',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '0.88rem',
          lineHeight: 1.5,
        }}>
          <strong style={{ color: '#ff9800' }}>Flatpak isn't installed.</strong>{' '}
          Most emulators below are delivered via Flathub, so install Flatpak first
          (or use EmuDeck, which handles it for you).
        </div>
      )}

      {hasEmuDeck && !loading && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(76, 175, 80, 0.10)',
          border: '1px solid rgba(76, 175, 80, 0.30)',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '0.88rem',
        }}>
          ✓ EmuDeck detected — you can launch games with ROMM-SD's "Add to Steam" button.
        </div>
      )}

      {error && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(255, 68, 68, 0.12)',
          color: '#ff6b6b',
          border: '1px solid rgba(255, 68, 68, 0.35)',
          borderRadius: '6px',
          marginBottom: '14px',
          fontSize: '0.88rem',
        }}>
          {error}
        </div>
      )}

      {loading && !result && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Scanning your system…
        </div>
      )}

      {grouped.map(group => (
        <section key={group.category} style={{ marginTop: '24px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {CATEGORY_TITLES[group.category] || group.category}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {group.items.map(p => (
              <PrereqCard
                key={p.id}
                p={p}
                onInstall={(url) => {
                  if (opening) return;
                  handleInstall(url);
                }}
                onGoToFirmware={onGoToFirmware}
              />
            ))}
          </div>
        </section>
      ))}

      {result?.emudeckLaunchersDir && (
        <div style={{ marginTop: '28px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <div>EmuDeck launchers scanned at <code style={{ color: 'var(--accent-color)' }}>{result.emudeckLaunchersDir}</code></div>
          <div>Flatpak apps scanned at <code style={{ color: 'var(--accent-color)' }}>{result.flatpakBase}</code></div>
        </div>
      )}
    </div>
  );
}
