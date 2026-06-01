# ROMM-SD

A game launcher for [RomM](https://github.com/rommapp/romm) that runs natively on Linux, with full controller support — designed for the Steam Deck but works on any desktop.

Browse your RomM library, download games, launch them in their emulators, manage Steam entries, sync saves via EmuDeck, and navigate everything with a controller.

## Features

- Browse your RomM library by platform, collection, or all games
- Controller-first navigation: D-pad/L-stick to move, **A** to confirm, **B** to back out, **Y** to focus search, **START** for game options, **LT/RT** to jump between letters
- Per-game context menu (download, play, add to Steam)
- EmuDeck cloud save push/pull
- BIOS / firmware downloader
- One-click install as a non-Steam game with custom cover art
- Letter-jump sidebar with on-screen letter overlay
- Hold-to-repeat on D-pad and analog stick

## Quick Install (Steam Deck & Linux)

The app is distributed as a self-contained AppImage. Nothing else to install.

### One-line install (recommended)

On any Linux machine, paste this into a terminal:

```bash
curl -fsSL https://raw.githubusercontent.com/kevincardona/romm-sd/master/install-latest.sh | bash
```

It grabs the latest `ROMM-SD.AppImage` from the GitHub Releases, drops it in `~/.local/bin/`, writes a version sidecar so it can detect no-op updates, and writes a `.desktop` entry. Re-run the same command any time to update — it overwrites the old binary in place. If the version hasn't changed, it prints "Already up to date" and exits without downloading.

### Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/kevincardona/romm-sd/master/uninstall.sh | bash
```

Removes the AppImage, version sidecar, and `.desktop` entry. Steam shortcuts and your saved config in `~/.config/emudeck-romm-connector/` are left in place — remove them by hand or via Steam's library.

### Steam Deck

1. Press the Steam button → **Power** → **Switch to Desktop**.
2. Open **Konsole** from the taskbar.
3. Paste the curl command above.
4. The app opens. Go to **Settings**, enter your RomM server URL and credentials, hit **Save & Connect**.

#### Add to Steam (so you can launch from Game Mode)

In the app, go to **Settings** and click **+ Add ROMM-SD to Steam**. Restart Steam. You'll see ROMM-SD in your library — set its compat tool to **Steam Linux Runtime 3.0 (x86-64)** and it works from Gaming Mode.

#### Add games to Steam

In the app, hover a downloaded game, press **A** to open the menu, then **+ Add to Steam**. The game appears in Steam (you must restart Steam). Set the per-game launch options to:
```
QT_XCB_GL_INTEGRATION=none
```
and any per-emulator arguments you need.

### Manual install

If you'd rather not pipe to bash, download the AppImage from the [Releases](../../releases) page and run the bundled `./install.sh` instead.

## Installing EmuDeck paths

ROMM-SD looks for emulators under `~/Emulation/tools/launchers/` (the EmuDeck default) and falls back to Flatpaks. If you use EmuDeck, no extra setup is needed.

For manual installs, either:
- Put your emulator launchers in `~/Emulation/tools/launchers/` with the names `dolphin-emu.sh`, `pcsx2-qt.sh`, `retroarch.sh`, etc., OR
- Install the emulators as Flatpaks from Flathub.

## Building from source

```bash
git clone https://github.com/kevincardona/romm-sd.git
cd romm-sd
npm install
npm run build
./release/ROMM-SD-0.0.0.AppImage
```

The build script runs `vite build` (renderer) then `electron-builder` (AppImage). The output is in `release/`.

## Configuration

Config is stored at `~/.config/emudeck-romm-connector/config.json`. Delete it to reset to defaults.

Logs are at `~/.config/emudeck-romm-connector/app.log`.

## Controller mapping

| Button       | Action                       |
| ------------ | ---------------------------- |
| D-pad / L-stick | Move focus                |
| **A**        | Confirm / activate focused item |
| **B**        | Back / close                 |
| **Y**        | Focus search box             |
| **START**    | Open game options menu       |
| **LB / RB**  | (reserved)                   |
| **LT / RT**  | Jump to previous / next letter |
| `[` / `]`    | Previous / next letter (keyboard) |

## Troubleshooting

**AppImage won't run on Steam Deck / older distro**

Install FUSE 2:
```bash
sudo pacman -S fuse2         # Arch / SteamOS
sudo apt install libfuse2     # Debian / Ubuntu
```
Or extract and run directly:
```bash
./ROMM-SD-0.0.0.AppImage --appimage-extract
./squashfs-root/AppRun
```

**Controller not detected in-game mode**

Steam's Game Mode sometimes doesn't pass through raw controller events. Add this launch option to the ROMM-SD Steam entry:
```
--no-sandbox
```
(it's the default in the installer script). If that doesn't help, the controller may need to be re-paired in desktop mode.

**Game doesn't launch**

ROMM-SD shells out to `xdg-open` for unknown platforms. Install the matching emulator or set up an EmuDeck launcher script.

**Network / auth errors**

Open the in-app **Settings** → **Run EmuDeck Diagnostics** to verify all your emulator install paths are detected.

## Development

```bash
npm run dev       # vite + electron with HMR
npm run lint
npm run build     # production AppImage
```

The renderer lives in `src/`, the Electron main process in `main.js` and `electron/`. Controller events come from the raw joystick interface (`@kmamal/sdl`) because some gamepads (DualSense) trigger CRC errors on SDL2's GameController interface — joystick works around that.
