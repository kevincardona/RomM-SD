import React, { useState, useEffect, useMemo } from 'react';
import { fetchFirmware, fetchPlatforms } from '../api';
import Focusable from '../components/Focusable';

function biosBasePath(emudeckPath, homeDir) {
  const base = (emudeckPath || '~/Emulation/roms').startsWith('~')
    ? (emudeckPath || '~/Emulation/roms').replace('~', homeDir)
    : (emudeckPath || '~/Emulation/roms');
  return base.replace(/\/roms$/, '/bios');
}

function platformLabel(fw, platformMap) {
  if (fw.platform && typeof fw.platform === 'object') {
    return fw.platform.display_name || fw.platform.name || fw.platform.slug || `Platform ${fw.platform.id ?? ''}`;
  }
  if (fw.platform_display_name) return fw.platform_display_name;
  if (fw.platform_name) return fw.platform_name;
  if (fw.platform_slug != null && platformMap?.bySlug?.[String(fw.platform_slug).toLowerCase()]) {
    return platformMap.bySlug[String(fw.platform_slug).toLowerCase()].display;
  }
  if (fw.platform_id != null && platformMap?.byId?.[String(fw.platform_id)]) {
    return platformMap.byId[String(fw.platform_id)].display;
  }
  if (fw.platform_slug) return fw.platform_slug;
  if (fw.platform_id != null) return `Platform ${fw.platform_id}`;
  return 'General / Unknown System';
}

function platformIcon(fw, platformMap) {
  if (fw.platform && typeof fw.platform === 'object') {
    return fw.platform.iconUrl || null;
  }
  if (fw.platform_icon) return fw.platform_icon;
  if (fw.platform_slug != null && platformMap?.bySlug?.[String(fw.platform_slug).toLowerCase()]) {
    return platformMap.bySlug[String(fw.platform_slug).toLowerCase()].iconUrl || null;
  }
  if (fw.platform_id != null && platformMap?.byId?.[String(fw.platform_id)]) {
    return platformMap.byId[String(fw.platform_id)].iconUrl || null;
  }
  return null;
}

