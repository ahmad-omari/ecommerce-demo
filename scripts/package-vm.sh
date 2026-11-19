#!/bin/sh
set -eu

cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)"
root=$PWD
version=2.11.9
linux_asset=caddy_${version}_linux_amd64.tar.gz
checksums=caddy_${version}_checksums.txt
release=https://github.com/caddyserver/caddy/releases/download/v$version

npm run build:frontend
frontend=$root/dist/ecommerce-demo/browser
test -f "$frontend/index.html"

stage=$(mktemp -d "$root/dist/marketplace-vm.XXXXXX")
trap 'rm -rf "$stage"' EXIT
bundle=$stage/marketplace-ah-vm
mkdir "$bundle"

curl -fsSL --retry 2 "$release/$checksums" -o "$stage/$checksums"
curl -fsSL --retry 2 "$release/$linux_asset" -o "$stage/$linux_asset"
(
    cd "$stage"
    awk -v asset="$linux_asset" '$2 == asset || $2 == "*" asset {print; found++} END {if (found != 1) exit 1}' "$checksums" > linux-amd64.sha256
    shasum -a 256 -c linux-amd64.sha256
    tar -xzf "$linux_asset" -C "$bundle" caddy
)
chmod 0755 "$bundle/caddy"
cp -R "$frontend" "$bundle/www"
cp deploy/vm/Caddyfile deploy/vm/install.sh deploy/vm/marketplace-ah-web.service deploy/vm/README.md "$bundle/"
COPYFILE_DISABLE=1 tar -czf "$stage/marketplace-ah-vm.tar.gz" -C "$stage" marketplace-ah-vm
mv "$stage/marketplace-ah-vm.tar.gz" "$root/marketplace-ah-vm.tar.gz"
printf '%s\n' "$root/marketplace-ah-vm.tar.gz"
