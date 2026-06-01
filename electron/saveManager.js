import fs from 'node:fs/promises';
import { createReadStream, createWriteStream, watch as fsWatch } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const SAVE_ROOT = path.join(os.homedir(), '.config', 'emudeck-romm-connector', 'saves');
const SAVE_META_DIR = path.join(os.homedir(), '.config', 'emudeck-romm-connector', 'save-meta');

function ensureDir(p) { return fs.mkdir(p, { recursive: true }); }

function hashFile(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
}

async function fileHash(filepath) {
  try {
    const data = await fs.readFile(filepath);
    return { hash: hashFile(data), size: data.length, mtimeMs: (await fs.stat(filepath)).mtimeMs };
  } catch (e) {
    if (e.code === 'ENOENT') return { hash: null, size: 0, mtimeMs: 0, missing: true };
    throw e;
  }
}

function gameIdFor(emuFolder, fileName) {
  return crypto.createHash('sha1').update(`${emuFolder}::${fileName}`).digest('hex').slice(0, 16);
}

function gameSaveDir(emuFolder, fileName) {
  return path.join(SAVE_ROOT, gameIdFor(emuFolder, fileName));
}

function gameMetaFile(emuFolder, fileName) {
  return path.join(SAVE_META_DIR, `${gameIdFor(emuFolder, fileName)}.json`);
}

