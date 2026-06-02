import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import AuthImage from './AuthImage';
import { isBrowserPlaySupported, browserPlayUnsupportedReason } from '../browserPlaySupport';
import type { Game, Config } from '../vite-env';

interface GameActionModalProps {
  game: Game;
  onClose: () => void;
  onDownload: (game: Game) => Promise<any>;
  onDelete: (game: Game) => Promise<any>;
  config?: Config;
}

export default function GameActionModal({ game, onClose, onDownload, onDelete, config }: GameActionModalProps) {
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [autoSync, setAutoSync] = useState<boolean>(!!config?.saveSyncEnabled);
  const [streaming, setStreaming] = useState<boolean>(false);
  const wasDownloading = useRef<boolean>(game.downloadProgress !== undefined && game.downloadProgress < 100);
  const [justCompleted, setJustCompleted] = useState<boolean>(false);

  useEffect(() => {
    if (game.downloaded && game.localPath) {
      window.electronAPI?.checkFileExists(game.localPath).then((res: any) => {
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
        const homeDir = await window.electronAPI!.getHomeDir();
        await window.electronAPI!.snapshotGame({
          localPath: game.localPath, emuFolder: game.emuFolder,
          emudeckPath: config?.emudeckPath, homeDir,
        });
        await window.electronAPI!.startSaveWatcher({
          gameKey: `${game.emuFolder}::${game.filename}`,
          localPath: game.localPath, emuFolder: game.emuFolder,
          emudeckPath: config?.emudeckPath, homeDir,
        });
      }
      const res = await window.electronAPI!.launchGame({ localPath: game.localPath, emuFolder: game.emuFolder });
      if (res.success) onClose();
      else setErrorMsg(res.error);
    } catch (err: any) { setErrorMsg(err.message); }
  };

  const handlePlayInBrowser = async () => {
    setErrorMsg(null);
    setStreaming(true);
    try {
      const res = await window.electronAPI!.openBrowserPlay({
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
    } catch (err: any) {
      setErrorMsg(err.message);
      setStreaming(false);
    }
  };

  const handleAddToSteam = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await window.electronAPI!.addToSteam({
        appName: game.title,
        emuFolder: game.emuFolder,
        localPath: game.localPath,
        coverUrl: game.coverUrl,
        token: config?.token,
      });
      if (res.success) setSuccessMsg('Added to Steam! Restart Steam to see it in your library.');
      else setErrorMsg(res.error);
    } catch (err: any) { setErrorMsg(err.message); }
  };

  const handleAddBrowserGameToSteam = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await window.electronAPI!.addBrowserGameToSteam({
        appName: game.title,
        romId: game.id,
        coverUrl: game.coverUrl,
        token: config?.token,
      });
      if (res.success) setSuccessMsg(`Added "${game.title} (Browser)" to Steam! Restart Steam to see it in your library.`);
      else setErrorMsg(res.error);
    } catch (err: any) { setErrorMsg(err.message); }
  };

  const isDownloading = game.downloadProgress !== undefined && game.downloadProgress < 100;
  const browserSupported = isBrowserPlaySupported(game.emuFolder);
  const browserUnsupportedReason = browserSupported ? null : browserPlayUnsupportedReason(game.emuFolder);

  return (
    <Modal onClose={onClose} maxWidth="520px">
      {() => (
        <>
          {/* Header: cover art + title + status */}
          <div style={{ display: 'flex', gap: '14px', marginBottom: '18px', alignItems: 'flex-start' }}>
            {game.coverUrl ? (
              <AuthImage
                src={game.coverUrl}
                token={config?.token}
                className="game-cover"
                style={{
                  width: '72px',
                  flexShrink: 0,
                  borderRadius: '6px',
                  border: '1px solid var(--panel-border)',
                  backgroundRepeat: 'no-repeat',
                }}
              />
            ) : (
              <div style={{
                width: '72px', flexShrink: 0, aspectRatio: '3/4', borderRadius: '6px',
                background: 'var(--surface)', border: '1px solid var(--panel-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.6rem', color: 'var(--text-muted)',
              }}>🎮</div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', lineHeight: 1.3, wordBreak: 'break-word' }}>
                {game.title}
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{
                  fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.8px',
                  background: 'rgba(0, 229, 255, 0.1)', color: 'var(--accent-color)',
                  padding: '2px 8px', borderRadius: '4px', fontWeight: 600,
                }}>{game.platform}</span>
                {game.downloaded ? (
                  <span style={{ fontSize: '0.75rem', color: justCompleted ? '#4caf50' : 'var(--text-muted)' }}>
                    {justCompleted ? '✓ Just downloaded!' : '✓ Downloaded'}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>On server</span>
                )}
              </div>
              {game.downloaded && game.localPath && (
                <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', wordBreak: 'break-all', lineHeight: 1.4 }}>
                  {game.localPath}
                  {fileSize && <span style={{ marginLeft: '6px', opacity: 0.7 }}>· {fileSize}</span>}
                </div>
              )}
            </div>
          </div>

          {/* Auto-sync toggle */}
          {game.downloaded && config?.saveSyncEnabled && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                tabIndex={0}
                checked={autoSync}
                onChange={e => setAutoSync(e.target.checked)}
                onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.currentTarget.checked = !e.currentTarget.checked; e.currentTarget.dispatchEvent(new Event('change', { bubbles: true })); } }}
                style={{ width: '16px', height: '16px', flex: '0 0 auto', margin: 0 }}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Auto-sync saves on play</span>
            </label>
          )}

          {/* Download progress */}
          {isDownloading && (
            <div style={{ marginBottom: '14px' }}>
              <div className="progress-bar-label">
                <span>Downloading</span>
                <span>{Math.round(game.downloadProgress!)}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${Math.max(game.downloadProgress!, 2)}%` }}></div>
              </div>
            </div>
          )}

          {/* Status messages */}
          {errorMsg && (
            <div style={{ marginBottom: '14px', padding: '10px 12px', background: 'rgba(255,68,68,0.12)', color: '#ff6b6b', borderRadius: '6px', fontSize: '0.82rem', lineHeight: 1.4 }}>
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div style={{ marginBottom: '14px', padding: '10px 12px', background: 'rgba(76,175,80,0.12)', color: '#4caf50', borderRadius: '6px', fontSize: '0.82rem', lineHeight: 1.4 }}>
              {successMsg}
            </div>
          )}

          {/* Primary actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {game.downloaded && (
              <button
                className="btn"
                style={{ background: '#4caf50', color: 'white', borderColor: '#4caf50', fontWeight: 600 }}
                tabIndex={0}
                onClick={handlePlay}
                autoFocus
              >▶ Play Now</button>
            )}

            {/* Browser play */}
            {config?.browserPlayEnabled && browserSupported && (
              <button
                className="btn"
                style={{ background: 'rgba(0,229,255,0.1)', color: 'var(--accent-color)', borderColor: 'rgba(0,229,255,0.35)' }}
                tabIndex={0}
                onClick={handlePlayInBrowser}
                disabled={streaming}
              >
                {streaming ? 'Opening…' : '🌐 Play in Browser'}
              </button>
            )}

            {game.downloaded && (
              <button className="btn" tabIndex={0} onClick={handleAddToSteam} style={{ background: 'rgba(255,255,255,0.07)', borderColor: 'var(--panel-border)' }}>
                + Add to Steam
              </button>
            )}

            {config?.browserPlayEnabled && browserSupported && (
              <button className="btn" tabIndex={0} onClick={handleAddBrowserGameToSteam} style={{ background: 'rgba(255,255,255,0.07)', borderColor: 'var(--panel-border)' }}>
                + Add to Steam (Browser)
              </button>
            )}

            {config?.browserPlayEnabled && !browserSupported && browserUnsupportedReason && (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '6px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', lineHeight: 1.4 }}>
                🌐 Browser play: {browserUnsupportedReason}
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--panel-border)', margin: '4px 0' }} />

            {game.downloaded ? (
              <button className="btn" tabIndex={0} onClick={() => onDelete(game)}>Remove Local File</button>
            ) : (
              <button
                className="btn btn-primary"
                tabIndex={0}
                onClick={() => onDownload(game)}
                disabled={isDownloading}
                autoFocus={!game.downloaded}
              >
                {isDownloading ? `Downloading ${Math.round(game.downloadProgress!)}%` : 'Download'}
              </button>
            )}
            <button className="btn" tabIndex={0} onClick={onClose}>Close</button>
          </div>

          {config?.browserPlayEnabled && browserSupported && (
            <div style={{ marginTop: '10px', fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Browser saves sync to your RomM server. Use <strong style={{ color: 'var(--text-main)' }}>F2</strong> to save state, <strong style={{ color: 'var(--text-main)' }}>F4</strong> to load.
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
