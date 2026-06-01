#!/usr/bin/env bash
set -e

INSTALL_DIR="$HOME/.local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"
APPIMAGE_NAME="ROMM-SD.AppImage"
DESKTOP_FILE="romm-sd.desktop"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APPIMAGE_SRC="$SCRIPT_DIR/release/ROMM-SD-0.0.0.AppImage"

if [ ! -f "$APPIMAGE_SRC" ]; then
  echo "Error: AppImage not found at $APPIMAGE_SRC"
  echo "Run 'npm run build' first."
  exit 1
fi

mkdir -p "$INSTALL_DIR" "$DESKTOP_DIR"

cp "$APPIMAGE_SRC" "$INSTALL_DIR/$APPIMAGE_NAME"
chmod +x "$INSTALL_DIR/$APPIMAGE_NAME"

cat > "$DESKTOP_DIR/$DESKTOP_FILE" <<EOF
[Desktop Entry]
Name=ROMM-SD
Comment=Browse and launch your ROMM game library
Exec=$INSTALL_DIR/$APPIMAGE_NAME --no-sandbox
Icon=romm-sd
Terminal=false
Type=Application
Categories=Game;
EOF

echo "Installed to $INSTALL_DIR/$APPIMAGE_NAME"
echo "Desktop entry created at $DESKTOP_DIR/$DESKTOP_FILE"
echo ""
echo "Make sure $INSTALL_DIR is in your PATH:"
echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
echo ""
echo "You can now launch ROMM-SD from your app launcher or run: romm-sd"
