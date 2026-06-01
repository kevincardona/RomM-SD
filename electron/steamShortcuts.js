import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { parseVdf, writeVdf, generateAppId } from './steamVdf.js';

const STEAM_USERDATA = path.join(os.homedir(), '.steam', 'steam', 'userdata');

async function listUserIds() {
  try { return (await fs.readdir(STEAM_USERDATA)).filter(u => u !== '0' && u !== 'anonymous'); }
  catch { return []; }
}

function buildShortcut({ appName, exe, startDir, icon, launchOptions }) {
  return {
    AppName: appName,
    Exe: exe || '',
    StartDir: startDir || '',
    icon: icon || '',
    ShortcutPath: '',
    LaunchOptions: launchOptions || '',
    IsHidden: 0,
    AllowDesktopConfig: 1,
    AllowOverlay: 1,
    OpenVR: 0,
    Devkit: 0,
    DevkitGameID: '',
    DevkitOverrideAppID: 0,
    LastPlayTime: 0,
    tags: [],
  };
}

async function readShortcuts(vdfPath) {
  try { return parseVdf(await fs.readFile(vdfPath)); }
  catch { return { shortcuts: [] }; }
}

function existingNames(shortcuts) {
  const arr = Array.isArray(shortcuts?.shortcuts) ? shortcuts.shortcuts : Object.values(shortcuts?.shortcuts || {});
  return new Set(arr.map(s => s.AppName || s.appname));
}

async function saveCoverArt(gridDir, appIdStr, coverUrl, logInfo, logError) {
  if (!coverUrl) return;
  try {
    await fs.mkdir(gridDir, { recursive: true });
    logInfo(`Fetching cover art from ${coverUrl}`);
    const res = await fetch(coverUrl);
    if (!res.ok) { logError(`Failed to fetch cover art. Status: ${res.status}`); return; }
    const buf = Buffer.from(await res.arrayBuffer());
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const isPng = ct.includes('png');
    const id = appIdStr;
    const ext = isPng ? 'png' : 'jpg';
    const names = [`${id}p.${ext}`, `${id}.${ext}`];
    for (const name of names) {
      await fs.writeFile(path.join(gridDir, name), buf);
    }
    logInfo(`Saved grid artwork to ${gridDir}/${names.join(', ')}`);
  } catch (e) {
    logError(`Error saving grid artwork: ${e.message}`);
  }
}

export async function addToSteam({ appName, emuFolder, localPath, coverUrl }, { logInfo, logError, resolveCommands }) {
  const commands = resolveCommands(emuFolder, localPath);
  if (commands.length === 0) return { success: false, error: 'No emulator configured for this platform.' };

  let validCommand = null;
  for (const cmd of commands) {
    if (cmd.startsWith('"')) {
      const scriptPath = cmd.split('"')[1];
      try { await fs.access(scriptPath); validCommand = cmd; break; } catch (_) {}
    } else { validCommand = cmd; break; }
  }
  if (!validCommand) return { success: false, error: 'Emulator launcher not found locally.' };

  let exe, launchOptions;
  if (validCommand.startsWith('"')) {
    const parts = validCommand.split('"');
    const scriptPath = parts[1];
    const scriptArgs = validCommand.substring(parts[0].length + scriptPath.length + 2).trim();
    exe = '/usr/bin/env';
    launchOptions = `QT_XCB_GL_INTEGRATION=none "${scriptPath}" ${scriptArgs}`;
  } else {
    exe = '/usr/bin/env';
    launchOptions = `QT_XCB_GL_INTEGRATION=none ${validCommand}`;
  }

  const users = await listUserIds();
  if (users.length === 0) return { success: false, error: 'Steam userdata directory not found.' };

  const appIdStr = generateAppId(exe, appName);
  logInfo(`Generated Steam AppID: ${appIdStr} for ${appName}`);

  let added = 0;
  for (const userId of users) {
    const configDir = path.join(STEAM_USERDATA, userId, 'config');
    const vdfPath = path.join(configDir, 'shortcuts.vdf');
    const gridDir = path.join(configDir, 'grid');

    const shortcuts = await readShortcuts(vdfPath);
    if (!Array.isArray(shortcuts.shortcuts)) shortcuts.shortcuts = Object.values(shortcuts.shortcuts || {});
    if (existingNames(shortcuts).has(appName)) {
      logInfo(`${appName} already exists in Steam for user ${userId}`);
      continue;
    }

    shortcuts.shortcuts.push(buildShortcut({ appName, exe, startDir: path.dirname(exe), launchOptions }));
    await fs.writeFile(vdfPath, writeVdf(shortcuts));
    await saveCoverArt(gridDir, appIdStr, coverUrl, logInfo, logError);
    added++;
  }

  if (added > 0) { logInfo(`Added ${appName} to Steam for ${added} user(s).`); return { success: true }; }
  return { success: false, error: 'Game already exists in Steam.' };
}

export async function addSelfToSteam({ logInfo }) {
  const appImagePath = process.env.APPIMAGE;
  if (!appImagePath) {
    return { success: false, error: 'Not running as an AppImage. Add ROMM-SD to Steam manually by pointing it at the .AppImage file.' };
  }

  const appDir = path.join(path.dirname(appImagePath), 'ROMM-SD.AppDir');
  const apprun = path.join(appDir, 'AppRun');
  const extractedIcon = path.join(path.dirname(appImagePath), 'romm-sd.png');
  const exe = (await fileExists(apprun)) ? apprun : appImagePath;
  const icon = (await fileExists(extractedIcon)) ? extractedIcon : appImagePath;
  const launchOptions = (await fileExists(apprun)) ? 'romm-sd --no-sandbox' : '--no-sandbox';

  const appName = 'ROMM-SD';
  const users = await listUserIds();
  if (users.length === 0) return { success: false, error: 'Steam userdata directory not found.' };

  const appIdStr = generateAppId(exe, appName);
  let added = 0;

  for (const userId of users) {
    const vdfPath = path.join(STEAM_USERDATA, userId, 'config', 'shortcuts.vdf');
    const shortcuts = await readShortcuts(vdfPath);
    if (!Array.isArray(shortcuts.shortcuts)) shortcuts.shortcuts = Object.values(shortcuts.shortcuts || {});
    if (existingNames(shortcuts).has(appName)) continue;

    shortcuts.shortcuts.push(buildShortcut({
      appName,
      exe,
      startDir: path.dirname(exe),
      icon,
      launchOptions,
    }));
    await fs.writeFile(vdfPath, writeVdf(shortcuts));
    added++;
  }

  if (added > 0) { logInfo(`Added ROMM-SD (${exe}) to Steam.`); return { success: true }; }
  return { success: false, error: 'ROMM-SD is already in Steam.' };
}

async function fileExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}
