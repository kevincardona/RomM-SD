#!/usr/bin/env bash
# ROMM-SD uninstaller — removes the AppImage, extracted AppDir, icon,
# version sidecar, and .desktop entry.
# Game saves, config, and Steam shortcuts are intentionally left in place.

INSTALL_DIR="$HOME/.local/bin"
APPIMAGE_NAME="ROMM-SD.AppImage"
APPDIR="$INSTALL_DIR/ROMM-SD.AppDir"
VERSION_FILE="$INSTALL_DIR/romm-sd.version"
ICON_FILE="$INSTALL_DIR/romm-sd.png"
DESKTOP_FILE="$HOME/.local/share/applications/romm-sd.desktop"

removed=0

remove_path() {
  local path="$1"
  if [ -e "$path" ] || [ -L "$path" ]; then
    rm -rf "$path"
    echo "  Removed $path"
    removed=1
  fi
}

echo "Uninstalling ROMM-SD …"
echo ""

remove_path "$INSTALL_DIR/$APPIMAGE_NAME"
remove_path "$APPDIR"
remove_path "$VERSION_FILE"
remove_path "$ICON_FILE"
remove_path "$DESKTOP_FILE"

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
fi

echo ""
if [ "$removed" = "0" ]; then
  echo "ROMM-SD does not appear to be installed. Nothing to do."
  exit 0
fi

echo "ROMM-SD removed."
echo ""
echo "The following were left in place:"
echo "  Config & logs : ~/.config/emudeck-romm-connector/"
echo "  Game saves    : ~/Emulation/saves/  (if any were synced)"
echo ""
echo "  To remove config:  rm -rf ~/.config/emudeck-romm-connector/"
echo "  To remove ROMM-SD from Steam: open Steam, right-click it → Remove from Library."
echo "  To remove game shortcuts added by ROMM-SD: same for each game, or edit"
echo "    ~/.steam/steam/userdata/<id>/config/shortcuts.vdf manually."
