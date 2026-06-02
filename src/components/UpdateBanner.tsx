import { useEffect, useState, useCallback } from 'react';
import type { UpdateAvailableInfo, UpdateProgressInfo, CheckForUpdatesResult } from '../vite-env';

type UpdateState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'available'; info: UpdateAvailableInfo }
  | { kind: 'not-available'; version: string }
  | { kind: 'downloading'; info: UpdateAvailableInfo; progress: UpdateProgressInfo | null }
  | { kind: 'ready'; version: string }
  | { kind: 'error'; message: string };

interface UpdateBannerProps {
  currentVersion?: string;
}

function formatBytes(n: number): string {
  if (!n) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function UpdateBanner({ currentVersion }: UpdateBannerProps) {
  const [state, setState] = useState<UpdateState>({ kind: 'idle' });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!window.electronAPI) return;
    const offs = [
      window.electronAPI.onUpdateChecking(() => setState({ kind: 'checking' })),
      window.electronAPI.onUpdateAvailable((info) => setState({ kind: 'available', info })),
      window.electronAPI.onUpdateNotAvailable((info) => setState({ kind: 'not-available', version: info.version })),
      window.electronAPI.onUpdateProgress((progress) => {
        setState((prev) => prev.kind === 'available' || prev.kind === 'downloading'
          ? { kind: 'downloading', info: prev.info, progress }
          : prev);
      }),
      window.electronAPI.onUpdateDownloaded((info) => setState({ kind: 'ready', version: info.version })),
      window.electronAPI.onUpdateError(({ message }) => setState({ kind: 'error', message })),
    ];
    return () => { offs.forEach(off => { try { off && off(); } catch {} }); };
  }, []);

  const checkNow = useCallback(async () => {
    if (!window.electronAPI) return;
    setDismissed(false);
    setState({ kind: 'checking' });
    const res: CheckForUpdatesResult = await window.electronAPI.checkForUpdates();
    if (!res.supported) {
      setState({ kind: 'not-available', version: currentVersion || '' });
      return;
    }
    if (res.error) {
      setState({ kind: 'error', message: res.error });
      return;
    }
    if (res.updateInfo) {
      setState({ kind: 'available', info: res.updateInfo });
    } else {
      setState({ kind: 'not-available', version: currentVersion || '' });
    }
  }, [currentVersion]);

  const download = useCallback(async () => {
    if (!window.electronAPI) return;
    const res = await window.electronAPI.downloadUpdate();
    if (!res.success) setState({ kind: 'error', message: res.error || 'Download failed' });
  }, []);

  const install = useCallback(() => {
    window.electronAPI?.installUpdate();
  }, []);

  if (state.kind === 'idle' || state.kind === 'not-available' || dismissed) return null;

  const styles: Record<string, React.CSSProperties> = {
    wrap: {
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '10px 16px', marginBottom: '12px', borderRadius: '8px',
      border: '1px solid var(--panel-border)', fontSize: '0.9rem',
    },
    label: { fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', padding: '2px 6px', borderRadius: '3px', fontWeight: 700 },
    primaryBtn: {
      padding: '6px 12px', background: 'var(--accent-color)', color: '#000',
      border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
    },
    secondaryBtn: {
      padding: '6px 12px', background: 'rgba(255,255,255,0.1)', color: 'var(--text-main)',
      border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem',
    },
    closeBtn: {
      marginLeft: 'auto', background: 'transparent', color: 'var(--text-muted)',
      border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0 4px',
    },
  };

  if (state.kind === 'checking') {
    return (
      <div style={{ ...styles.wrap, background: 'rgba(0, 229, 255, 0.06)' }}>
        <span style={{ color: 'var(--accent-color)' }}>⟳</span>
        <span>Checking for updates…</span>
        <button style={styles.closeBtn} onClick={() => setDismissed(true)}>×</button>
      </div>
    );
  }

  if (state.kind === 'available') {
    return (
      <div style={{ ...styles.wrap, background: 'rgba(0, 229, 255, 0.06)', borderColor: 'rgba(0, 229, 255, 0.25)' }}>
        <span style={{ ...styles.label, background: 'rgba(0, 229, 255, 0.18)', color: '#00e5ff' }}>UPDATE</span>
        <span style={{ flex: 1 }}>
          ROMM-SD <strong>v{state.info.version}</strong> is available.
        </span>
        <button style={styles.primaryBtn} onClick={download}>Download</button>
        <button style={styles.closeBtn} onClick={() => setDismissed(true)}>×</button>
      </div>
    );
  }

  if (state.kind === 'downloading') {
    const pct = state.progress?.percent ?? 0;
    return (
      <div style={{ ...styles.wrap, background: 'rgba(0, 229, 255, 0.06)', borderColor: 'rgba(0, 229, 255, 0.25)' }}>
        <span style={{ ...styles.label, background: 'rgba(0, 229, 255, 0.18)', color: '#00e5ff' }}>DOWNLOADING</span>
        <span style={{ flex: 1 }}>
          Downloading v{state.info.version}… {Math.round(pct)}%
          {state.progress && state.progress.total > 0 && (
            <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>
              ({formatBytes(state.progress.transferred)} / {formatBytes(state.progress.total)})
            </span>
          )}
        </span>
        <div style={{ width: '140px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${Math.max(pct, 2)}%`, height: '100%', background: 'var(--accent-color)' }} />
        </div>
      </div>
    );
  }

  if (state.kind === 'ready') {
    return (
      <div style={{ ...styles.wrap, background: 'rgba(76, 175, 80, 0.06)', borderColor: 'rgba(76, 175, 80, 0.25)' }}>
        <span style={{ ...styles.label, background: 'rgba(76, 175, 80, 0.18)', color: '#4caf50' }}>READY</span>
        <span style={{ flex: 1 }}>
          v{state.version} downloaded. Restart to install.
        </span>
        <button style={styles.primaryBtn} onClick={install}>Restart &amp; Install</button>
        <button style={styles.closeBtn} onClick={() => setDismissed(true)}>×</button>
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div style={{ ...styles.wrap, background: 'rgba(255, 68, 68, 0.06)', borderColor: 'rgba(255, 68, 68, 0.25)' }}>
        <span style={{ ...styles.label, background: 'rgba(255, 68, 68, 0.18)', color: '#ff6b6b' }}>ERROR</span>
        <span style={{ flex: 1 }}>Update failed: {state.message}</span>
        <button style={styles.secondaryBtn} onClick={checkNow}>Retry</button>
        <button style={styles.closeBtn} onClick={() => setDismissed(true)}>×</button>
      </div>
    );
  }

  return null;
}
