#!/usr/bin/env bash
set -e

INSTALL_DIR="$HOME/.local/bin"
APPIMAGE_NAME="ROMM-SD.AppImage"
APPDIR="$INSTALL_DIR/ROMM-SD.AppDir"
VERSION_FILE="$INSTALL_DIR/romm-sd.version"
DESKTOP_FILE="$HOME/.local/share/applications/romm-sd.desktop"

removed=0

if [ -f "$INSTALL_DIR/$APPIMAGE_NAME" ]; then
  rm -f "$INSTALL_DIR/$APPIMAGE_NAME"
  echo "Removed $INSTALL_DIR/$APPIMAGE_NAME"
  removed=1
fi

if [ -d "$APPDIR" ]; then
  rm -rf "$APPDIR"
  echo "Removed $APPDIR"
  removed=1
fi

if [ -f "$INSTALL_DIR/romm-sd.png" ]; then
  rm -f "$INSTALL_DIR/romm-sd.png"
  echo "Removed $INSTALL_DIR/romm-sd.png"
fi

if [ -f "$VERSION_FILE" ]; then
  rm -f "$VERSION_FILE"
  echo "Removed $VERSION_FILE"
fi

if [ -f "$DESKTOP_FILE" ]; then
  rm -f "$DESKTOP_FILE"
  echo "Removed $DESKTOP_FILE"
  removed=1
fi

if [ "$removed" = "0" ]; then
  echo "ROMM-SD is not installed. Nothing to do."
  exit 0
fi

echo ""
echo "Note: Steam shortcuts and config were not removed."
echo "  • Config:  ~/.config/emudeck-romm-connector/"
echo "  • Logs:    ~/.config/emudeck-romm-connector/app.log"
echo "  • To remove a ROMM-SD Steam entry: open Steam, right-click it, Remove from Library."
echo "  • To remove game shortcuts added by ROMM-SD: same as above for each game, or delete shortcuts.vdf manually."
echo ""
echo "ROMM-SD uninstalled."
