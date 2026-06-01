import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';

export default function GameActionModal({ game, onClose, onDownload, onDelete, config }) {
  const [fileSize, setFileSize] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
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
      const res = await window.electronAPI.launchGame({ localPath: game.localPath, emuFolder: game.emuFolder });
      if (res.success) onClose();
      else setErrorMsg(res.error);
    } catch (err) { setErrorMsg(err.message); }
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
      {({ refocusFirst }) => (
        <>
          <h2>{game.title}</h2>
          <div style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
            <div>Status: {game.downloaded ? (justCompleted ? 'Just downloaded!' : 'Downloaded locally') : 'Available on RomM server'}</div>
            {game.downloaded && (
              <div style={{ padding: '10px 0', borderTop: '1px solid var(--border)', marginTop: '10px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '5px' }}>Location:</div>
                <div style={{ fontSize: '0.7rem', wordBreak: 'break-all' }}>{game.localPath}</div>

                {errorMsg && <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(255,0,0,0.2)', color: '#ff4444', borderRadius: '4px', fontSize: '0.85rem' }}>{errorMsg}</div>}
                {successMsg && <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(76,175,80,0.2)', color: '#4caf50', borderRadius: '4px', fontSize: '0.85rem' }}>{successMsg}</div>}

                <button className="btn" style={{ width: '100%', marginTop: '15px', background: '#4caf50', color: 'white', borderColor: '#4caf50' }} tabIndex={0} onClick={handlePlay} autoFocus>▶ Play Now</button>
                <button className="btn" style={{ width: '100%', marginTop: '10px', background: 'rgba(255,255,255,0.1)', color: 'white', borderColor: 'transparent' }} tabIndex={0} onClick={handleAddToSteam}>+ Add to Steam</button>
              </div>
            )}
            {game.downloaded && fileSize && <div>Size: {fileSize}</div>}
          </div>

          {game.downloadProgress !== undefined && game.downloadProgress < 100 && (
            <div style={{ width: '100%', background: '#333', height: '10px', borderRadius: '5px', marginBottom: '20px', overflow: 'hidden' }}>
              <div style={{ width: `${game.downloadProgress}%`, background: 'var(--primary)', height: '100%', transition: 'width 0.2s' }}></div>
            </div>
          )}

          <div className="modal-actions" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {game.downloaded ? (
              <button className="btn" tabIndex={0} onClick={() => onDelete(game)} autoFocus={!justCompleted}>Remove Local File</button>
            ) : (
              <button className="btn btn-primary" tabIndex={0} onClick={() => onDownload(game)} disabled={game.downloadProgress !== undefined && game.downloadProgress < 100} autoFocus={game.downloadProgress === undefined}>
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
