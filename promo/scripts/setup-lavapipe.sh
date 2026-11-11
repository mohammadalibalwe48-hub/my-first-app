#!/usr/bin/env bash
# Installs Mesa's lavapipe (software Vulkan) into promo/.cache/mesa without root.
# Chrome's WebGL through ANGLE+lavapipe renders ~3-4x faster than its bundled
# SwiftShader on CPU-only machines. render.mjs picks it up automatically.
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
dest="$here/.cache/mesa"
version="$(dpkg-query -W -f='${Version}' mesa-libgallium 2>/dev/null || true)"
version="${version:-25.2.8-0ubuntu0.24.04.4}"
mkdir -p "$dest"
deb="$dest/mesa-vulkan-drivers.deb"
if [ ! -f "$deb" ]; then
  for mirror in http://archive.ubuntu.com/ubuntu http://security.ubuntu.com/ubuntu; do
    curl -fsSL -o "$deb" "$mirror/pool/main/m/mesa/mesa-vulkan-drivers_${version}_amd64.deb" && break
  done
fi
dpkg -x "$deb" "$dest/root"
lib="$dest/root/usr/lib/x86_64-linux-gnu/libvulkan_lvp.so"
cat > "$dest/lvp_icd.json" <<EOF
{ "file_format_version": "1.0.1", "ICD": { "api_version": "1.4.318", "library_path": "$lib" } }
EOF
echo "lavapipe ready: $dest/lvp_icd.json"
