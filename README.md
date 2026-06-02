# ROMM-SD

**Browse your [RomM](https://github.com/rommapp/romm) library, download games, and launch them — all from your couch with a controller.**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![Downloads](https://img.shields.io/github/downloads/kevincardona/romm-sd/total)](https://github.com/kevincardona/romm-sd/releases)
[![Latest release](https://img.shields.io/github/v/release/kevincardona/romm-sd)](https://github.com/kevincardona/romm-sd/releases/latest)

Built for Steam Deck but runs on any Linux desktop. Full controller navigation, one-click Steam integration, BIOS/firmware management, and cloud save sync.

> **⚠ Personal project — not actively maintained.**
> This is a personal tool built for my own use. I share it in case it's useful or serves as inspiration for your own fork. Issues and PRs are welcome but I make no guarantees about response times or continued development. Fork freely under the GPL v3.

---

## Features

| | |
|---|---|
| **Controller-first UI** | D-pad or L-stick to navigate, A to confirm, B to back, Y for search, Start for game menu, LT/RT to jump letters |
| **Library browsing** | By platform, collection, or all games — with search and letter-jump |
| **Download & play** | Download games from your RomM server and launch in the right emulator automatically |
| **Add to Steam** | One-click non-Steam shortcut with cover art for any game, or ROMM-SD itself |
| **Browser play** | Stream games in-browser without downloading (experimental, select platforms) |
| **BIOS & Firmware** | Download BIOS/firmware files from RomM directly into the correct emulator paths |
| **Emulator setup** | Detects installed emulators (EmuDeck, Flatpak, native) and shows BIOS requirements |
| **Cloud saves** | Push/pull saves via EmuDeck's cloud sync |
| **Auto-update** | In-app update checker with one-click install |

---

## Requirements

- A running **[RomM](https://github.com/rommapp/romm)** server (self-hosted)
- **Linux** — Steam Deck (SteamOS) recommended, any distro works
- Emulators installed via **[EmuDeck](https://www.emudeck.com/)** (recommended) or Flatpak

---

## Install

### One-line (Steam Deck & Linux)

Open a terminal (on Steam Deck: press the Steam button → **Power** → **Switch to Desktop**, then open **Konsole**):

```bash
curl -fsSL https://raw.githubusercontent.com/kevincardona/romm-sd/master/install-latest.sh | bash
```

This downloads the latest `ROMM-SD.AppImage`, extracts it for gamescope compatibility, and writes a `.desktop` entry so it appears in your app launcher. Re-run any time to update — it skips the download if already current.

### Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/kevincardona/romm-sd/master/uninstall.sh | bash
```

Removes the app and desktop entry. Config, saves, and Steam shortcuts are left in place.

### Manual install

Download the AppImage from the [Releases](../../releases) page and run the bundled `./install-latest.sh`, or just launch the AppImage directly.

---

## Steam Deck Quick Start

1. Switch to **Desktop Mode** (Steam → Power → Switch to Desktop)
2. Open **Konsole** and run the install command above
3. Launch **ROMM-SD** from the app menu (or run `~/.local/bin/ROMM-SD.AppImage`)
4. Go to **Settings**, enter your RomM server URL and credentials, hit **Save & Connect**
5. In Settings, click **+ Add ROMM-SD to Steam**
6. **Restart Steam**, find ROMM-SD in your library
7. Set its **Compatibility Tool** to `Steam Linux Runtime 3.0 (x86-64)` in Steam properties
8. Switch back to **Game Mode** — ROMM-SD is now in your library

### Adding games to Steam

In the library, select a downloaded game → **+ Add to Steam**. After restarting Steam the game appears in your library with cover art. Set per-game compatibility tool as above if needed.

---

## Emulators & BIOS

Open the **Emulators** tab to:

- **Check which emulators are installed** (EmuDeck, Flatpak, or native)
- **See where each emulator looks for BIOS files**
- **Download BIOS/firmware** directly from your RomM server to the correct path

ROMM-SD looks for emulator launchers in `~/Emulation/tools/launchers/` (EmuDeck default) and falls back to Flatpak installs. The table below shows what's supported:

| Platform | Emulator | Notes |
|---|---|---|
| Multi-system | RetroArch | NES, SNES, Genesis, GBA, PSX, N64, and more |
| GameCube / Wii | Dolphin | |
| PlayStation 2 | PCSX2 | Requires PS2 BIOS |
| PlayStation 3 | RPCS3 | Firmware installed inside RPCS3 |
| PlayStation 1 | DuckStation | Requires PS1 BIOS |
| PSP | PPSSPP | |
| Nintendo 3DS | Lime3DS | Fork of Citra |
| Game Boy / GBA | mGBA | |
| Super Nintendo | Snes9x | |
| Nintendo 64 | Simple64 | |
| Nintendo Switch | Yuzu / Ryujinx | Requires decryption keys + system firmware. Both removed from Flathub — install via EmuDeck |

---

## Controller Mapping

| Input | Action |
|---|---|
| D-pad / L-stick | Move focus |
| **A** | Confirm / activate |
| **B** | Back / close modal |
| **Y** | Focus search |
| **Start** | Open game options |
| **LT / RT** | Jump to previous / next letter |
| `[` / `]` | Previous / next letter (keyboard) |

---

## Configuration

Config is stored at `~/.config/emudeck-romm-connector/config.json` — delete it to reset to defaults.

Logs are at `~/.config/emudeck-romm-connector/app.log`.

---

## Troubleshooting

**AppImage won't launch on Steam Deck / older distro**

The install script automatically extracts the AppImage to avoid needing FUSE. If you're running it directly without extracting:

```bash
# Arch / SteamOS
sudo pacman -S fuse2
# Debian / Ubuntu
sudo apt install libfuse2
```

Or extract and run manually:
```bash
./ROMM-SD.AppImage --appimage-extract
./squashfs-root/AppRun --no-sandbox
```

**Controller not responding in Game Mode**

Make sure the launch option `--no-sandbox` is set on the ROMM-SD Steam entry (the installer sets this by default). If the controller still doesn't respond, re-pair it in Desktop Mode.

**Game won't launch**

Open the **Emulators** tab and check that the emulator for that platform is installed. ROMM-SD matches games to emulators by platform slug — if a platform is unknown it falls back to `xdg-open`.

**Images not appearing in Steam library after Add to Steam**

Restart Steam fully (not just the UI). Steam reads non-Steam game artwork on startup. If images still don't appear, check that the game was added (right-click a shortcut in Steam → Manage).

**Switch games say "firmware not installed" in Ryujinx**

Keys (prod.keys / title.keys) and system firmware are two separate things:
- **Keys** — download from RomM → Firmware tab; ROMM-SD installs them automatically
- **System firmware** — download from RomM → Firmware tab, then click **Install to Ryujinx** in the firmware card

**Saves not syncing**

Cloud Saves requires EmuDeck's cloud sync to be configured. Enable the feature in Settings → Experimental → Save Sync. EmuDeck must be installed and your cloud provider set up.

---

## Building from Source

```bash
git clone https://github.com/kevincardona/romm-sd.git
cd romm-sd
npm install
npm run dev       # Vite + Electron with HMR
npm run build     # Production AppImage → release/
```

The renderer lives in `src/`, the Electron main process in `main.js` and `electron/`. Controller events come from the raw joystick interface (`@kmamal/sdl`) — this works around CRC errors some gamepads (DualSense) trigger on SDL2's higher-level GameController API.

---

## License

GPL v3 — see [LICENSE](LICENSE). You're free to fork, modify, and redistribute under the same terms.

---

## Disclaimer

This is a personal project, not an official or actively maintained product. It was built for personal use and shared for anyone who finds it useful or wants a starting point for their own version.

- **No warranty** — use at your own risk
- **No support SLA** — issues and PRs may go unanswered
- **Not affiliated** with RomM, EmuDeck, Valve, or any emulator project

If you build something cool on top of it, a shoutout or link back is appreciated but not required.

---

## Feedback & Issues

File bugs and feature requests at [github.com/kevincardona/romm-sd/issues](https://github.com/kevincardona/romm-sd/issues).
