import { useState, useEffect, useCallback } from 'react';
import { authenticate, fetchLibrary } from '../api';

const DEFAULT_CONFIG = {
  url: '', username: '', password: '',
  token: '', emudeckPath: '~/Emulation/roms',
  gridSize: 'medium', showGameTitles: true,
  saveSyncEnabled: false, browserPlayEnabled: false,
};

function isValidRom(g) {
  if (!g.filename || !g.emuFolder) return false;
  const lower = g.filename.toLowerCase();
  return !lower.endsWith('.sav') && !lower.endsWith('.srm');
}

function expandPath(p, homeDir) {
  return p.startsWith('~') ? p.replace('~', homeDir) : p;
}

async function detectDefaultPath() {
  if (!window.electronAPI) return '~/Emulation/roms';
  const homeDir = await window.electronAPI.getHomeDir();
  const homePath = `${homeDir}/Emulation/roms`;
  const sdPath = '/run/media/mmcblk0p1/Emulation/roms';
  if ((await window.electronAPI.checkFileExists(homePath)).exists) return homePath;
  if ((await window.electronAPI.checkFileExists(sdPath)).exists) return sdPath;
  return '~/Emulation/roms';
}

export function useRomLibrary() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [library, setLibrary] = useState({ platforms: {}, collections: {}, all: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedGame, setSelectedGame] = useState(null);
  const [showWizard, setShowWizard] = useState(false);

  const decorateGames = useCallback(async (games, basePath) => {
    const homeDir = await window.electronAPI.getHomeDir();
    const expandedBase = expandPath(basePath, homeDir);
    const paths = games.map(g => `${expandedBase}/${g.emuFolder}/${g.filename}`);
    const res = await window.electronAPI.checkBulkFiles(paths);
    if (!res.success) return games;
    games.forEach((g, i) => {
      g.downloaded = res.results[i];
      g.localPath = paths[i];
    });
    return games;
  }, []);

  const processLibrary = useCallback(async (lib, basePath) => {
    lib.all = lib.all.filter(isValidRom);
    lib.all = await decorateGames(lib.all, basePath);
    setLibrary(lib);
  }, [decorateGames]);

  const loadLibrary = useCallback(async (url, token, basePath) => {
    try {
      const cached = localStorage.getItem('romm_library');
      if (cached) {
        const lib = JSON.parse(cached);
        await processLibrary(lib, basePath);
        setLoading(false);
      }
      const lib = await fetchLibrary(url, token);
      localStorage.setItem('romm_library', JSON.stringify(lib));
      await processLibrary(lib, basePath);
      setLoading(false);
      return { platforms: Object.keys(lib.platforms).sort(), collections: Object.keys(lib.collections).sort() };
    } catch (err) {
      setError(`Library Error: ${err.message}`);
      setLoading(false);
      return null;
    }
  }, [processLibrary]);

  useEffect(() => {
    if (!window.electronAPI) { setLoading(false); return; }
    (async () => {
      const saved = await window.electronAPI.getConfig();
      if (saved && saved.url) {
        setConfig(prev => ({ ...prev, ...saved }));
        if (saved.token) await loadLibrary(saved.url, saved.token, saved.emudeckPath);
        else setLoading(false);
      } else {
        const defaultPath = await detectDefaultPath();
        setConfig(prev => ({ ...prev, emudeckPath: defaultPath }));
        setLoading(false);
        setShowWizard(true);
      }
    })();
  }, [loadLibrary]);

  useEffect(() => {
    if (!window.electronAPI?.onDownloadProgress) return;
    const unsubscribe = window.electronAPI.onDownloadProgress(({ id, percent }) => {
      setLibrary(prev => {
        const newLib = { ...prev };
        const g = newLib.all.find(x => x.id === id);
        if (g) g.downloadProgress = percent;
        return newLib;
      });
      setSelectedGame(prev => (prev && prev.id === id) ? { ...prev, downloadProgress: percent } : prev);
    });
    return () => { unsubscribe && unsubscribe(); };
  }, []);

  const saveAndConnect = useCallback(async (overrideConfig) => {
    const cfg = overrideConfig || config;
    setLoading(true);
    setError('');
    try {
      const token = await authenticate(cfg.url, cfg.username, cfg.password);
      const newConfig = { ...cfg, token };
      await window.electronAPI.saveConfig(newConfig);
      setConfig(newConfig);
      const ok = await loadLibrary(newConfig.url, token, newConfig.emudeckPath);
      return ok;
    } catch (err) {
      setError(`Auth Error: ${err.message}`);
      setLoading(false);
      return null;
    }
  }, [config, loadLibrary]);

  const testConnection = useCallback(async ({ url, username, password }) => {
    try {
      await authenticate(url, username, password);
      return true;
    } catch (e) {
      throw e;
    }
  }, []);

  const completeWizard = useCallback(async (wizardConfig) => {
    setShowWizard(false);
    setConfig(prev => ({ ...prev, ...wizardConfig }));
    await saveAndConnect({ ...config, ...wizardConfig });
  }, [config, saveAndConnect]);

  const reopenWizard = useCallback(() => setShowWizard(true), []);
  const closeWizard = useCallback(() => setShowWizard(false), []);

  const updateGameStatus = useCallback((game, downloaded) => {
    setLibrary(prev => {
      const newLib = { ...prev };
      const g = newLib.all.find(x => x.id === game.id);
      if (g) {
        g.downloaded = downloaded;
        if (downloaded) g.downloadProgress = undefined;
      }
      return newLib;
    });
    setSelectedGame(prev => (prev && prev.id === game.id)
      ? { ...prev, downloaded, downloadProgress: downloaded ? undefined : prev.downloadProgress }
      : prev);
  }, []);

  const downloadGame = useCallback(async (game) => {
    const res = await window.electronAPI.downloadRom({
      id: game.id, url: game.downloadUrl,
      destinationPath: game.localPath, token: config.token,
    });
    if (res.success) updateGameStatus(game, true);
    return res;
  }, [config.token, updateGameStatus]);

  const deleteGame = useCallback(async (game) => {
    await window.electronAPI.deleteFile(game.localPath);
    updateGameStatus(game, false);
  }, [updateGameStatus]);

  return {
    config, setConfig, library, loading, error,
    selectedGame, setSelectedGame,
    saveAndConnect, loadLibrary, downloadGame, deleteGame,
    showWizard, completeWizard, reopenWizard, closeWizard, testConnection,
  };
}
