#!/bin/sh
set -eu

account=aalomari
install_dir=/home/aalomari/marketplace-ah
service=marketplace-ah-web.service
unit_file=/etc/systemd/system/$service
bundle=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)

fail() { printf '%s\n' "$*" >&2; exit 1; }

for command in id uname getent realpath systemctl ss install runuser cp; do
    command -v "$command" >/dev/null || fail "Missing prerequisite: $command"
done
[ "$(id -u)" = 0 ] || fail 'Run this installer with sudo from the extracted bundle.'
[ "$(uname -s):$(uname -m)" = Linux:x86_64 ] || fail 'This bundle requires Debian Linux on x86-64.'
[ -r /etc/os-release ] || fail 'Cannot identify the operating system.'
. /etc/os-release
[ "${ID:-}" = debian ] || fail 'This bundle requires Debian.'
[ -d /run/systemd/system ] || fail 'The VM must be running systemd.'
[ -s /etc/ssl/certs/ca-certificates.crt ] || fail 'The system CA bundle is required for HTTPS to API Gateway.'

account_entry=$(getent passwd "$account") || fail "Missing account: $account"
IFS=: read -r _ _ account_uid _ _ account_home _ <<EOF_ACCOUNT
$account_entry
EOF_ACCOUNT
[ "$account_uid" != 0 ] && [ "$account_home" = /home/aalomari ] || fail 'The VM account does not match the expected non-root user and home.'
[ -d "$account_home" ] && [ "$(realpath "$account_home")" = "$account_home" ] || fail 'The account home must be a real directory at /home/aalomari.'

[ ! -e "$install_dir" ] && [ ! -L "$install_dir" ] || fail "Refusing to replace existing path: $install_dir"
[ ! -e "$unit_file" ] && [ ! -L "$unit_file" ] || fail "Refusing to replace existing unit: $unit_file"
load_state=$(systemctl show --property=LoadState --value "$service") ||
    [ "$load_state" = not-found ] || fail 'Cannot check the systemd unit namespace.'
[ "$load_state" = not-found ] || fail "Refusing to replace existing systemd service: $service"
if systemctl is-enabled --quiet "$service"; then
    fail "Refusing to replace existing service enablement: $service"
fi
[ ! -e "/etc/systemd/system/multi-user.target.wants/$service" ] &&
    [ ! -L "/etc/systemd/system/multi-user.target.wants/$service" ] ||
    fail "Refusing to replace existing service enablement: $service"

listeners=$(ss -H -ltn 'sport = :9090') || fail 'Cannot check port 9090.'
[ -z "$listeners" ] || fail 'Port 9090 already has a TCP listener. No files were installed.'
for source in caddy Caddyfile "$service" www/index.html; do
    [ -f "$bundle/$source" ] || fail "Incomplete bundle: $source"
done
[ -x "$bundle/caddy" ] || fail 'The bundled Caddy binary must be executable.'
runuser -u "$account" -- "$bundle/caddy" validate --config "$bundle/Caddyfile" --adapter caddyfile

# mkdir and shell noclobber guard against replacing paths created after preflight.
mkdir -m 0755 "$install_dir"
install -m 0755 "$bundle/caddy" "$install_dir/caddy"
install -m 0644 "$bundle/Caddyfile" "$install_dir/Caddyfile"
cp -R "$bundle/www" "$install_dir/www"
install -d -m 0750 -o "$account" "$install_dir/state"
(umask 022; set -C; cat "$bundle/$service" > "$unit_file")

systemctl daemon-reload
systemctl enable --now "$service"
systemctl is-active --quiet "$service"
printf 'My Marketplace is running on HTTP port 9090 (%s).\n' "$service"