export default function FirmwarePage({ config }) {
  const [firmware, setFirmware] = useState([]);
  const [platformMap, setPlatformMap] = useState({ byId: {}, bySlug: {} });
  const [loading, setLoading] = useState(true);
  const [biosPath, setBiosPath] = useState('');
  const [progress, setProgress] = useState({});
  const [homeDir, setHomeDir] = useState('');

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = null;

    async function load() {
      if (!config.url || !config.token) { setLoading(false); return; }
      try {
        const hd = await window.electronAPI.getHomeDir();
        if (cancelled) return;
        setHomeDir(hd);
        const path = biosBasePath(config.emudeckPath, hd);
        if (cancelled) return;
        setBiosPath(path);

        const [data, platforms] = await Promise.all([
          fetchFirmware(config.url, config.token),
          fetchPlatforms(config.url, config.token),
        ]);
        if (cancelled) return;
        setPlatformMap(platforms);

        for (const fw of data) {
          const platformObj = (fw.platform && typeof fw.platform === 'object') ? fw.platform : null;
          const slugFromObject = platformObj?.slug;
          const fsSlugFromObject = platformObj?.fs_slug;
          const slugFromField = fw.platform_slug;
          const fsSlugFromField = fw.platform_fs_slug;
          const idField = fw.platform_id;
          const platformFromMap = idField != null ? platforms.byId[String(idField)] : null;
          const idFromObject = platformObj?.id;
          const idResolved = idField != null ? idField : idFromObject;

          const slugResolved = (slugFromObject || slugFromField || platformFromMap?.slug || '').toString().toLowerCase();
          const fsSlugResolved = (fsSlugFromObject || fsSlugFromField || platformFromMap?.fsSlug || slugResolved || '').toString().toLowerCase();

          fw.subFolder = fsSlugResolved || slugResolved;
          fw.platformSlug = slugResolved;
          fw.platformFsSlug = fsSlugResolved;
          fw.platformIdResolved = idResolved;
          fw.platformLabel = platformFromMap?.display
            || (platformObj?.display_name || platformObj?.name)
            || fw.platform_display_name
            || fw.platform_name
            || (fw.subFolder || null);

          // Resolve install paths via the Electron helper (EmuDeck-aware)
          const fileName = fw.file_name || fw.filename;
          const resolved = await window.electronAPI.resolveBiosPaths({
            fsSlug: fw.platformFsSlug,
            slug: fw.platformSlug,
            fileName,
            emudeckPath: config.emudeckPath,
            layout: config.biosLayout || 'emudeck',
            homeDir: hd,
          }).catch(() => null);
          if (resolved?.success && resolved.paths?.length) {
            fw.installPaths = resolved.paths;
            fw.localPath = resolved.paths[0].path;
            fw.isSwitchKey = resolved.paths.some(p => p.kind === 'switch-key');
          } else {
            fw.installPaths = [{ emulator: 'EmuDeck BIOS root', path: fw.subFolder ? `${path}/${fw.subFolder}/${fileName}` : `${path}/${fileName}` }];
            fw.localPath = fw.installPaths[0].path;
            fw.isSwitchKey = false;
          }

          const fileCheck = await window.electronAPI.checkFileExists(fw.localPath);
          fw.downloaded = fileCheck.exists;
          fw.downloadUrl = fw.download_url
            ? `${config.url.replace(/\/$/, '')}${fw.download_url}`
            : `${config.url.replace(/\/$/, '')}/api/firmware/${fw.id}/content/${encodeURIComponent(fileName)}`;
        }
        if (cancelled) return;
        setFirmware(data);
      } catch (err) { console.error("Failed to load firmware", err); }
      if (!cancelled) setLoading(false);
    }
    load();

    if (window.electronAPI?.onDownloadProgress) {
      unsubscribe = window.electronAPI.onDownloadProgress(({ id, percent }) => {
        setProgress(prev => ({ ...prev, [id]: percent }));
      });
    }

    return () => { cancelled = true; if (unsubscribe) unsubscribe(); };
  }, [config]);

  const handleDownload = async (fw) => {
    setProgress(prev => ({ ...prev, [fw.id]: 0 }));
    try {
      // For multi-target files (Switch keys), write to all targets.
      const targets = fw.installPaths && fw.installPaths.length > 1
        ? fw.installPaths
        : [fw];
      let lastResult = { success: false };
      for (const t of targets) {
        const path = t.localPath || t.path;
        const res = await window.electronAPI.downloadRom({
          id: `${fw.id}::${path}`, url: fw.downloadUrl, destinationPath: path, token: config.token,
        });
        lastResult = res;
        if (!res.success) break;
      }
      if (lastResult.success) {
        setProgress(prev => { const n = { ...prev }; delete n[fw.id]; return n; });
        setFirmware(prev => prev.map(f => f.id === fw.id ? { ...f, downloaded: true } : f));
      } else {
        setProgress(prev => { const n = { ...prev }; delete n[fw.id]; return n; });
        alert("Download failed: " + lastResult.error);
      }
    } catch (e) {
      setProgress(prev => { const n = { ...prev }; delete n[fw.id]; return n; });
      alert("Error: " + e.message);
    }
  };

  const handleDelete = async (fw) => {
    try {
      const paths = (fw.installPaths || [{ path: fw.localPath }]).map(p => p.path);
      for (const p of paths) {
        await window.electronAPI.deleteFile(p);
      }
      setFirmware(prev => prev.map(f => f.id === fw.id ? { ...f, downloaded: false } : f));
    } catch (e) { alert("Delete failed: " + e.message); }
  };

  const grouped = useMemo(() => {
    return firmware.reduce((acc, fw) => {
      const plat = fw.platformLabel || platformLabel(fw, platformMap) || 'General / Unknown System';
      (acc[plat] = acc[plat] || { items: [], icon: platformIcon(fw, platformMap), hasUnknownPlatform: false });
      if (!fw.platformSlug) acc[plat].hasUnknownPlatform = true;
      acc[plat].items.push(fw);
      return acc;
    }, {});
  }, [firmware, platformMap]);

  const refresh = () => {
    setFirmware([]);
    setPlatformMap({ byId: {}, bySlug: {} });
    setLoading(true);
  };

  return (
    <>
      <div className="topbar" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <h2 style={{ margin: 0, flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>System BIOS & Firmware</h2>
        <button className="btn" tabIndex={0} onClick={refresh} style={{ padding: '8px 16px', fontSize: '0.85rem', flex: '0 0 auto' }}>↻ Refresh</button>
      </div>
      <div className="content-area">
        {loading ? (
          <div className="loading-container" style={{ position: 'static', background: 'none', height: '60vh' }}>
            <div className="spinner"></div>
            <div className="loading-text">Loading firmware…</div>
          </div>
        ) : firmware.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', padding: '20px' }}>No firmware found on your RomM server.</div>
        ) : (
          <>
            <div style={{
              background: 'rgba(0, 229, 255, 0.06)',
              border: '1px solid rgba(0, 229, 255, 0.25)',
              borderRadius: '10px',
              padding: '14px 18px',
              marginBottom: '28px',
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
            }}>
              <div style={{ color: 'var(--text-main)', fontWeight: 600, marginBottom: '4px' }}>EmuDeck BIOS folder</div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{biosPath}</div>
              <div style={{ marginTop: '6px' }}>
                Files install to <code style={{ color: 'var(--accent-color)' }}>{biosPath}/&lt;platform&gt;/&lt;file&gt;</code>.
                Switch keys (prod.keys, title.keys) go straight to Yuzu/Ryujinx config dirs.
                Configure layout in <strong style={{ color: 'var(--text-main)' }}>Settings → Experimental</strong>.
              </div>
            </div>
            {Object.keys(grouped).sort().map(platform => {
              const group = grouped[platform];
              const isUnknown = group.hasUnknownPlatform;
              return (
                <div key={platform} style={{ marginBottom: '40px' }}>
                  <h3 style={{
                    borderBottom: '1px solid var(--panel-border)',
                    paddingBottom: '10px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    flexWrap: 'wrap',
                  }}>
                    {group.icon ? (
                      <img
                        src={group.icon}
                        alt=""
                        style={{ width: '32px', height: '32px', objectFit: 'contain', flexShrink: 0 }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <span style={{ width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>?</span>
                    )}
                    <span>{platform}</span>
                    {isUnknown && (
                      <span style={{ color: '#ff9800', fontSize: '0.7rem', fontWeight: 400, flexBasis: '100%' }}>
                        ⚠ RomM did not return a platform slug — these files will be placed in the BIOS root (no platform folder).
                        On your RomM server, edit the firmware entry and assign a platform (e.g. "switch", "ps2", "gc").
                      </span>
                    )}
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.85rem', marginLeft: 'auto' }}>
                      {group.items.length} file{group.items.length === 1 ? '' : 's'}
                    </span>
                  </h3>
                  <div className="game-grid" style={{ '--grid-card-width': '280px' }}>
                    {group.items.map(fw => {
                      const pct = progress[fw.id];
                      const downloading = pct !== undefined && pct < 100;
                      return (
                        <div
                          key={fw.id}
                          className="game-card"
                          style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px', aspectRatio: 'auto', outline: 'none' }}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              const btn = e.currentTarget.querySelector('button[data-primary]');
                              if (btn) btn.click();
                            }
                          }}
                        >
                          <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{fw.file_name || fw.filename || fw.name}</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {(fw.installPaths || []).map((p, i) => (
                              <div key={i} style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', display: 'flex', gap: '6px' }}>
                                <span style={{ color: 'var(--accent-color)', flex: '0 0 auto' }}>{p.emulator}:</span>
                                <span style={{ wordBreak: 'break-all' }}>{p.path}</span>
                              </div>
                            ))}
                          </div>
                          {fw.isSwitchKey && (
                            <div style={{ fontSize: '0.7rem', color: '#00e5ff', fontStyle: 'italic' }}>
                              ↳ Switch decryption keys — written to Yuzu & Ryujinx config
                            </div>
                          )}
                          {downloading && (
                            <div style={{ marginTop: 'auto' }}>
                              <div className="progress-bar-label">
                                <span>Downloading</span>
                                <span>{Math.round(pct)}%</span>
                              </div>
                              <div className="progress-bar">
                                <div className="progress-bar-fill" style={{ width: `${Math.max(pct, 2)}%` }}></div>
                              </div>
                            </div>
                          )}
                          {!downloading && (
                            <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
                              {fw.downloaded ? (
                                <>
                                  <div style={{ color: '#4caf50', fontSize: '0.85rem', flex: 1, alignSelf: 'center' }}>Installed ✓</div>
                                  <button
                                    className="btn"
                                    tabIndex={0}
                                    onClick={() => handleDelete(fw)}
                                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                  >
                                    Remove
                                  </button>
                                </>
                              ) : (
                                <button
                                  data-primary
                                  className="btn btn-primary"
                                  tabIndex={0}
                                  onClick={() => handleDownload(fw)}
                                  style={{ width: '100%' }}
                                >
                                  Download
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}
