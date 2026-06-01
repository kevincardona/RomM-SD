// Platforms supported by RomM's built-in emulatorjs (EmulatorJS).
// These are the RetroArch cores / standalone emulators that emulatorjs bundles.
// If a platform is NOT in this set, the "Play in Browser" option is hidden.
//
// EmulatorJS does not support heavyweight 3D-era consoles (gamecube, wii,
// 3ds, ps2, psp, saturn, dreamcast) reliably — RomM's web UI also refuses to
// launch those via emulatorjs.
const SUPPORTED = new Set([
  // 8 / 16-bit Nintendo
  'nes', 'famicom', 'snes', 'supernintendo', 'super_nintendo',
  'n64', 'nintendo_64', 'nintendo-64',
  'gb', 'gameboy', 'game_boy', 'game-boy',
  'gbc', 'gameboycolor', 'game_boy_color', 'game-boy-color',
  'gba', 'gameboyadvance', 'game_boy_advance', 'game-boy-advance',
  'virtualboy', 'virtual_boy', 'virtual-boy',
  'nds', 'nintendods', 'nintendo_ds', 'nintendo-ds',

  // Sega
  'genesis', 'megadrive', 'mega_drive', 'sega-genesis', 'sega_genesis', 'sega-genesis',
  'sms', 'mastersystem', 'master_system', 'master-system',
  'gamegear', 'game_gear', 'game-gear',
  'saturn', 'sega-saturn', 'sega_saturn',  // limited but works
  'dreamcast', 'dc', 'sega-dreamcast',  // works on some EmulatorJS builds
  'segacd', 'sega_cd', 'sega-cd', 'megacd', 'mega_cd', 'mega-cd',
  'sega32x', 'sega_32x', 'sega-32x',
  'sg1000',

  // Sony
  'psx', 'ps1', 'playstation', 'playstation_1', 'playstation-1',
  // psp/ps2 are flaky in emulatorjs; keep them off the supported list

  // Atari
  '2600', 'atari2600', 'atari_2600', 'atari-2600',
  '5200', 'atari5200', 'atari_5200', 'atari-5200',
  '7800', 'atari7800', 'atari_7800', 'atari-7800',
  'lynx', 'atari-lynx', 'atari_lynx', 'atari-lynx',
  'jaguar', 'atari-jaguar', 'atari_jaguar', 'atari-jaguar',

  // Other
  'neogeo', 'neo-geo', 'neo_geo',
  'ngp', 'ngpc', 'neogeopocket', 'neogeopocketcolor',
  'wonderswan', 'wonderswancolor', 'ws', 'wsc',
  'colecovision', 'coleco', 'coleco-vision',
  'intellivision',
  'msx', 'msx2',
  'c64', 'commodore64', 'commodore_64',
  'amiga', 'cd32',
  'zxspectrum', 'spectrum',
  'thomson', 'mo5', 'to7',
  'o2',
  'pcengine', 'pc-engine', 'pc_engine', 'turbografx16', 'turbografx-16', 'tg16', 'tg-16', 'supergrafx', 'pce-cd',
  'channelf', 'creativision',
  'vectrex',
  '3do',
  'mame', 'arcade', 'fbneo', 'neogeo-cd',
  'fds', 'nintendo-fds', 'famicon-disk-system',
  'pokemonmini', 'pokemon-mini',
  'tic80',
  'wasm4',

  // Doom / scummvm
  'doom', 'doom2',
  'scummvm',
]);

const UNSUPPORTED = new Set([
  'gc', 'gamecube', 'ngc', 'nintendo-gamecube', 'nintendo_gamecube', 'nintendo-gamecube',
  'wii', 'nintendo-wii', 'nintendo_wii', 'nintendo-wii',
  'switch', 'nx', 'nintendo-switch', 'nintendo_switch', 'nintendo-switch',
  'ps2', 'ps3', 'psp', 'psvita', 'ps4', 'ps5',
  '3ds', 'n3ds', 'nintendo-3ds', 'nintendo_3ds', 'nintendo-3ds',
  'wiiu', 'wii-u', 'nintendo-wiiu',
  'xbox', 'xbox360',
  'macos', 'windows', 'linux', 'pc',
  'dreamcast', 'dc', // inconsistent; let user try but warn below
]);

export function isBrowserPlaySupported(emuFolder) {
  if (!emuFolder) return false;
  const key = String(emuFolder).toLowerCase();
  if (UNSUPPORTED.has(key)) return false;
  return SUPPORTED.has(key);
}

export function browserPlayUnsupportedReason(emuFolder) {
  if (!emuFolder) return 'Unknown platform';
  const key = String(emuFolder).toLowerCase();
  if (UNSUPPORTED.has(key)) {
    return `${emuFolder} isn't supported by RomM's browser emulator (emulatorjs). It needs a heavyweight 3D core that emulatorjs doesn't bundle. Download the ROM locally and play with RetroArch / Dolphin / Yuzu instead.`;
  }
  return null;
}
