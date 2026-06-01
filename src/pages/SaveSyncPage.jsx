import React, { useState, useEffect, useRef, useCallback } from 'react';
import Focusable from '../components/Focusable';

const STATUS_LABELS = {
  synced: { label: 'Synced', color: '#4caf50' },
  new: { label: 'New save', color: '#00e5ff' },
  modified: { label: 'Modified locally', color: '#ff9800' },
  'behind-cloud': { label: 'Cloud has newer', color: '#9c27b0' },
};

function timeAgo(ts) {
  if (!ts) return '—';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function fmtBytes(n) {
  if (!n) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function GameSaveCard({ game, onPush, onPull, onDelete, busy, expanded, onToggle }) {
  const summary = React.useMemo(() => {
    const counts = { new: 0, modified: 0, 'behind-cloud': 0, synced: 0 };
    for (const c of game.covers) counts[c.status] = (counts[c.status] || 0) + 1;
    return counts;
  }, [game.covers]);

  const totalSize = game.covers.reduce((acc, c) => acc + (c.localSize || 0), 0);
  const lastUpdate = Math.max(0, ...Object.values(game.meta).map(m => m.uploadedAt || 0));
  const hasConflicts = summary.new > 0 || summary.modified > 0 || summary['behind-cloud'] > 0;

  return (
    <div className="game-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px', aspectRatio: 'auto', alignItems: 'stretch' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 'bold', fontSize: '1rem', flex: '1 1 auto' }}>{game.title}</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{game.platform}</span>
      </div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
        {game.localPath}
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.7rem' }}>
        <span style={{ background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '4px' }}>
          {game.covers.length} file{game.covers.length === 1 ? '' : 's'}
        </span>
        <span style={{ background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '4px' }}>
          {fmtBytes(totalSize)}
        </span>
        {summary.new > 0 && (
          <span style={{ background: 'rgba(0, 229, 255, 0.15)', color: '#00e5ff', padding: '3px 8px', borderRadius: '4px' }}>
            {summary.new} new
          </span>
        )}
        {summary.modified > 0 && (
          <span style={{ background: 'rgba(255, 152, 0, 0.15)', color: '#ff9800', padding: '3px 8px', borderRadius: '4px' }}>
            {summary.modified} modified
          </span>
        )}
        {summary['behind-cloud'] > 0 && (
          <span style={{ background: 'rgba(156, 39, 176, 0.15)', color: '#ce93d8', padding: '3px 8px', borderRadius: '4px' }}>
            {summary['behind-cloud']} cloud-newer
          </span>
        )}
        {summary.synced > 0 && !hasConflicts && (
          <span style={{ background: 'rgba(76, 175, 80, 0.15)', color: '#4caf50', padding: '3px 8px', borderRadius: '4px' }}>
            ✓ all synced
          </span>
        )}
        {lastUpdate > 0 && (
          <span style={{ background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '4px', marginLeft: 'auto' }}>
            last push: {timeAgo(lastUpdate)}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
        <Focusable
          className="btn btn-primary"
          style={{ flex: 1, padding: '8px 12px', fontSize: '0.8rem' }}
          onActivate={() => onPush(game)}
          disabled={busy}
          autoFocus={false}
        >
          {busy ? '…' : '↑ Push'}
        </Focusable>
        <Focusable
          className="btn"
          style={{ flex: 1, padding: '8px 12px', fontSize: '0.8rem' }}
          onActivate={() => onPull(game)}
          disabled={busy}
        >
          {busy ? '…' : '↓ Pull'}
        </Focusable>
        <Focusable
          className="btn"
          style={{ padding: '8px 12px', fontSize: '0.8rem' }}
          onActivate={() => onToggle(game.id)}
        >
          {expanded ? 'Hide' : 'Files'}
        </Focusable>
      </div>

      {expanded && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {game.covers.map(c => {
            const statusInfo = STATUS_LABELS[c.status] || { label: c.status, color: 'var(--text-muted)' };
            return (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {fmtBytes(c.localSize)} · {c.localMtimeMs ? new Date(c.localMtimeMs).toLocaleString() : '—'}
                    {c.lastUploaded && ` · pushed ${timeAgo(c.lastUploaded.uploadedAt)}`}
                  </div>
                </div>
                <span style={{ color: statusInfo.color, fontSize: '0.75rem', fontWeight: 600, flex: '0 0 auto' }}>
                  {statusInfo.label}
                </span>
                <Focusable
                  className="btn"
                  style={{ padding: '4px 8px', fontSize: '0.7rem', flex: '0 0 auto' }}
                  onActivate={() => onDelete(game, c.name)}
                  disabled={busy}
                >
                  ×
                </Focusable>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SaveSyncPage({ library, config, enabled }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState(new Set());
  const [expanded, setExpanded] = useState({});
  const [lastResult, setLastResult] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const firstBtnRef = useRef(null);

  const load = useCallback(async () => {
    if (!config) { setLoading(false); return; }
    setLoading(true);
    try {
      const homeDir = await window.electronAPI.getHomeDir();
      const list = await window.electronAPI.listGamesWithSaves({
        library, homeDir, emudeckPath: config.emudeckPath,
      });
      setGames(list);
    } catch (e) {
      console.error('Failed to list games with saves:', e);
    }
    setLoading(false);
  }, [library, config]);

  useEffect(() => { if (enabled) load(); else setLoading(false); }, [load, enabled]);
  useEffect(() => { firstBtnRef.current?.focus(); }, []);

  if (enabled === false) {
    return (
      <>
        <div className="topbar">
          <h2 style={{ margin: 0 }}>Cloud Saves</h2>
        </div>
        <div className="content-area">
          <div style={{
            maxWidth: '560px',
            background: 'rgba(255, 152, 0, 0.06)',
            border: '1px solid rgba(255, 152, 0, 0.25)',
            borderRadius: '10px',
            padding: '20px 24px',
            marginBottom: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{
                fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px',
                background: 'rgba(255, 152, 0, 0.18)', color: '#ff9800',
                padding: '2px 8px', borderRadius: '4px', fontWeight: 700,
              }}>EXPERIMENTAL · DISABLED</span>
            </div>
            <h3 style={{ marginTop: 0, marginBottom: '8px' }}>Save Sync is turned off</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 0 }}>
              ROMM-SD can track every game's save files locally and detect conflicts before
              overwriting. To use it, enable <strong style={{ color: 'var(--text-main)' }}>Save Sync</strong> under
              {' '}<strong style={{ color: 'var(--text-main)' }}>Settings → Experimental</strong>.
              Once enabled, this tab will list every game with a save file and let you push, pull,
              and version them.
            </p>
          </div>
        </div>
      </>
    );
  }

  const setBusy = (id, busy) => {
    setBusyIds(prev => {
      const n = new Set(prev);
      if (busy) n.add(id); else n.delete(id);
      return n;
    });
  };

  const handlePush = async (game) => {
    setBusy(game.id, true);
    try {
      const homeDir = await window.electronAPI.getHomeDir();
      const res = await window.electronAPI.pushSaves({
        localPath: game.localPath, emuFolder: game.emuFolder,
        emudeckPath: config.emudeckPath, homeDir,
      });
      setLastResult({ type: 'push', game: game.title, res });
      await load();
    } catch (e) {
      setLastResult({ type: 'error', message: e.message });
    }
    setBusy(game.id, false);
  };

  const handlePull = async (game) => {
    setBusy(game.id, true);
    try {
      const homeDir = await window.electronAPI.getHomeDir();
      const res = await window.electronAPI.pullSaves({
        localPath: game.localPath, emuFolder: game.emuFolder,
        emudeckPath: config.emudeckPath, homeDir,
      });
      setLastResult({ type: 'pull', game: game.title, res });
      await load();
    } catch (e) {
      setLastResult({ type: 'error', message: e.message });
    }
    setBusy(game.id, false);
  };

  const handlePushAll = async () => {
    const conflicts = filtered.filter(g => g.covers.some(c => c.status === 'new' || c.status === 'modified'));
    if (conflicts.length === 0) return;
    for (const g of conflicts) {
      setBusy(g.id, true);
      try {
        const homeDir = await window.electronAPI.getHomeDir();
        await window.electronAPI.pushSaves({
          localPath: g.localPath, emuFolder: g.emuFolder,
          emudeckPath: config.emudeckPath, homeDir,
        });
      } catch (e) { console.error(e); }
      setBusy(g.id, false);
    }
    await load();
  };

  const handlePullAll = async () => {
    const behind = filtered.filter(g => g.covers.some(c => c.status === 'behind-cloud'));
    if (behind.length === 0) return;
    for (const g of behind) {
      setBusy(g.id, true);
      try {
        const homeDir = await window.electronAPI.getHomeDir();
        await window.electronAPI.pullSaves({
          localPath: g.localPath, emuFolder: g.emuFolder,
          emudeckPath: config.emudeckPath, homeDir,
        });
      } catch (e) { console.error(e); }
      setBusy(g.id, false);
    }
    await load();
  };

  const handleDelete = async (game, fileName) => {
    if (!window.confirm(`Delete save "${fileName}" from disk and cache?`)) return;
    setBusy(game.id, true);
    try {
      await window.electronAPI.deleteSaveFile({
        localPath: game.localPath, emuFolder: game.emuFolder, fileName,
      });
      await load();
    } catch (e) { console.error(e); }
    setBusy(game.id, false);
  };

  const handleToggle = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filtered = React.useMemo(() => {
    let list = games;
    if (filter === 'new') {
      list = list.filter(g => g.covers.some(c => c.status === 'new'));
    } else if (filter === 'modified') {
      list = list.filter(g => g.covers.some(c => c.status === 'modified'));
    } else if (filter === 'behind-cloud') {
      list = list.filter(g => g.covers.some(c => c.status === 'behind-cloud'));
    } else if (filter === 'synced') {
      list = list.filter(g => g.covers.every(c => c.status === 'synced') && g.covers.length > 0);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(g => g.title.toLowerCase().includes(q) || g.platform?.toLowerCase().includes(q));
    }
    return list;
  }, [games, filter, search]);

  const counts = React.useMemo(() => {
    const c = { all: games.length, new: 0, modified: 0, 'behind-cloud': 0, synced: 0 };
    for (const g of games) {
      for (const f of g.covers) {
        if (f.status === 'new') c.new++;
        if (f.status === 'modified') c.modified++;
        if (f.status === 'behind-cloud') c['behind-cloud']++;
        if (f.status === 'synced') c.synced++;
      }
    }
    return c;
  }, [games]);

  return (
    <>
      <div className="topbar">
        <h2 style={{ margin: 0 }}>Cloud Saves</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            className="search-input"
            placeholder="Search games..."
            tabIndex={0}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') window.electronAPI?.showKeyboard?.(); }}
          />
          <button
            ref={firstBtnRef}
            className="btn"
            tabIndex={0}
            onClick={load}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >↻ Refresh</button>
        </div>
      </div>

      <div className="content-area">
        <div style={{
          background: 'rgba(0, 229, 255, 0.06)',
          border: '1px solid rgba(0, 229, 255, 0.25)',
          borderRadius: '10px',
          padding: '14px 18px',
          marginBottom: '20px',
          fontSize: '0.85rem',
        }}>
          <div style={{ color: 'var(--text-main)', fontWeight: 600, marginBottom: '4px' }}>Per-game save sync</div>
          <div style={{ color: 'var(--text-muted)' }}>
            ROMM-SD keeps a local cache of every game's save files at
            <code style={{ color: 'var(--accent-color)', margin: '0 4px' }}>~/.config/emudeck-romm-connector/saves/</code>.
            Each save file is versioned per push — pulls detect conflicts before overwriting. Sync happens
            automatically when you launch or exit a game, and you can also push/pull manually below.
          </div>
        </div>

        <div className="filter-bar" style={{ marginBottom: '20px' }}>
          <span className="filter-bar-label">Show</span>
          <Focusable className={`filter-chip ${filter === 'all' ? 'active' : ''}`} onActivate={() => setFilter('all')}>
            All <span style={{ opacity: 0.6, marginLeft: 4 }}>{counts.all}</span>
          </Focusable>
          <Focusable className={`filter-chip ${filter === 'new' ? 'active' : ''}`} onActivate={() => setFilter('new')}>
            New <span style={{ opacity: 0.6, marginLeft: 4 }}>{counts.new}</span>
          </Focusable>
          <Focusable className={`filter-chip ${filter === 'modified' ? 'active' : ''}`} onActivate={() => setFilter('modified')}>
            Modified <span style={{ opacity: 0.6, marginLeft: 4 }}>{counts.modified}</span>
          </Focusable>
          <Focusable className={`filter-chip ${filter === 'behind-cloud' ? 'active' : ''}`} onActivate={() => setFilter('behind-cloud')}>
            Behind <span style={{ opacity: 0.6, marginLeft: 4 }}>{counts['behind-cloud']}</span>
          </Focusable>
          <Focusable className={`filter-chip ${filter === 'synced' ? 'active' : ''}`} onActivate={() => setFilter('synced')}>
            Synced <span style={{ opacity: 0.6, marginLeft: 4 }}>{counts.synced}</span>
          </Focusable>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <Focusable className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '0.85rem' }} onActivate={handlePushAll}>
              ↑ Push all modified
            </Focusable>
            <Focusable className="btn" style={{ padding: '8px 14px', fontSize: '0.85rem' }} onActivate={handlePullAll}>
              ↓ Pull all behind
            </Focusable>
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={autoSyncEnabled}
            onChange={e => setAutoSyncEnabled(e.target.checked)}
            tabIndex={0}
            style={{ width: '18px', height: '18px', margin: 0 }}
          />
          <span>Auto-sync saves when launching or exiting a game (recommended)</span>
        </label>

        {lastResult && (
          <div style={{
            padding: '10px 14px', borderRadius: '6px', marginBottom: '20px',
            background: lastResult.type === 'error' ? 'rgba(255,0,0,0.15)' : 'rgba(76,175,80,0.15)',
            color: lastResult.type === 'error' ? '#ff6b6b' : '#4caf50',
            fontSize: '0.85rem',
          }}>
            {lastResult.type === 'error' && `Error: ${lastResult.message}`}
            {lastResult.type === 'push' && `Pushed ${lastResult.res?.results?.filter(r => r.success).length || 0} save(s) for ${lastResult.game}`}
            {lastResult.type === 'pull' && `Pulled ${lastResult.res?.results?.filter(r => r.success).length || 0} save(s) for ${lastResult.game}`}
          </div>
        )}

        {loading ? (
          <div className="loading-container" style={{ position: 'static', background: 'none', height: '40vh' }}>
            <div className="spinner"></div>
            <div className="loading-text">Scanning save directories…</div>
          </div>
        ) : games.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', padding: '20px' }}>
            No games with save files detected. Once you play a downloaded game, its saves will show up here.
          </div>
        ) : (
          <div className="game-grid" style={{ '--grid-card-width': '360px' }}>
            {filtered.map(g => (
              <GameSaveCard
                key={g.id}
                game={g}
                onPush={handlePush}
                onPull={handlePull}
                onDelete={handleDelete}
                busy={busyIds.has(g.id)}
                expanded={!!expanded[g.id]}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
