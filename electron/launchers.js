import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { exec } from 'node:child_process';
import util from 'node:util';

const execAsync = util.promisify(exec);
const HOME = os.homedir();
const LAUNCHERS_DIR = path.join(HOME, 'Emulation', 'tools', 'launchers');

export function getEmulatorCommands(emuFolder, localPath) {
  const L = LAUNCHERS_DIR;
  const commands = [];

  switch (emuFolder) {
    case 'gc':
    case 'wii':
      commands.push(`"${path.join(L, 'dolphin-emu.sh')}" -b -e "${localPath}"`);
      commands.push(`flatpak run org.DolphinEmu.dolphin-emu -b -e "${localPath}"`);
      break;
    case 'switch':
      commands.push(`"${path.join(L, 'yuzu.sh')}" -f -g "${localPath}"`);
      commands.push(`"${path.join(L, 'ryujinx.sh')}" "${localPath}"`);
      commands.push(`flatpak run org.yuzu_emu.yuzu -f -g "${localPath}"`);
      commands.push(`flatpak run org.ryujinx.Ryujinx "${localPath}"`);
      break;
    case 'ps2':
      commands.push(`"${path.join(L, 'pcsx2-qt.sh')}" -fullscreen "${localPath}"`);
      commands.push(`flatpak run net.pcsx2.PCSX2 -fullscreen "${localPath}"`);
      break;
    case 'ps3':
      commands.push(`"${path.join(L, 'rpcs3.sh')}" --no-gui "${localPath}"`);
      commands.push(`flatpak run net.rpcs3.RPCS3 --no-gui "${localPath}"`);
      break;
    case 'n3ds':
      commands.push(`"${path.join(L, 'citra.sh')}" "${localPath}"`);
      commands.push(`flatpak run org.citra_emu.citra "${localPath}"`);
      break;
    case 'psp':
      commands.push(`"${path.join(L, 'ppsspp.sh')}" "${localPath}"`);
      commands.push(`flatpak run org.ppsspp.PPSSPP "${localPath}"`);
      break;
    case 'psx':
      commands.push(`"${path.join(L, 'duckstation.sh')}" -batch "${localPath}"`);
      commands.push(`"${path.join(L, 'retroarch.sh')}" -L swanstation "${localPath}"`);
      commands.push(`flatpak run org.duckstation.DuckStation -batch "${localPath}"`);
      commands.push(`flatpak run org.libretro.RetroArch -L swanstation "${localPath}"`);
      break;
    case 'n64':
      commands.push(`"${path.join(L, 'simple64.sh')}" "${localPath}"`);
      commands.push(`"${path.join(L, 'retroarch.sh')}" -L mupen64plus_next "${localPath}"`);
      commands.push(`flatpak run org.libretro.RetroArch -L mupen64plus_next "${localPath}"`);
      break;
    case 'snes':
      commands.push(`"${path.join(L, 'snes9x.sh')}" "${localPath}"`);
      commands.push(`"${path.join(L, 'retroarch.sh')}" -L snes9x "${localPath}"`);
      commands.push(`flatpak run org.snes9x.Snes9x "${localPath}"`);
      commands.push(`flatpak run org.libretro.RetroArch -L snes9x "${localPath}"`);
      break;
    case 'nes':
      commands.push(`"${path.join(L, 'retroarch.sh')}" -L mesen "${localPath}"`);
      commands.push(`flatpak run org.libretro.RetroArch -L mesen "${localPath}"`);
      break;
    case 'gb':
    case 'gbc':
    case 'gba':
      commands.push(`"${path.join(L, 'mgba.sh')}" "${localPath}"`);
      commands.push(`"${path.join(L, 'retroarch.sh')}" -L mgba "${localPath}"`);
      commands.push(`flatpak run io.mgba.mGBA "${localPath}"`);
      commands.push(`flatpak run org.libretro.RetroArch -L mgba "${localPath}"`);
      break;
    case 'megadrive':
      commands.push(`"${path.join(L, 'retroarch.sh')}" -L genesis_plus_gx "${localPath}"`);
      commands.push(`flatpak run org.libretro.RetroArch -L genesis_plus_gx "${localPath}"`);
      break;
  }
  return commands;
}

async function tryLaunch(commands, { logInfo, logError }) {
  for (const command of commands) {
    try {
      if (command.startsWith('"')) {
        const scriptPath = command.split('"')[1];
        await fs.access(scriptPath);
        logInfo(`Launching game: ${command}`);
        const argsStr = command.substring(scriptPath.length + 2).trim();
        const args = [];
        if (argsStr) {
          const parts = argsStr.split('"');
          for (let i = 0; i < parts.length; i++) {
            if (i % 2 === 1) args.push(parts[i]);
            else args.push(...parts[i].trim().split(' ').filter(Boolean));
          }
        }
        const child = spawn(scriptPath, args, {
          detached: true, stdio: 'ignore',
          env: { ...process.env, QT_XCB_GL_INTEGRATION: 'none' },
        });
        child.unref();
        return { success: true };
      }
      logInfo(`Trying fallback: ${command}`);
      const isFlatpak = command.startsWith('flatpak');
      const [bin, ...args] = isFlatpak ? ['flatpak', ...command.split(' ').slice(1)] : command.split(' ');
      const child = spawn(bin, args, {
        detached: true, stdio: 'ignore',
        env: { ...process.env, QT_XCB_GL_INTEGRATION: 'none' },
      });
      child.unref();
      return { success: true };
    } catch (e) {
      logError(`Launch attempt failed: ${e.message}`);
    }
  }
  return { success: false, error: 'No compatible emulator found installed for this system.' };
}

export async function launchGame({ localPath, emuFolder }, { logInfo, logError }) {
  if (localPath.toLowerCase().endsWith('.sav') || localPath.toLowerCase().endsWith('.srm')) {
    return { success: false, error: 'You are trying to launch a save file (.sav/.srm) instead of the actual game ROM. Please select the game file instead.' };
  }
  const commands = getEmulatorCommands(emuFolder, localPath);
  if (process.platform === 'win32') commands.push(`start "" "${localPath}"`);
  else if (process.platform === 'darwin') commands.push(`open "${localPath}"`);
  else commands.push(`xdg-open "${path.dirname(localPath)}"`);
  return tryLaunch(commands, { logInfo, logError });
}

export async function runCloudSync(action, { logInfo }) {
  const fnName = action === 'upload' ? 'cloud_sync_uploadForced' : 'cloud_sync_downloadForced';
  const command = `bash -c 'source "$HOME/.config/EmuDeck/backend/functions/all.sh" && ${fnName}'`;
  logInfo(`Running EmuDeck Cloud Sync: ${action}`);
  try {
    const { stdout, stderr } = await execAsync(command);
    return { success: true, log: stdout + '\n' + stderr };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
