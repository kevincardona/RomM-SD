import { useState, useEffect, useCallback } from 'react';
import { authenticate, fetchLibrary } from '../api';
import type { Config, Game, Library } from '../vite-env';

const DEFAULT_CONFIG: Config = {
  url: '', username: '', password: '',
  token: '', emudeckPath: '~/Emulation/roms',
  gridSize: 'medium', showGameTitles: true,
  saveSyncEnabled: false, browserPlayEnabled: false,
  biosLayout: 'emudeck',
};

function isValidRom(g: Game): boolean {
  if (!g.filename || !g.emuFolder) return false;
  const lower = g.filename.toLowerCase();
  return !lower.endsWith('.sav') && !lower.endsWith('.srm');
}

function expandPath(p: string, homeDir: string): string {
  return p.startsWith('~') ? p.replace('~', homeDir) : p;
}

async function detectDefaultPath(): Promise<string> {
  if (!window.electronAPI) return '~/Emulation/roms';
  const homeDir = await window.electronAPI.getHomeDir();
  const homePath = `${homeDir}/Emulation/roms`;
  const sdPath = '/run/media/mmcblk0p1/Emulation/roms';
  if ((await window.electronAPI.checkFileExists(homePath)).exists) return homePath;
  if ((await window.electronAPI.checkFileExists(sdPath)).exists) return sdPath;
  return '~/Emulation/roms';
}

export interface LibraryLoadResult {
  platforms: string[];
  collections: string[];
}

export function useRomLibrary() {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [library, setLibrary] = useState<Library>({ platforms: {}, collections: {}, all: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  const decorateGames = useCallback(async (games: Game[], basePath: string): Promise<Game[]> => {
    const homeDir = await window.electronAPI!.getHomeDir();
    const expandedBase = expandPath(basePath, homeDir);
    const paths = games.map(g => `${expandedBase}/${g.emuFolder}/${g.filename}`);
    const res = await window.electronAPI!.checkBulkFiles(paths);
    if (!res.success) return games;
    games.forEach((g, i) => {
      g.downloaded = res.results[i];
      g.localPath = paths[i];
    });
    return games;
  }, []);

  const processLibrary = useCallback(async (lib: Library, basePath: string) => {
    lib.all = lib.all.filter(isValidRom);
    lib.all = await decorateGames(lib.all, basePath);
    setLibrary(lib);
  }, [decorateGames]);

  const loadLibrary = useCallback(async (url: string, token: string, basePath: string): Promise<LibraryLoadResult | null> => {
    try {
      const cached = await window.electronAPI!.getLibraryCache();
      if (cached) {
        await processLibrary(cached, basePath);
        setLoading(false);
      }
      const lib = await fetchLibrary(url, token);
      await window.electronAPI!.saveLibraryCache(lib);
      await processLibrary(lib, basePath);
      setLoading(false);
      return { platforms: Object.keys(lib.platforms).sort(), collections: Object.keys(lib.collections).sort() };
    } catch (err: any) {
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
        const newLib: Library = { ...prev };
        const g = newLib.all.find(x => x.id === id);
        if (g) g.downloadProgress = percent;
        return newLib;
      });
      setSelectedGame(prev => (prev && prev.id === id) ? { ...prev, downloadProgress: percent } : prev);
    });
    return () => { unsubscribe && unsubscribe(); };
  }, []);

  const saveAndConnect = useCallback(async (overrideConfig?: Config): Promise<LibraryLoadResult | null> => {
    const cfg = overrideConfig || config;
    setLoading(true);
    setError('');
    try {
      const token = await authenticate(cfg.url, cfg.username, cfg.password);
      const newConfig: Config = { ...cfg, token };
      await window.electronAPI!.saveConfig(newConfig);
      setConfig(newConfig);
      const ok = await loadLibrary(newConfig.url, token, newConfig.emudeckPath);
      return ok;
    } catch (err: any) {
      setError(`Auth Error: ${err.message}`);
      setLoading(false);
      return null;
    }
  }, [config, loadLibrary]);

  const testConnection = useCallback(async ({ url, username, password }: { url: string; username: string; password: string }): Promise<boolean> => {
    try {
      await authenticate(url, username, password);
      return true;
    } catch (e) {
      throw e;
    }
  }, []);

  const completeWizard = useCallback(async (wizardConfig: Partial<Config>) => {
    setShowWizard(false);
    setConfig(prev => ({ ...prev, ...wizardConfig }));
    await saveAndConnect({ ...config, ...wizardConfig } as Config);
  }, [config, saveAndConnect]);

  const reopenWizard = useCallback(() => setShowWizard(true), []);
  const closeWizard = useCallback(() => setShowWizard(false), []);

  const updateConfig = useCallback(async (patch: Partial<Config>) => {
    const next: Config = { ...config, ...patch };
    setConfig(next);
    try { await window.electronAPI!.saveConfig(next); }
    catch (e: any) { setError(`Save failed: ${e.message}`); }
  }, [config]);

  const updateGameStatus = useCallback((game: Game, downloaded: boolean) => {
    setLibrary(prev => {
      const newLib: Library = { ...prev };
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

  const downloadGame = useCallback(async (game: Game) => {
    const res = await window.electronAPI!.downloadRom({
      id: game.id, url: game.downloadUrl,
      destinationPath: game.localPath!, token: config.token,
    });
    if (res.success) updateGameStatus(game, true);
    return res;
  }, [config.token, updateGameStatus]);

  const deleteGame = useCallback(async (game: Game) => {
    await window.electronAPI!.deleteFile(game.localPath!);
    updateGameStatus(game, false);
  }, [updateGameStatus]);

  const rescanLibrary = useCallback(async (): Promise<LibraryLoadResult | null> => {
    setError('');
    try {
      const cached = await window.electronAPI!.getLibraryCache();
      if (!cached) return null;
      await processLibrary(cached, config.emudeckPath);
      return { platforms: Object.keys(cached.platforms).sort(), collections: Object.keys(cached.collections).sort() };
    } catch (err: any) {
      setError(`Rescan failed: ${err.message}`);
      return null;
    }
  }, [config.emudeckPath, processLibrary]);

  return {
    config, setConfig, updateConfig, library, loading, error,
    selectedGame, setSelectedGame,
    saveAndConnect, loadLibrary, rescanLibrary, downloadGame, deleteGame,
    showWizard, completeWizard, reopenWizard, closeWizard, testConnection,
  };
}
