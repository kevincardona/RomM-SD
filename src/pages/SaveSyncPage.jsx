import React, { useState, useEffect, useRef } from 'react';

export default function SaveSyncPage() {
  const [syncing, setSyncing] = useState(false);
  const [log, setLog] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const firstBtnRef = useRef(null);

  useEffect(() => { firstBtnRef.current?.focus(); }, []);

  const runSync = async (action) => {
    setSyncing(true);
    setError(null);
    setSuccess(false);
    setLog(`Initializing EmuDeck Cloud Sync (${action})...\nThis may take a moment. Please wait.\n\n`);

    try {
      const res = await window.electronAPI.runCloudSync(action);
      if (res.success) { setLog(prev => prev + res.log); setSuccess(true); }
      else setError(res.error);
    } catch (err) { setError(err.message); }
    setSyncing(false);
  };

  return (
    <>
      <div className="topbar">
        <h2 style={{ margin: 0 }}>EmuDeck Cloud Saves</h2>
      </div>
      <div className="content-area">
        <div style={{ maxWidth: '800px' }}>
          <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0 }}>Sync your Save Files</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              ROMM-SD integrates natively with EmuDeck's Cloud Sync. If you have Cloud Sync set up in EmuDeck (Google Drive, Dropbox, OneDrive, etc.), you can manually push or pull your save files here.
            </p>

            <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
              <button
                ref={firstBtnRef}
                className="btn btn-primary"
                disabled={syncing}
                onClick={() => runSync('upload')}
                style={{ flex: 1, padding: '15px' }}
              >
                {syncing ? 'Syncing...' : 'Push Saves to Cloud'}
              </button>
              <button
                className="btn"
                disabled={syncing}
                onClick={() => runSync('download')}
                style={{ flex: 1, padding: '15px' }}
              >
                {syncing ? 'Syncing...' : 'Pull Saves from Cloud'}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ padding: '15px', background: 'rgba(255,0,0,0.2)', color: '#ff4444', borderRadius: '8px', marginBottom: '20px' }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {success && (
            <div style={{ padding: '15px', background: 'rgba(76,175,80,0.2)', color: '#4caf50', borderRadius: '8px', marginBottom: '20px' }}>
              <strong>Success:</strong> Cloud Sync completed successfully!
            </div>
          )}

          <div style={{ background: '#111', padding: '15px', borderRadius: '8px' }}>
            <h4 style={{ marginTop: 0, color: 'var(--text-muted)' }}>Sync Logs</h4>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.8rem', color: '#ccc', minHeight: '100px', maxHeight: '400px', overflowY: 'auto' }}>
              {log || "No sync running."}
            </pre>
          </div>
        </div>
      </div>
    </>
  );
}
