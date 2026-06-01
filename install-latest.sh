#!/usr/bin/env bash
set -e

REPO="kevincardona/romm-sd"
INSTALL_DIR="$HOME/.local/bin"
APPIMAGE_NAME="ROMM-SD.AppImage"
VERSION_FILE="$INSTALL_DIR/romm-sd.version"
DEST="$INSTALL_DIR/$APPIMAGE_NAME"
APPDIR="$INSTALL_DIR/ROMM-SD.AppDir"

echo "Fetching latest release from $REPO..."
release_json=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest")
tag=$(echo "$release_json" | grep -m1 '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
url=$(echo "$release_json" | grep -oE '"browser_download_url":\s*"[^"]+\.AppImage"' | head -n1 | sed -E 's/.*"([^"]+)".*/\1/')

if [ -z "$url" ] || [ -z "$tag" ]; then
  echo "Error: no AppImage asset found in the latest release."
  echo "Make sure there's a release at https://github.com/$REPO/releases"
  exit 1
fi

echo "Latest version: $tag"
echo "Asset: $url"

if [ -f "$DEST" ]; then
  current_tag=""
  if [ -f "$VERSION_FILE" ]; then
    current_tag=$(cat "$VERSION_FILE" 2>/dev/null || true)
  fi
  if [ -n "$current_tag" ] && [ "$current_tag" = "$tag" ]; then
    echo "Already up to date ($tag). Nothing to do."
    exit 0
  fi
  echo "Updating from ${current_tag:-unknown} to $tag..."
else
  echo "Installing $tag..."
fi

mkdir -p "$INSTALL_DIR"
tmp=$(mktemp)
curl -fL --progress-bar -o "$tmp" "$url"
chmod +x "$tmp"
mv -f "$tmp" "$DEST"

echo "$tag" > "$VERSION_FILE"

if [ -d "$APPDIR" ]; then
  rm -rf "$APPDIR"
fi
echo "Extracting AppImage (needed for gamescope on SteamOS)..."
"$DEST" --appimage-extract >/dev/null 2>&1
if [ -d "squashfs-root" ]; then
  mv squashfs-root "$APPDIR"
  if [ -f "$DEST" ] && [ ! -f "$INSTALL_DIR/romm-sd.png" ]; then
    cp "$APPDIR/build/icon.png" "$INSTALL_DIR/romm-sd.png" 2>/dev/null || \
    cp "$APPDIR/.DirIcon" "$INSTALL_DIR/romm-sd.png" 2>/dev/null || true
  fi
  echo "Extracted to $APPDIR"
else
  echo "Warning: extraction failed; AppImage will still work outside gamescope."
fi

cat > "$HOME/.local/share/applications/romm-sd.desktop" <<EOF
[Desktop Entry]
Name=ROMM-SD
Comment=Browse and launch your ROMM game library
Exec=$APPDIR/AppRun romm-sd --no-sandbox
Icon=$INSTALL_DIR/romm-sd.png
Terminal=false
Type=Application
Categories=Game;
EOF

echo ""
echo "Installed to $DEST ($tag)"
echo "Desktop entry created."
echo ""
echo "Make sure $INSTALL_DIR is in your PATH:"
echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
echo ""
echo "Re-run this script anytime to update."
echo "To uninstall:"
echo "  curl -fsSL https://raw.githubusercontent.com/$REPO/master/uninstall.sh | bash"
