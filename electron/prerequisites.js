import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

const HOME = os.homedir();
const FLATPAK_BASE = path.join(HOME, '.var', 'app');
const EMUDECK_LAUNCHERS = path.join(HOME, 'Emulation', 'tools', 'launchers');
const EMUDECK_CONFIG = path.join(HOME, '.config', 'EmuDeck');

// biosDir(emudeckBase) → absolute path where this emulator reads BIOS/firmware.
// emudeckBase is the resolved ~/Emulation root (without trailing slash).
// Returns null when no BIOS is needed.
const BIOS_DIR = {
  retroarch:   (b) => `${b}/bios`,
  dolphin:     (b) => `${b}/bios/gc`,
  pcsx2:       (b) => `${b}/bios/ps2`,
  duckstation: (b) => `${b}/bios/psx`,
  ppsspp:      (_) => null,
  citra:       (_) => null,
  mgba:        (_) => null,
  snes9x:      (_) => null,
  simple64:    (_) => null,
  rpcs3:       (_) => null,
  yuzu:        () => `${HOME}/.config/yuzu/keys`,
  ryujinx:     () => `${HOME}/.config/Ryujinx/system`,
};

export const PREREQUISITES = [
  {
    id: 'flatpak',
    name: 'Flatpak',
    description: 'The package runtime that delivers most Linux emulators. Required before installing the emulators below.',
    flatpakId: null,
    emudeckLauncher: null,
    installUrl: 'https://flatpak.org/setup/',
    category: 'system',
  },
  {
    id: 'emudeck',
    name: 'EmuDeck',
    description: 'The all-in-one installer that puts ROMs, BIOS, emulators, and Steam shortcuts in the right places. Recommended for Steam Deck.',
    flatpakId: null,
    emudeckLauncher: null,
    installUrl: 'https://www.emudeck.com/',
    category: 'meta',
  },
  {
    id: 'retroarch',
    name: 'RetroArch',
    description: 'Multi-system frontend (NES, SNES, Genesis, GB/GBA, PSX, N64, and more) via libretro cores.',
    flatpakId: 'org.libretro.RetroArch',
    emudeckLauncher: 'retroarch.sh',
    installUrl: 'https://flathub.org/apps/org.libretro.RetroArch',
    category: 'multi',
    biosNote: 'Some cores need BIOS files. Place them in the BIOS directory below.',
  },
  {
    id: 'dolphin',
    name: 'Dolphin',
    description: 'GameCube and Wii emulator.',
    flatpakId: 'org.DolphinEmu.dolphin-emu',
    emudeckLauncher: 'dolphin-emu.sh',
    installUrl: 'https://flathub.org/apps/org.DolphinEmu.dolphin-emu',
    category: 'emulator',
    biosNote: 'IPL.bin (GC BIOS) optional for GC; Wii loads from NAND, no separate BIOS needed.',
  },
  {
    id: 'pcsx2',
    name: 'PCSX2',
    description: 'PlayStation 2 emulator.',
    flatpakId: 'net.pcsx2.PCSX2',
    emudeckLauncher: 'pcsx2-qt.sh',
    installUrl: 'https://flathub.org/apps/net.pcsx2.PCSX2',
    category: 'emulator',
    biosNote: 'Requires a PS2 BIOS ROM (e.g. SCPH-70012.bin). Download from RomM → Firmware.',
  },
  {
    id: 'rpcs3',
    name: 'RPCS3',
    description: 'PlayStation 3 emulator.',
    flatpakId: 'net.rpcs3.RPCS3',
    emudeckLauncher: 'rpcs3.sh',
    installUrl: 'https://flathub.org/apps/net.rpcs3.RPCS3',
    category: 'emulator',
    biosNote: 'PS3 firmware must be installed inside RPCS3 via File → Install Firmware.',
  },
  {
    id: 'duckstation',
    name: 'DuckStation',
    description: 'PlayStation 1 emulator (precise, fast).',
    flatpakId: 'org.duckstation.DuckStation',
    emudeckLauncher: 'duckstation.sh',
    installUrl: 'https://flathub.org/apps/org.duckstation.DuckStation',
    category: 'emulator',
    biosNote: 'Requires a PS1 BIOS (e.g. scph1001.bin). Download from RomM → Firmware.',
  },
  {
    id: 'ppsspp',
    name: 'PPSSPP',
    description: 'PlayStation Portable emulator.',
    flatpakId: 'org.ppsspp.PPSSPP',
    emudeckLauncher: 'ppsspp.sh',
    installUrl: 'https://flathub.org/apps/org.ppsspp.PPSSPP',
    category: 'emulator',
    biosNote: null,
  },
  {
    id: 'citra',
    name: 'Citra / Lime3DS',
    description: 'Nintendo 3DS emulator. The original Citra was discontinued; Lime3DS is the actively maintained fork.',
    flatpakId: 'io.github.lime3ds.Lime3DS',
    emudeckLauncher: 'citra.sh',
    installUrl: 'https://flathub.org/apps/io.github.lime3ds.Lime3DS',
    category: 'emulator',
    biosNote: null,
  },
  {
    id: 'mgba',
    name: 'mGBA',
    description: 'Game Boy, Game Boy Color, and Game Boy Advance emulator.',
    flatpakId: 'io.mgba.mGBA',
    emudeckLauncher: 'mgba.sh',
    installUrl: 'https://flathub.org/apps/io.mgba.mGBA',
    category: 'emulator',
    biosNote: null,
  },
  {
    id: 'snes9x',
    name: 'Snes9x',
    description: 'Super Nintendo emulator.',
    flatpakId: 'org.snes9x.Snes9x',
    emudeckLauncher: 'snes9x.sh',
    installUrl: 'https://flathub.org/apps/org.snes9x.Snes9x',
    category: 'emulator',
    biosNote: null,
  },
  {
    id: 'simple64',
    name: 'Simple64',
    description: 'Nintendo 64 emulator.',
    flatpakId: 'io.github.simple64.simple64',
    emudeckLauncher: 'simple64.sh',
    installUrl: 'https://flathub.org/apps/io.github.simple64.simple64',
    category: 'emulator',
    biosNote: null,
  },
  {
    id: 'yuzu',
    name: 'Yuzu',
    description: 'Nintendo Switch emulator. Removed from Flathub after a legal settlement — install via EmuDeck, which bundles the last working build.',
    flatpakId: 'org.yuzu_emu.yuzu',
    flatpakRemoved: true,
    emudeckLauncher: 'yuzu.sh',
    installUrl: 'https://www.emudeck.com/',
    category: 'emulator',
    biosNote: 'Needs prod.keys + title.keys. Download from RomM → Firmware.',
  },
  {
    id: 'ryujinx',
    name: 'Ryujinx',
    description: 'Nintendo Switch emulator. Removed from Flathub after a Nintendo C&D — install via EmuDeck, which bundles the last working build.',
    flatpakId: 'org.ryujinx.Ryujinx',
    flatpakRemoved: true,
    emudeckLauncher: 'ryujinx.sh',
    installUrl: 'https://www.emudeck.com/',
    category: 'emulator',
    biosNote: 'Needs prod.keys + title.keys, plus system firmware. Download from RomM → Firmware.',
  },
];

