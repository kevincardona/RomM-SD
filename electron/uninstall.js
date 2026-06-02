import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { getConfigPath, getConfigDir } from './config.js';

const LIBRARY_CACHE_FILE = path.join(getConfigDir(), 'library-cache.json');
const SAVES_DIR = path.join(getConfigDir(), 'saves');

export function getAppImagePath() {
  return process.env.APPIMAGE || null;
}

export async function openAppImageLocation() {
  const appImage = getAppImagePath();
  if (!appImage) return { success: false, error: 'Not running as an AppImage.' };
  const dir = path.dirname(appImage);
  const { spawn } = await import('node:child_process');
  try {
    spawn('xdg-open', [dir], { detached: true, stdio: 'ignore' }).unref();
    return { success: true, path: dir };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function walkDir(dir, opts = {}) {
  const stats = { fileCount: 0, totalBytes: 0, files: [] };
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        const sub = await walkDir(full, opts);
        stats.fileCount += sub.fileCount;
        stats.totalBytes += sub.totalBytes;
        if (opts.collectFiles) stats.files.push(...sub.files);
      } else if (e.isFile()) {
        const s = await fs.stat(full);
        stats.fileCount += 1;
        stats.totalBytes += s.size;
        if (opts.collectFiles) stats.files.push(full);
      }
    }
  } catch { /* dir doesn't exist */ }
  return stats;
}

function expandPath(p) {
  if (!p) return p;
  return p.startsWith('~') ? p.replace('~', os.homedir()) : p;
}

function biosDir(emudeckPath) {
  const base = expandPath(emudeckPath || '~/Emulation/roms');
  return base.replace(/\/roms$/, '/bios');
}

export async function getUninstallSummary(config) {
  const romsPath = expandPath(config?.emudeckPath || '~/Emulation/roms');
  const biosPath = biosDir(config?.emudeckPath);
  const [roms, bios, saves, configExists, libraryCacheExists, appImage] = await Promise.all([
    walkDir(romsPath),
    walkDir(biosPath),
    walkDir(SAVES_DIR),
    fs.access(getConfigPath()).then(() => true).catch(() => false),
    fs.access(LIBRARY_CACHE_FILE).then(() => true).catch(() => false),
    Promise.resolve(getAppImagePath()),
  ]);
  return {
    romsPath,
    biosPath,
    savesDir: SAVES_DIR,
    configPath: getConfigPath(),
    libraryCachePath: LIBRARY_CACHE_FILE,
    appImagePath: appImage,
    roms: { fileCount: roms.fileCount, totalBytes: roms.totalBytes },
    bios: { fileCount: bios.fileCount, totalBytes: bios.totalBytes },
    saves: { fileCount: saves.fileCount, totalBytes: saves.totalBytes },
    configExists,
    libraryCacheExists,
  };
}

async function wipeDir(dir) {
  let removed = 0;
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      try { await fs.rm(full, { recursive: true, force: true }); removed++; }
      catch { /* skip */ }
    }
  } catch { /* dir doesn't exist */ }
  return removed;
}

export async function wipeGames(config) {
  return { success: true, removed: await wipeDir(expandPath(config?.emudeckPath || '~/Emulation/roms')) };
}

export async function wipeBios(config) {
  return { success: true, removed: await wipeDir(biosDir(config?.emudeckPath)) };
}

export async function wipeSaves() {
  return { success: true, removed: await wipeDir(SAVES_DIR) };
}

export async function wipeConfig() {
  try { await fs.unlink(getConfigPath()); return { success: true }; }
  catch (e) { return { success: false, error: e.message }; }
}

export async function wipeLibraryCache() {
  try { await fs.unlink(LIBRARY_CACHE_FILE); return { success: true }; }
  catch (e) { if (e.code === 'ENOENT') return { success: true }; return { success: false, error: e.message }; }
}

export async function readLibraryCache() {
  try { return JSON.parse(await fs.readFile(LIBRARY_CACHE_FILE, 'utf-8')); }
  catch { return null; }
}

export async function writeLibraryCache(library) {
  try {
    await fs.mkdir(path.dirname(LIBRARY_CACHE_FILE), { recursive: true });
    await fs.writeFile(LIBRARY_CACHE_FILE, JSON.stringify(library));
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}
