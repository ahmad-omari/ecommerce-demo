# Install My Marketplace on the shared VM

This bundle is for Debian x86-64. It contains the Angular production site in `www/`, the official Caddy 2.11.9 standalone binary, a Caddyfile, an installer, and a dedicated systemd unit. The VM needs systemd, the existing `aalomari` account with sudo access, a system CA bundle, and an available TCP port 9090. The installer checks these prerequisites. Node.js, npm, and Angular CLI are needed only on the computer that builds the bundle.

## Upload and install

From Google Cloud's browser SSH session as `aalomari`, use **UPLOAD FILE** to upload `marketplace-ah-vm.tar.gz` to your home directory. Run:

```bash
cd /home/aalomari
extract_dir=$(mktemp -d /home/aalomari/marketplace-upload.XXXXXX)
tar -xzf marketplace-ah-vm.tar.gz -C "$extract_dir"
sudo "$extract_dir/marketplace-ah-vm/install.sh"
```

The first-install installer refuses to overwrite an existing installation directory or service. It installs into `/home/aalomari/marketplace-ah` and enables `marketplace-ah-web.service`, which runs Caddy as `aalomari` independently of SSH. Port 8080 remains available to the professor's application. Port 9090 must already be reachable via the VM's existing network configuration.

## Verify on the VM

```bash
systemctl status marketplace-ah-web.service --no-pager
curl -fsS http://localhost:9090/
curl -fsS http://localhost:9090/api/health
sudo journalctl -u marketplace-ah-web.service -n 50 --no-pager
```

Open `http://VM_EXTERNAL_IP:9090` in the browser. Requests under `/api` are sent over HTTPS to API Gateway. Angular route reloads are served by the VM.

For this initial HTTP demo, the existing Cloud Run backend needs `COOKIE_SECURE=false` so the browser can send the session cookie. Use `COOKIE_SECURE=true` when the storefront uses HTTPS. The HTTP browser-to-VM hop is unencrypted. Use the class demo accounts for this setup.
