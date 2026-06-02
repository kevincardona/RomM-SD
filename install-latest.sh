#!/usr/bin/env bash
# ROMM-SD installer — downloads the latest AppImage, extracts it for
# gamescope/SteamOS compatibility, and writes a .desktop entry.
# Safe to re-run: it updates in place and skips if already current.

set -euo pipefail

REPO="kevincardona/romm-sd"
INSTALL_DIR="$HOME/.local/bin"
APPIMAGE_NAME="ROMM-SD.AppImage"
VERSION_FILE="$INSTALL_DIR/romm-sd.version"
DEST="$INSTALL_DIR/$APPIMAGE_NAME"
APPDIR="$INSTALL_DIR/ROMM-SD.AppDir"
DESKTOP_DIR="$HOME/.local/share/applications"
ICON_DEST="$INSTALL_DIR/romm-sd.png"

# ── helpers ──────────────────────────────────────────────────────────────��─

die() { echo "ERROR: $*" >&2; exit 1; }
info() { echo "  $*"; }

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "'$1' is required but not found."
}

need_cmd curl

# ── fetch latest release ───────────────────────────────────────────────────

echo "Fetching latest release from github.com/$REPO …"
release_json=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest") \
  || die "Could not reach GitHub API. Check your internet connection."

tag=$(printf '%s' "$release_json" | grep -m1 '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
url=$(printf '%s' "$release_json" \
  | grep -oE '"browser_download_url":[[:space:]]*"[^"]+\.AppImage"' \
  | head -n1 \
  | sed -E 's/.*"([^"]+)".*/\1/')

[ -n "$tag" ] || die "Could not parse tag from GitHub API response."
[ -n "$url" ] || die "No .AppImage asset found in the latest release at https://github.com/$REPO/releases"

# ── skip if already current ────────────────────────────────────────────────

if [ -f "$DEST" ] && [ -f "$VERSION_FILE" ]; then
  current=$(cat "$VERSION_FILE" 2>/dev/null || true)
  if [ "$current" = "$tag" ]; then
    echo "Already up to date ($tag). Nothing to do."
    echo "Re-run to force a reinstall: rm $VERSION_FILE && $0"
    exit 0
  fi
  info "Updating $current → $tag …"
else
  info "Installing $tag …"
fi

# ── download ───────────────────────────────────────────────────────────────

mkdir -p "$INSTALL_DIR" "$DESKTOP_DIR"

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT

curl -fL --progress-bar -o "$tmp" "$url" || die "Download failed."
chmod +x "$tmp"
mv -f "$tmp" "$DEST"
trap - EXIT

printf '%s' "$tag" > "$VERSION_FILE"
info "Saved to $DEST"

# ── extract (required for gamescope / SteamOS without fuse2) ──────────────

echo "Extracting AppImage for gamescope compatibility …"
rm -rf "$APPDIR"

# Run extraction from INSTALL_DIR so squashfs-root lands there
( cd "$INSTALL_DIR" && "$DEST" --appimage-extract >/dev/null 2>&1 ) || true

if [ -d "$INSTALL_DIR/squashfs-root" ]; then
  mv "$INSTALL_DIR/squashfs-root" "$APPDIR"
  info "Extracted to $APPDIR"
else
  echo "  Warning: extraction produced no squashfs-root."
  echo "  The AppImage will still run on systems with libfuse2 installed."
  echo "  On SteamOS / Arch: sudo pacman -S fuse2"
  echo "  On Debian / Ubuntu: sudo apt install libfuse2"
fi

# ── icon ──────────────────────────────────────────────────────────────────

if [ -d "$APPDIR" ]; then
  for candidate in \
    "$APPDIR/build/icon.png" \
    "$APPDIR/usr/share/icons/hicolor/512x512/apps/romm-sd.png" \
    "$APPDIR/.DirIcon" \
    "$APPDIR/romm-sd.png"
  do
    if [ -f "$candidate" ]; then
      cp -f "$candidate" "$ICON_DEST" && info "Icon copied from $candidate" && break
    fi
  done
fi

# ── desktop entry ─────────────────────────────────────────────────────────

# Prefer extracted AppRun (works without fuse2); fall back to AppImage
if [ -f "$APPDIR/AppRun" ]; then
  EXEC_CMD="$APPDIR/AppRun --no-sandbox"
else
  EXEC_CMD="$DEST --no-sandbox"
fi

ICON_LINE=""
[ -f "$ICON_DEST" ] && ICON_LINE="Icon=$ICON_DEST"

cat > "$DESKTOP_DIR/romm-sd.desktop" <<EOF
[Desktop Entry]
Name=ROMM-SD
GenericName=Game Launcher
Comment=Browse and launch your RomM library on Steam Deck & Linux
Exec=$EXEC_CMD
$ICON_LINE
Terminal=false
Type=Application
Categories=Game;Emulator;
Keywords=RomM;ROM;emulator;retro;SteamDeck;
StartupWMClass=romm-sd
EOF

# Refresh app menu if possible (desktop mode on SteamOS / GNOME / KDE)
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
fi

# ── PATH hint ─────────────────────────────────────────────────────────────

echo ""
echo "✓ ROMM-SD $tag installed."
echo ""
echo "Launch options:"
echo "  • App menu: look for 'ROMM-SD' in your application launcher"
echo "  • Terminal: $DEST"

if ! printf '%s' "$PATH" | tr ':' '\n' | grep -qxF "$INSTALL_DIR"; then
  echo ""
  echo "  '$INSTALL_DIR' is not in your PATH."
  echo "  Add it for command-line use:"
  echo "    echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.bashrc"
  echo "  (On SteamOS, use ~/.bash_profile or ~/.config/fish/config.fish)"
fi

echo ""
echo "Add ROMM-SD to Steam:"
echo "  Open ROMM-SD → Settings → '+ Add ROMM-SD to Steam', then restart Steam."
echo ""
echo "Update anytime:"
echo "  curl -fsSL https://raw.githubusercontent.com/$REPO/master/install-latest.sh | bash"
echo "Uninstall:"
echo "  curl -fsSL https://raw.githubusercontent.com/$REPO/master/uninstall.sh | bash"
