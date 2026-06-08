import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { parseVdf, writeVdf, generateAppId } from './steamVdf.js';
import { resolvePs3LaunchPath } from './launchers.js';

const STEAM_USERDATA = path.join(os.homedir(), '.steam', 'steam', 'userdata');

async function listUserIds() {
  try { return (await fs.readdir(STEAM_USERDATA)).filter(u => u !== '0' && u !== 'anonymous'); }
  catch { return []; }
}

function buildShortcut({ appName, exe, startDir, icon, launchOptions, appId }) {
  // appId must be the SIGNED 32-bit representation of the CRC-derived value.
  // Storing it here prevents Steam from recomputing a different value when it
  // next writes the file, which would invalidate our grid artwork filenames.
  const signedId = (appId !== undefined) ? ((appId | 0)) : 0;
  return {
    appid: signedId,
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

async function saveCoverArt(gridDir, appIdStr, coverUrl, token, logInfo, logError) {
  if (!coverUrl) return null;
  try {
    await fs.mkdir(gridDir, { recursive: true });
    const headers = {};
    if (token) headers['Authorization'] = token;
    const res = await fetch(coverUrl, { headers });
    if (!res.ok) { logError(`Failed to fetch cover art. Status: ${res.status}`); return null; }
    const buf = Buffer.from(await res.arrayBuffer());
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const ext = ct.includes('png') ? 'png' : 'jpg';
    // Steam grid artwork naming for non-Steam games:
    // p suffix  → portrait capsule (library grid card, ~600×900)
    // no suffix → wide capsule (library home grid, ~460×215)
    // _hero     → hero banner (game detail top, ~1920×620)
    // _logo     → logo overlay on hero (optional)
    const portraitPath = path.join(gridDir, `${appIdStr}p.${ext}`);
    await fs.writeFile(portraitPath, buf);
    await fs.writeFile(path.join(gridDir, `${appIdStr}.${ext}`), buf);
    await fs.writeFile(path.join(gridDir, `${appIdStr}_hero.${ext}`), buf);
    await fs.writeFile(path.join(gridDir, `${appIdStr}_logo.${ext}`), buf);
    logInfo(`Saved Steam artwork (${appIdStr}, ${ext}) to ${gridDir}`);
    return portraitPath;
  } catch (e) {
    logError(`Error saving cover art: ${e.message}`);
    return null;
  }
}

export async function addToSteam({ appName, emuFolder, localPath, coverUrl, token }, { logInfo, logError, resolveCommands }) {
  const effectivePath = (emuFolder === 'ps3' && localPath) ? await resolvePs3LaunchPath(localPath) : localPath;
  const commands = resolveCommands(emuFolder, effectivePath);
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

    const iconPath = await saveCoverArt(gridDir, appIdStr, coverUrl, token, logInfo, logError);
    shortcuts.shortcuts.push(buildShortcut({ appName, exe, startDir: path.dirname(exe), launchOptions, icon: iconPath || '', appId: parseInt(appIdStr, 10) }));
    await fs.writeFile(vdfPath, writeVdf(shortcuts));
    added++;
  }

  if (added > 0) { logInfo(`Added ${appName} to Steam for ${added} user(s).`); return { success: true }; }
  return { success: false, error: 'Game already exists in Steam.' };
}

export async function addSelfToSteam({ logInfo }) {
  const selfPaths = await resolveAppSelfExe();
  if (!selfPaths) {
    return { success: false, error: 'Not running as an AppImage. Add ROMM-SD to Steam manually by pointing it at the .AppImage file.' };
  }
  const { exe: apprun, iconBase } = selfPaths;
  const extractedIcon = path.join(iconBase, 'romm-sd.png');
  const icon = (await fileExists(extractedIcon)) ? extractedIcon : apprun;
  // AppRun auto-detects APPDIR by searching for a file named after $1
  // ("--no-sandbox"), which never exists, leaving APPDIR="" → crash.
  // Use /usr/bin/env to inject APPDIR before calling AppRun, the same way
  // addToSteam uses /usr/bin/env to pass QT_XCB_GL_INTEGRATION.
  const exe = '/usr/bin/env';
  const launchOptions = `APPDIR="${path.dirname(apprun)}" "${apprun}" --no-sandbox`;

  const appName = 'ROMM-SD';
  const users = await listUserIds();
  if (users.length === 0) return { success: false, error: 'Steam userdata directory not found.' };

  const appIdStr = generateAppId(exe, appName);
  let added = 0;

  // Read icon once for artwork
  let iconBuf = null;
  try { iconBuf = await fs.readFile(icon); } catch {}

  for (const userId of users) {
    const configDir = path.join(STEAM_USERDATA, userId, 'config');
    const vdfPath = path.join(configDir, 'shortcuts.vdf');
    const gridDir = path.join(configDir, 'grid');
    const shortcuts = await readShortcuts(vdfPath);
    if (!Array.isArray(shortcuts.shortcuts)) shortcuts.shortcuts = Object.values(shortcuts.shortcuts || {});
    if (existingNames(shortcuts).has(appName)) continue;

    shortcuts.shortcuts.push(buildShortcut({
      appName,
      exe,
      startDir: path.dirname(exe),
      icon,
      launchOptions,
      appId: parseInt(appIdStr, 10),
    }));
    await fs.writeFile(vdfPath, writeVdf(shortcuts));

    if (iconBuf) {
      try {
        await fs.mkdir(gridDir, { recursive: true });
        await fs.writeFile(path.join(gridDir, `${appIdStr}p.png`), iconBuf);
        await fs.writeFile(path.join(gridDir, `${appIdStr}.png`), iconBuf);
        await fs.writeFile(path.join(gridDir, `${appIdStr}_hero.png`), iconBuf);
      } catch (e) { logInfo(`Could not save ROMM-SD artwork: ${e.message}`); }
    }
    added++;
  }

  if (added > 0) { logInfo(`Added ROMM-SD (${exe}) to Steam.`); return { success: true }; }
  return { success: false, error: 'ROMM-SD is already in Steam.' };
}

async function fileExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

// Resolves the ROMM-SD executable and icon base path regardless of whether
// we're running from the AppImage directly (APPIMAGE set) or from the
// extracted AppDir via AppRun (APPDIR set, APPIMAGE not set — the normal
// case on Steam Deck after install-latest.sh runs).
async function resolveAppSelfExe() {
  const appImagePath = process.env.APPIMAGE || null;
  const appDirEnv = process.env.APPDIR || null;

  if (appImagePath) {
    const derivedAppDir = path.join(path.dirname(appImagePath), 'ROMM-SD.AppDir');
    const apprun = path.join(derivedAppDir, 'AppRun');
    const exe = (await fileExists(apprun)) ? apprun : appImagePath;
    return { exe, iconBase: path.dirname(appImagePath) };
  }

  if (appDirEnv) {
    const apprun = path.join(appDirEnv, 'AppRun');
    if (await fileExists(apprun)) {
      return { exe: apprun, iconBase: path.dirname(appDirEnv) };
    }
  }

  return null;
}

export async function addBrowserGameToSteam({ appName, romId, coverUrl, token }, { logInfo, logError }) {
  const selfPaths = await resolveAppSelfExe();
  if (!selfPaths) {
    return { success: false, error: 'Not running as an AppImage. Browser game Steam shortcuts can only be added when ROMM-SD is installed as an AppImage.' };
  }
  const { exe: apprun } = selfPaths;

  const browserName = `${appName} (Browser)`;
  const exe = '/usr/bin/env';
  const launchOptions = `APPDIR="${path.dirname(apprun)}" "${apprun}" --no-sandbox --play-browser-rom ${romId}`;

  const users = await listUserIds();
  if (users.length === 0) return { success: false, error: 'Steam userdata directory not found.' };

  const appIdStr = generateAppId(exe, browserName);
  logInfo(`Generated Steam AppID: ${appIdStr} for browser game ${browserName}`);

  let added = 0;
  for (const userId of users) {
    const configDir = path.join(STEAM_USERDATA, userId, 'config');
    const vdfPath = path.join(configDir, 'shortcuts.vdf');
    const gridDir = path.join(configDir, 'grid');

    const shortcuts = await readShortcuts(vdfPath);
    if (!Array.isArray(shortcuts.shortcuts)) shortcuts.shortcuts = Object.values(shortcuts.shortcuts || {});
    if (existingNames(shortcuts).has(browserName)) {
      logInfo(`${browserName} already exists in Steam for user ${userId}`);
      continue;
    }

    const iconPath = await saveCoverArt(gridDir, appIdStr, coverUrl, token, logInfo, logError);
    shortcuts.shortcuts.push(buildShortcut({
      appName: browserName,
      exe,
      startDir: path.dirname(exe),
      launchOptions,
      icon: iconPath || '',
      appId: parseInt(appIdStr, 10),
    }));
    await fs.writeFile(vdfPath, writeVdf(shortcuts));
    added++;
  }

  if (added > 0) { logInfo(`Added ${browserName} to Steam for ${added} user(s).`); return { success: true }; }
  return { success: false, error: `${browserName} already exists in Steam.` };
}

export async function removeFromSteam(appName) {
  const users = await listUserIds();
  if (users.length === 0) return { success: false, error: 'Steam userdata directory not found.' };

  let removed = 0;
  for (const userId of users) {
    const vdfPath = path.join(STEAM_USERDATA, userId, 'config', 'shortcuts.vdf');
    const shortcuts = await readShortcuts(vdfPath);
    if (!Array.isArray(shortcuts.shortcuts)) shortcuts.shortcuts = Object.values(shortcuts.shortcuts || {});
    const before = shortcuts.shortcuts.length;
    shortcuts.shortcuts = shortcuts.shortcuts.filter((s) => (s.AppName || s.appname) !== appName);
    if (shortcuts.shortcuts.length < before) {
      await fs.writeFile(vdfPath, writeVdf(shortcuts));
      removed++;
    }
  }
  return { success: true, removed };
}