async function readMeta(emuFolder, fileName) {
  try {
    const txt = await fs.readFile(gameMetaFile(emuFolder, fileName), 'utf-8');
    return JSON.parse(txt);
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

async function writeMeta(emuFolder, fileName, meta) {
  await ensureDir(SAVE_META_DIR);
  await fs.writeFile(gameMetaFile(emuFolder, fileName), JSON.stringify(meta, null, 2));
}

const SAVE_EXTENSIONS = new Set(['.sav', '.srm', '.state', '.sl2', '.sd0', '.dsv', '.ws1', '.fcs', '.eep', '.sra', '.0', '.1', '.2', '.3', '.sgm', '.dat', '.esv', '.ess', '.mcr']);

function isLikelySaveFile(name) {
  const lower = name.toLowerCase();
  if (SAVE_EXTENSIONS.has(path.extname(lower))) return true;
  if (lower.endsWith('.sav.json') || lower.endsWith('.state.json')) return true;
  return false;
}

function resolveLocalSaveDir(localPath, emuFolder) {
  const romPath = localPath;
  const romDir = path.dirname(romPath);
  const romBase = romPath.replace(/\.[^.]+$/, '');
  const baseName = path.basename(romBase);
  const candidates = [
    romDir,
    path.join(romDir, 'saves'),
    path.join(romDir, 'Save States'),
    path.join(path.dirname(romDir), 'saves', path.basename(romDir)),
    path.join(os.homedir(), '.local', 'share', 'steam', 'userdata'),
  ];
  return new Set(candidates);
}

export async function listGameSaves({ localPath, emuFolder, emudeckPath, homeDir }) {
  const romDir = path.dirname(localPath);
  const baseName = path.basename(localPath).replace(/\.[^.]+$/, '');
  const searchDirs = new Set();

  searchDirs.add(romDir);
  searchDirs.add(path.join(romDir, 'saves'));
  searchDirs.add(path.join(romDir, 'save'));
  searchDirs.add(path.join(romDir, 'SaveStates'));
  searchDirs.add(path.join(romDir, 'Save States'));
  const parent = path.dirname(romDir);
  searchDirs.add(path.join(parent, 'saves', path.basename(romDir)));
  searchDirs.add(path.join(parent, 'saves', baseName));

  if (emudeckPath) {
    const base = emudeckPath.startsWith('~') ? emudeckPath.replace('~', homeDir) : emudeckPath;
    searchDirs.add(path.join(base.replace(/\/roms$/, ''), 'saves', emuFolder));
    searchDirs.add(path.join(base.replace(/\/roms$/, ''), 'saves', baseName));
  }

  const out = [];
  for (const dir of searchDirs) {
    let entries = [];
    try { entries = await fs.readdir(dir, { withFileTypes: true }); }
    catch { continue; }
    for (const ent of entries) {
      if (!ent.isFile()) continue;
      if (!isLikelySaveFile(ent.name)) continue;
      const full = path.join(dir, ent.name);
      try {
        const stat = await fs.stat(full);
        out.push({ name: ent.name, path: full, size: stat.size, mtimeMs: stat.mtimeMs, dir });
      } catch {}
    }
  }

  const dedup = new Map();
  for (const f of out) {
    const key = `${f.dir}::${f.name}`;
    if (!dedup.has(key)) dedup.set(key, f);
  }
  return [...dedup.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getSaveStatus({ localPath, emuFolder, emudeckPath, homeDir }) {
  const files = await listGameSaves({ localPath, emuFolder, emudeckPath, homeDir });
  const cacheDir = gameSaveDir(emuFolder, path.basename(localPath));
  const meta = await readMeta(emuFolder, path.basename(localPath));

  const items = [];
  for (const f of files) {
    const cachePath = path.join(cacheDir, f.name);
    const [local, cached] = await Promise.all([
      fileHash(f.path),
      fileHash(cachePath),
    ]);
    const lastUploaded = meta?.files?.[f.name] || null;
    let status = 'synced';
    if (!cached.hash) status = 'new';
    else if (local.hash !== cached.hash && !lastUploaded) status = 'new';
    else if (local.hash !== cached.hash && lastUploaded && local.hash !== lastUploaded.hash) status = 'modified';
    else if (local.hash === cached.hash && lastUploaded && local.hash !== lastUploaded.hash) status = 'behind-cloud';
    items.push({
      name: f.name,
      localPath: f.path,
      cachePath,
      localSize: f.size,
      localMtimeMs: f.mtimeMs,
      localHash: local.hash,
      cachedHash: cached.hash,
      lastUploaded,
      status,
    });
  }
  return { files: items, cacheDir, meta };
}

async function copyFileAtomic(src, dest) {
  await ensureDir(path.dirname(dest));
  const tmp = `${dest}.tmp-${process.pid}-${Date.now()}`;
  await fs.copyFile(src, tmp);
  await fs.rename(tmp, dest);
}

export async function pushSaves({ localPath, emuFolder, emudeckPath, homeDir, fileNames, sender, logInfo, logError }) {
  const baseName = path.basename(localPath);
  const cacheDir = gameSaveDir(emuFolder, baseName);
  const status = await getSaveStatus({ localPath, emuFolder, emudeckPath, homeDir });
  const targets = fileNames && fileNames.length
    ? status.files.filter(f => fileNames.includes(f.name))
    : status.files;

  const results = [];
  for (const item of targets) {
    try {
      if (!item.localHash) {
        results.push({ name: item.name, success: false, error: 'local missing' });
        continue;
      }
      await copyFileAtomic(item.localPath, item.cachePath);
      const meta = (await readMeta(emuFolder, baseName)) || { files: {} };
      meta.files[item.name] = {
        hash: item.localHash,
        size: item.localSize,
        mtimeMs: item.localMtimeMs,
        uploadedAt: Date.now(),
      };
      meta.updatedAt = Date.now();
      meta.emuFolder = emuFolder;
      meta.romName = baseName;
      await writeMeta(emuFolder, baseName, meta);
      logInfo && logInfo(`Pushed save ${item.name} for ${baseName}`);
      results.push({ name: item.name, success: true, hash: item.localHash });
    } catch (e) {
      logError && logError(`Push save failed for ${item.name}: ${e.message}`);
      results.push({ name: item.name, success: false, error: e.message });
    }
  }
  return { success: true, results, cacheDir };
}

export async function pullSaves({ localPath, emuFolder, emudeckPath, homeDir, fileNames, sender, logInfo, logError }) {
  const baseName = path.basename(localPath);
  const cacheDir = gameSaveDir(emuFolder, baseName);
  const status = await getSaveStatus({ localPath, emuFolder, emudeckPath, homeDir });
  const targets = fileNames && fileNames.length
    ? status.files.filter(f => fileNames.includes(f.name))
    : status.files;

  const results = [];
  for (const item of targets) {
    try {
      if (!item.cachedHash) {
        results.push({ name: item.name, success: false, error: 'no cached save' });
        continue;
      }
      await copyFileAtomic(item.cachePath, item.localPath);
      logInfo && logInfo(`Pulled save ${item.name} for ${baseName}`);
      results.push({ name: item.name, success: true });
    } catch (e) {
      logError && logError(`Pull save failed for ${item.name}: ${e.message}`);
      results.push({ name: item.name, success: false, error: e.message });
    }
  }
  return { success: true, results };
}

export async function deleteCachedSave({ localPath, emuFolder, fileName }) {
  const baseName = path.basename(localPath);
  const cacheDir = gameSaveDir(emuFolder, baseName);
  const cachePath = path.join(cacheDir, fileName);
  try { await fs.unlink(cachePath); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  const meta = await readMeta(emuFolder, baseName);
  if (meta?.files?.[fileName]) {
    delete meta.files[fileName];
    await writeMeta(emuFolder, baseName, meta);
  }
  return { success: true };
}

export async function listAllCachedGames({ homeDir }) {
  await ensureDir(SAVE_META_DIR);
  const files = await fs.readdir(SAVE_META_DIR);
  const out = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    try {
      const txt = await fs.readFile(path.join(SAVE_META_DIR, f), 'utf-8');
      const meta = JSON.parse(txt);
      const fileCount = Object.keys(meta.files || {}).length;
      const lastUpdate = meta.updatedAt || 0;
      out.push({
        id: f.replace(/\.json$/, ''),
        emuFolder: meta.emuFolder,
        romName: meta.romName,
        fileCount,
        lastUpdate,
        files: meta.files || {},
      });
    } catch {}
  }
  return out.sort((a, b) => b.lastUpdate - a.lastUpdate);
}

export async function listAllGamesWithSaves({ library, homeDir }) {
  const cached = await listAllCachedGames({ homeDir });
  const cachedByName = new Map(cached.map(c => [`${c.emuFolder}::${c.romName}`, c]));

  const seen = new Set();
  const games = [];

  for (const g of (library?.all || [])) {
    const key = `${g.emuFolder}::${g.filename}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!g.downloaded || !g.localPath) continue;
    const status = await getSaveStatus({
      localPath: g.localPath, emuFolder: g.emuFolder, homeDir,
    }).catch(() => null);
    if (!status || status.files.length === 0) continue;
    games.push({
      id: g.id, title: g.title, platform: g.platform,
      emuFolder: g.emuFolder, localPath: g.localPath,
      covers: status.files,
      cacheDir: status.cacheDir,
      meta: cachedByName.get(key)?.files || {},
    });
  }
  return games;
}

export async function deleteSaveFile({ localPath, emuFolder, fileName }) {
  const baseName = path.basename(localPath);
  try {
    await fs.unlink(path.join(path.dirname(localPath), fileName));
  } catch (e) { if (e.code !== 'ENOENT') throw e; }
  const cachePath = path.join(gameSaveDir(emuFolder, baseName), fileName);
  try { await fs.unlink(cachePath); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  const meta = await readMeta(emuFolder, baseName);
  if (meta?.files?.[fileName]) {
    delete meta.files[fileName];
    await writeMeta(emuFolder, baseName, meta);
  }
  return { success: true };
}

export async function snapshotGame({ localPath, emuFolder, emudeckPath, homeDir, logInfo, logError }) {
  const result = await pushSaves({ localPath, emuFolder, emudeckPath, homeDir, logInfo, logError });
  return result;
}

export function watchGameSaves({ localPath, emuFolder, emudeckPath, homeDir, onChange, logInfo, logError }) {
  let cancelled = false;
  let lastSnapshots = new Map();
  let debounceTimer = null;

  async function snapshot() {
    try {
      const status = await getSaveStatus({ localPath, emuFolder, emudeckPath, homeDir });
      const sigs = new Map();
      for (const f of status.files) {
        sigs.set(`${f.dir}::${f.name}`, { hash: f.localHash, mtimeMs: f.localMtimeMs, size: f.localSize });
      }
      let changed = false;
      if (sigs.size !== lastSnapshots.size) changed = true;
      else {
        for (const [k, v] of sigs) {
          const prev = lastSnapshots.get(k);
          if (!prev || prev.hash !== v.hash) { changed = true; break; }
        }
      }
      if (changed) {
        lastSnapshots = sigs;
        logInfo && logInfo(`Save change detected for ${path.basename(localPath)}`);
        onChange && onChange(status);
      }
    } catch (e) {
      logError && logError(`Save watch error: ${e.message}`);
    }
  }

  function schedule() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(snapshot, 1500);
  }

  let watcher = null;
  try {
    const dirs = [
      path.dirname(localPath),
      path.join(path.dirname(localPath), 'saves'),
      path.join(path.dirname(localPath), 'save'),
    ];
    if (emudeckPath) {
      const base = emudeckPath.startsWith('~') ? emudeckPath.replace('~', homeDir) : emudeckPath;
      dirs.push(path.join(base.replace(/\/roms$/, ''), 'saves', emuFolder));
    }
    const seen = new Set();
    const watchers = [];
    for (const dir of dirs) {
      if (seen.has(dir)) continue;
      seen.add(dir);
      try {
        const w = fsWatch(dir, { persistent: false }, schedule);
        watchers.push(w);
      } catch {}
    }
    if (watchers.length) {
      watcher = { close: () => watchers.forEach(w => { try { w.close(); } catch {} }) };
    }
  } catch (e) {
    logError && logError(`Cannot set up save watcher: ${e.message}`);
  }

  const interval = setInterval(schedule, 5000);

  return () => {
    cancelled = true;
    if (debounceTimer) clearTimeout(debounceTimer);
    clearInterval(interval);
    try { watcher && watcher.close(); } catch {}
  };
}

const activeWatchers = new Map();

export function startSaveWatcher(gameKey, opts) {
  stopSaveWatcher(gameKey);
  const stop = watchGameSaves({
    ...opts,
    onChange: async (status) => {
      const changes = status.files.filter(f => f.status === 'new' || f.status === 'modified');
      if (changes.length === 0) return;
      await pushSaves({
        localPath: opts.localPath,
        emuFolder: opts.emuFolder,
        emudeckPath: opts.emudeckPath,
        homeDir: opts.homeDir,
        fileNames: changes.map(c => c.name),
        logInfo: opts.logInfo,
        logError: opts.logError,
      }).catch(e => opts.logError && opts.logError(`Auto-push failed: ${e.message}`));
    },
    logInfo: opts.logInfo,
    logError: opts.logError,
  });
  activeWatchers.set(gameKey, stop);
  return stop;
}

export function stopSaveWatcher(gameKey) {
  const existing = activeWatchers.get(gameKey);
  if (existing) { try { existing(); } catch {} activeWatchers.delete(gameKey); }
}

export function stopAllWatchers() {
  for (const [k, stop] of activeWatchers) { try { stop(); } catch {} }
  activeWatchers.clear();
}
