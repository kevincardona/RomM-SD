import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { isBrowserPlaySupported, browserPlayUnsupportedReason } from '../browserPlaySupport';

export default function GameActionModal({ game, onClose, onDownload, onDelete, config }) {
  const [fileSize, setFileSize] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [autoSync, setAutoSync] = useState(!!config?.saveSyncEnabled);
  const [streaming, setStreaming] = useState(false);
  const wasDownloading = useRef(game.downloadProgress !== undefined && game.downloadProgress < 100);
  const [justCompleted, setJustCompleted] = useState(false);

  useEffect(() => {
    if (game.downloaded) {
      window.electronAPI.checkFileExists(game.localPath).then(res => {
        if (res.exists) setFileSize((res.size / (1024 * 1024)).toFixed(2) + ' MB');
      });
    }
  }, [game]);

  useEffect(() => {
    const isDownloading = game.downloadProgress !== undefined && game.downloadProgress < 100;
    if (wasDownloading.current && !isDownloading && game.downloaded) {
      setJustCompleted(true);
    }
    wasDownloading.current = isDownloading;
  }, [game.downloadProgress, game.downloaded]);

  const handlePlay = async () => {
    setErrorMsg(null);
    try {
      if (autoSync && config?.saveSyncEnabled && game.downloaded) {
        const homeDir = await window.electronAPI.getHomeDir();
        await window.electronAPI.snapshotGame({
          localPath: game.localPath, emuFolder: game.emuFolder,
          emudeckPath: config?.emudeckPath, homeDir,
        });
        await window.electronAPI.startSaveWatcher({
          gameKey: `${game.emuFolder}::${game.filename}`,
          localPath: game.localPath, emuFolder: game.emuFolder,
          emudeckPath: config?.emudeckPath, homeDir,
        });
      }
      const res = await window.electronAPI.launchGame({ localPath: game.localPath, emuFolder: game.emuFolder });
      if (res.success) onClose();
      else setErrorMsg(res.error);
    } catch (err) { setErrorMsg(err.message); }
  };

  const handlePlayInBrowser = async () => {
    setErrorMsg(null);
    setStreaming(true);
    try {
      const res = await window.electronAPI.openBrowserPlay({
        serverUrl: config?.url,
        romId: game.id,
        romName: game.title,
        token: config?.token,
      });
      if (!res.success) {
        setErrorMsg(res.error || 'Could not open browser play');
        setStreaming(false);
      } else {
        onClose();
      }
    } catch (err) {
      setErrorMsg(err.message);
      setStreaming(false);
    }
  };

  const handleAddToSteam = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await window.electronAPI.addToSteam({
        appName: game.title,
        emuFolder: game.emuFolder,
        localPath: game.localPath,
        coverUrl: game.coverUrl,
      });
      if (res.success) setSuccessMsg('Added to Steam! Restart Steam, then look for the game in your library. The cover art will appear after Steam rescans your shortcuts.');
      else setErrorMsg(res.error);
    } catch (err) { setErrorMsg(err.message); }
  };

  return (
    <Modal onClose={onClose} maxWidth="500px">
      {() => (
        <>
          <h2>{game.title}</h2>
          <div style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
            <div>Status: {game.downloaded ? (justCompleted ? 'Just downloaded!' : 'Downloaded locally') : 'Available on RomM server'}</div>
            {game.downloaded && (
              <div style={{ padding: '10px 0', borderTop: '1px solid var(--border)', marginTop: '10px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '5px' }}>Location:</div>
                <div style={{ fontSize: '0.7rem', wordBreak: 'break-all' }}>{game.localPath}</div>

                {config?.saveSyncEnabled && (
                  <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      tabIndex={0}
                      checked={autoSync}
                      onChange={e => setAutoSync(e.target.checked)}
                      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.currentTarget.checked = !e.currentTarget.checked; e.currentTarget.dispatchEvent(new Event('change', { bubbles: true })); } }}
                      style={{ width: '16px', height: '16px', flex: '0 0 auto', margin: 0 }}
                    />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Auto-sync saves (push when emulator writes)
                    </span>
                  </label>
                )}

                <button className="btn" style={{ width: '100%', marginTop: '15px', background: '#4caf50', color: 'white', borderColor: '#4caf50' }} tabIndex={0} onClick={handlePlay} autoFocus>▶ Play Now</button>
                <button className="btn" style={{ width: '100%', marginTop: '10px', background: 'rgba(255,255,255,0.1)', color: 'white', borderColor: 'transparent' }} tabIndex={0} onClick={handleAddToSteam}>+ Add to Steam</button>
              </div>
            )}
            {game.downloaded && fileSize && <div>Size: {fileSize}</div>}
            {successMsg && <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(76,175,80,0.2)', color: '#4caf50', borderRadius: '4px', fontSize: '0.85rem' }}>{successMsg}</div>}
          </div>

          {errorMsg && (
            <div style={{ marginBottom: '20px', padding: '10px', background: 'rgba(255,0,0,0.2)', color: '#ff4444', borderRadius: '4px', fontSize: '0.85rem' }}>
              {errorMsg}
            </div>
          )}

          {game.downloadProgress !== undefined && game.downloadProgress < 100 && (
            <div style={{ marginBottom: '20px' }}>
              <div className="progress-bar-label">
                <span>Downloading</span>
                <span>{Math.round(game.downloadProgress)}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${Math.max(game.downloadProgress, 2)}%` }}></div>
              </div>
            </div>
          )}

          {(() => {
            if (!config?.browserPlayEnabled) return null;
            const supported = isBrowserPlaySupported(game.emuFolder);
            const reason = supported ? null : browserPlayUnsupportedReason(game.emuFolder);
            return (
              <div style={{
                background: supported ? 'rgba(255, 152, 0, 0.06)' : 'rgba(255, 68, 68, 0.06)',
                border: `1px solid ${supported ? 'rgba(255, 152, 0, 0.25)' : 'rgba(255, 68, 68, 0.25)'}`,
                borderRadius: '8px',
                padding: '10px 12px',
                marginBottom: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: supported ? '6px' : '4px' }}>
                  <span style={{
                    fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '1px',
                    background: supported ? 'rgba(255, 152, 0, 0.18)' : 'rgba(255, 68, 68, 0.18)',
                    color: supported ? '#ff9800' : '#ff6b6b',
                    padding: '2px 6px', borderRadius: '3px', fontWeight: 700,
                  }}>EXPERIMENTAL</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {supported ? 'Stream without downloading' : 'Not streamable'}
                  </span>
                </div>
                {supported ? (
                  <button
                    className="btn"
                    style={{ width: '100%', background: 'rgba(0, 229, 255, 0.12)', color: 'var(--accent-color)', borderColor: 'rgba(0, 229, 255, 0.4)' }}
                    tabIndex={0}
                    onClick={handlePlayInBrowser}
                    disabled={streaming}
                  >
                    {streaming ? 'Opening stream…' : '🌐 Play in Browser'}
                  </button>
                ) : (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    {reason}
                  </div>
                )}
              </div>
            );
          })()}

          <div className="modal-actions" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {game.downloaded ? (
              <button className="btn" tabIndex={0} onClick={() => onDelete(game)} autoFocus={!justCompleted && !config?.browserPlayEnabled}>Remove Local File</button>
            ) : (
              <button className="btn btn-primary" tabIndex={0} onClick={() => onDownload(game)} disabled={game.downloadProgress !== undefined && game.downloadProgress < 100} autoFocus={!config?.browserPlayEnabled}>
                {game.downloadProgress !== undefined && game.downloadProgress < 100 ? `Downloading ${Math.round(game.downloadProgress)}%` : 'Download to EmuDeck'}
              </button>
            )}
            <button className="btn" tabIndex={0} onClick={onClose}>Close</button>
          </div>
        </>
      )}
    </Modal>
  );
}
