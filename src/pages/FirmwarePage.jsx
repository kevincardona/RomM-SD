import React, { useState, useEffect } from 'react';
import { fetchFirmware } from '../api';
import Focusable from '../components/Focusable';

function biosBasePath(config, homeDir) {
  const base = config.emudeckPath.startsWith('~') ? config.emudeckPath.replace('~', homeDir) : config.emudeckPath;
  return base.replace(/\/roms$/, '/bios');
}

export default function FirmwarePage({ config }) {
  const [firmware, setFirmware] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFirmware() {
      if (!config.url || !config.token) { setLoading(false); return; }
      try {
        const data = await fetchFirmware(config.url, config.token);
        const homeDir = await window.electronAPI.getHomeDir();
        const biosPath = biosBasePath(config, homeDir);
        for (const fw of data) {
          fw.localPath = `${biosPath}/${fw.filename}`;
          const fileCheck = await window.electronAPI.checkFileExists(fw.localPath);
          fw.downloaded = fileCheck.exists;
          fw.downloadUrl = fw.download_url
            ? `${config.url.replace(/\/$/, '')}${fw.download_url}`
            : `${config.url.replace(/\/$/, '')}/api/firmware/${fw.id}/content/${encodeURIComponent(fw.filename)}`;
        }
        setFirmware(data);
      } catch (err) { console.error("Failed to load firmware", err); }
      setLoading(false);
    }
    loadFirmware();
  }, [config]);

  const handleDownload = async (fw) => {
    try {
      const res = await window.electronAPI.downloadRom({
        id: fw.id, url: fw.downloadUrl, destinationPath: fw.localPath, token: config.token,
      });
      if (res.success) setFirmware(prev => prev.map(f => f.id === fw.id ? { ...f, downloaded: true } : f));
      else alert("Download failed: " + res.error);
    } catch (e) { alert("Error: " + e.message); }
  };

  const grouped = firmware.reduce((acc, fw) => {
    const plat = fw.platform || 'General / Unknown System';
    (acc[plat] = acc[plat] || []).push(fw);
    return acc;
  }, {});

  return (
    <>
      <div className="topbar">
        <h2 style={{ margin: 0 }}>System BIOS & Firmware</h2>
      </div>
      <div className="content-area">
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column' }}>
            <div className="spinner"></div>
            <div style={{ marginTop: '20px', color: 'var(--text-muted)' }}>Loading firmware...</div>
          </div>
        ) : firmware.length === 0 ? (
          <div style={{ color: 'var(--text-muted)' }}>No firmware found on your RomM server.</div>
        ) : (
          Object.keys(grouped).sort().map(platform => (
            <div key={platform} style={{ marginBottom: '40px' }}>
              <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '20px' }}>{platform}</h3>
              <div className="game-grid" style={{ '--grid-card-width': '200px' }}>
                {grouped[platform].map(fw => (
                  <div key={fw.id} className="game-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontWeight: 'bold' }}>{fw.name || fw.filename}</div>
                    <div style={{ marginTop: 'auto' }}>
                      {fw.downloaded ? (
                        <div style={{ color: '#4caf50', fontSize: '0.9rem' }}>Installed locally ✓</div>
                      ) : (
                        <Focusable
                          as="button"
                          className="btn btn-primary"
                          onActivate={() => handleDownload(fw)}
                        >
                          Download to EmuDeck
                        </Focusable>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
