# Maintainer: Kevin Cardona
pkgname=romm-sd
pkgver=0.0.0
pkgrel=1
pkgdesc="Browse and launch your ROMM game library from your desktop or Steam"
arch=('x86_64')
url="https://github.com/kevincardona/romm-sd"
license=('MIT')
depends=('fuse2')
options=('!strip')
source=("$pkgname-$pkgver.AppImage::https://github.com/kevincardona/romm-sd/releases/download/v$pkgver/ROMM-SD-$pkgver.AppImage")
sha256sums=('SKIP')

prepare() {
  chmod +x "$pkgname-$pkgver.AppImage"
}

package() {
  install -Dm755 "$pkgname-$pkgver.AppImage" "$pkgdir/usr/bin/romm-sd"

  install -Dm644 /dev/stdin "$pkgdir/usr/share/applications/romm-sd.desktop" <<EOF
[Desktop Entry]
Name=ROMM-SD
Comment=Browse and launch your ROMM game library
Exec=/usr/bin/romm-sd --no-sandbox
Icon=romm-sd
Terminal=false
Type=Application
Categories=Game;
EOF
}
