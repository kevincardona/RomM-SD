import path from 'node:path';
import os from 'node:os';

const HOME = os.homedir();

function expandHome(p) {
  if (!p) return p;
  return p.startsWith('~') ? p.replace('~', HOME) : p;
}

// RomM fs_slug → EmuDeck-known subfolder name
// Most slugs are already the right name. This map covers exceptions / known
// mismatches so firmware lands where the emulator will actually find it.
const SLUG_ALIASES = {
  'nintendo-64': 'n64',
  'nintendo-gamecube': 'gc',
  'gamecube': 'gc',
  'nintendo-ds': 'nds',
  'nintendo-3ds': '3ds',
  'game-boy': 'gb',
  'game-boy-advance': 'gba',
  'game-boy-color': 'gbc',
  'sega-genesis': 'megadrive',
  'genesis': 'megadrive',
  'sega-cd': 'segacd',
  'sega-32x': 'sega32x',
  'turbografx-16': 'tg16',
  'pc-engine': 'tg16',
  'pc-engine-cd': 'tg16',
  'pc-engine-supergrafx': 'tg16',
  'wonderswan-color': 'wonderswan',
  'wonderswan': 'wonderswan',
  'virtual-boy': 'virtualboy',
  'neo-geo': 'neogeo',
  'neogeo': 'neogeo',
  'atari-2600': '2600',
  'atari-5200': '5200',
  'atari-7800': '7800',
  'lynx': 'lynx',
  'game-gear': 'gamegear',
  'dreamcast': 'dc',
  'saturn': 'saturn',
};

// Switch keys are NOT in EmuDeck's bios folder — emulators look in their own
// config dirs. This special-cases prod.keys / title.keys to the right places
// so they work out of the box after download.
const SWITCH_KEY_RULES = [
  { match: /^prod\.keys?$/i, yuzu: 'keys', ryujinx: 'system' },
  { match: /^title\.keys?$/i, yuzu: 'keys', ryujinx: 'system' },
];

function isSwitchKey(filename) {
  return SWITCH_KEY_RULES.some(r => r.match.test(filename));
}

function switchKeyTargets(filename) {
  const rule = SWITCH_KEY_RULES.find(r => r.match.test(filename));
  if (!rule) return [];
  return [
    { emulator: 'Yuzu', path: `${HOME}/.config/yuzu/${rule.yuzu}/${filename}` },
    { emulator: 'Ryujinx', path: `${HOME}/.config/Ryujinx/${rule.ryujinx}/${filename}` },
  ];
}

// Per-core RetroArch expectations. Some cores look in their own subfolder
// instead of the platform folder. When a firmware file is known to belong to
// such a core, we route it there. Currently best-effort.
const CORE_FIRMWARE_FOLDERS = {
  // 'snes_bspack': 'snes' — example, not exhaustive
};

function chooseSubfolder({ fsSlug, slug, fileName }) {
  if (!fsSlug && !slug) return null;
  const lower = (fsSlug || slug).toLowerCase();
  return SLUG_ALIASES[lower] || lower;
}

export function resolveInstallPaths({ fsSlug, slug, fileName, emudeckPath, layout = 'emudeck', homeDir }) {
  const expandedBios = expandHome(emudeckPath || '~/Emulation/roms').replace(/\/roms$/, '/bios');
  const expandedRoms = expandHome(emudeckPath || '~/Emulation/roms');

  // Switch keys always go to emulator config dirs, regardless of layout.
  if (slug === 'switch' || fsSlug === 'switch' || isSwitchKey(fileName)) {
    return switchKeyTargets(fileName).map(t => ({ ...t, kind: 'switch-key' }));
  }

  const sub = chooseSubfolder({ fsSlug, slug, fileName });
  const fileNameOnly = fileName;

  if (layout === 'flat') {
    return [{ emulator: 'EmuDeck BIOS root', path: `${expandedBios}/${fileNameOnly}` }];
  }
  if (layout === 'auto') {
    // EmuDeck convention: subfolder per platform.
    return sub
      ? [{ emulator: 'EmuDeck', path: `${expandedBios}/${sub}/${fileNameOnly}` }]
      : [{ emulator: 'EmuDeck BIOS root', path: `${expandedBios}/${fileNameOnly}` }];
  }
  // default: 'emudeck' — same as auto
  return sub
    ? [{ emulator: 'EmuDeck', path: `${expandedBios}/${sub}/${fileNameOnly}` }]
    : [{ emulator: 'EmuDeck BIOS root', path: `${expandedBios}/${fileNameOnly}` }];
}

export function biosBasePath(emudeckPath) {
  return expandHome(emudeckPath || '~/Emulation/roms').replace(/\/roms$/, '/bios');
}