async function pathExists(p) {
  if (!p) return false;
  try { await fs.access(p); return true; }
  catch { return false; }
}

export async function checkPrerequisites() {
  const emudeckBase = path.join(HOME, 'Emulation');

  const results = await Promise.all(PREREQUISITES.map(async (p) => {
    let installed = false;
    let viaFlatpak = false;
    let viaEmuDeck = false;
    let flatpakPath = null;
    let emudeckPath = null;
    let flatpakAvailable = null;

    if (p.id === 'flatpak') {
      flatpakAvailable = await pathExists('/usr/bin/flatpak') || await pathExists('/usr/local/bin/flatpak');
      installed = flatpakAvailable;
    } else if (p.id === 'emudeck') {
      const configHit = await pathExists(EMUDECK_CONFIG);
      const launcherHit = await pathExists(EMUDECK_LAUNCHERS);
      installed = configHit || launcherHit;
      emudeckPath = configHit ? EMUDECK_CONFIG : (launcherHit ? EMUDECK_LAUNCHERS : null);
    } else {
      if (p.flatpakId) {
        const fp = path.join(FLATPAK_BASE, p.flatpakId);
        viaFlatpak = await pathExists(fp);
        if (viaFlatpak) flatpakPath = fp;
      }
      if (p.emudeckLauncher) {
        const ed = path.join(EMUDECK_LAUNCHERS, p.emudeckLauncher);
        viaEmuDeck = await pathExists(ed);
        if (viaEmuDeck) emudeckPath = ed;
      }
      installed = viaFlatpak || viaEmuDeck;
    }

    const biosDirFn = BIOS_DIR[p.id];
    const biosDir = biosDirFn ? biosDirFn(emudeckBase) : null;
    let biosDirExists = false;
    if (biosDir) {
      try { const ents = await fs.readdir(biosDir); biosDirExists = ents.length > 0; }
      catch {}
    }

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      installUrl: p.installUrl,
      category: p.category,
      biosNote: p.biosNote || null,
      biosDir,
      biosDirExists,
      installed,
      viaFlatpak: p.id === 'flatpak' ? flatpakAvailable : viaFlatpak,
      viaEmuDeck,
      flatpakPath,
      emudeckPath,
      flatpakRemoved: !!p.flatpakRemoved,
    };
  }));

  return {
    homeDir: HOME,
    flatpakBase: FLATPAK_BASE,
    emudeckLaunchersDir: EMUDECK_LAUNCHERS,
    emudeckConfigDir: EMUDECK_CONFIG,
    prereqs: results,
  };
}
