# Deploying Sujood (single server on Ubuntu)

Everything runs on your Ubuntu box (`167.233.120.70`) behind Caddy:

```
Browser ──HTTPS──> sujoodmats.com ──> Caddy (auto HTTPS) ──> Express :3001
                                                                │
                                          serves the built frontend (dist/)
                                          AND the /api/* routes  ──> PostgreSQL
```

Frontend and API share one origin, so there's no CORS, no separate API URL, and
one deploy. The Express server serves the built frontend in production mode.

---

## 1. DNS (at your domain registrar)

| Type | Name  | Value            |
| ---- | ----- | ---------------- |
| A    | `@`   | `167.233.120.70` |
| A    | `www` | `167.233.120.70` |

Check propagation: `dig sujoodmats.com +short` should return `167.233.120.70`.
Do this first — Caddy can't get an HTTPS certificate until DNS points at the server.

---

## 2. Install Node.js 20 and Caddy

SSH into the server as a sudo user:

```bash
# Node.js 20 + git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

# Caddy (auto-HTTPS reverse proxy)
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update && sudo apt-get install -y caddy
```

---

## 3. Get the code

```bash
sudo adduser --system --group sujood
sudo mkdir -p /opt/sujood-mats
sudo chown sujood:sujood /opt/sujood-mats

sudo -u sujood git clone https://github.com/Cod-cypher/sujood-mats.git /opt/sujood-mats
cd /opt/sujood-mats
```

---

## 4. Create the server `.env`

```bash
sudo -u sujood tee /opt/sujood-mats/.env >/dev/null <<'EOF'
DATABASE_URL="postgresql://myappuser:strongpassword@localhost:5432/myappdb?schema=public"
PORT=3001
EOF
```

- `PORT=3001` because port 3000 is already used by another app on this server.
  Caddy proxies to this same port (see `deploy/Caddyfile`) — keep them in sync.
- The DB is on the same box, so `localhost` works.
- `CORS_ORIGIN` is **not needed** here (same origin). Leave it out.
- Add `GEMINI_API_KEY="..."` if you want the AI advisor live; otherwise it runs in
  offline fallback mode.

---

## 5. Install, migrate, build

```bash
cd /opt/sujood-mats
sudo -u sujood npm ci
sudo -u sujood npm run db:deploy   # applies Prisma migrations to Postgres
sudo -u sujood npm run build       # builds frontend + server into dist/
```

Quick local check that the app boots and serves both:

```bash
sudo -u sujood env PORT=3001 NODE_ENV=production node dist/server.cjs &
curl -s http://127.0.0.1:3001/api/health          # -> {"status":"healthy",...}
curl -s http://127.0.0.1:3001/ | grep '<title>'   # -> the page title
kill %1
```

---

## 6. Run it with systemd (keeps it alive, restarts on boot)

```bash
sudo cp deploy/sujood-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now sujood-api
sudo systemctl status sujood-api      # should be "active (running)"
journalctl -u sujood-api -f           # live logs (Ctrl-C to stop watching)
```

---

## 7. Put Caddy in front (HTTPS)

```bash
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
journalctl -u caddy -f                # watch it fetch the certificate
```

Caddy gets a Let's Encrypt cert for `sujoodmats.com` automatically (DNS must resolve first).

Then from your laptop:

```bash
curl https://sujoodmats.com/api/health
```

Open **https://sujoodmats.com** in a browser — the store loads and works, all on HTTPS.

---

## 8. Firewall (recommended)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

Port 3001 stays internal (only Caddy talks to it). Postgres (5432) connects over
localhost, so it doesn't need to be exposed publicly.

---

## Redeploying later

```bash
cd /opt/sujood-mats
sudo -u sujood git pull
sudo -u sujood npm ci
sudo -u sujood npm run db:deploy      # only does something if migrations changed
sudo -u sujood npm run build
sudo systemctl restart sujood-api
```

---

## Troubleshooting

- **Certificate not issued / site not HTTPS:** DNS for `sujoodmats.com` must resolve to
  `167.233.120.70` before Caddy can get a cert. `journalctl -u caddy -f` shows the ACME process.
- **502 Bad Gateway from Caddy:** the app isn't running on :3001, or the Caddyfile port
  doesn't match `PORT` in `.env`. Check `sudo systemctl status sujood-api` and
  `journalctl -u sujood-api -f`.
- **App won't start / DB errors:** verify `DATABASE_URL` in `/opt/sujood-mats/.env` and that
  Postgres is running (`sudo systemctl status postgresql`). Re-run `npm run db:deploy`.
- **Changed code but site looks the same:** you need to rebuild (`npm run build`) and
  `sudo systemctl restart sujood-api`. The frontend is a static bundle baked at build time.

---

## Notes

- **Want a CDN / GitHub Pages later?** You can move the frontend off the server without
  touching the backend: build with `VITE_API_URL=https://api.sujoodmats.com`, set
  `CORS_ORIGIN` in the server `.env`, and serve the API from an `api.` subdomain. The code
  already supports that split; this single-origin setup is just the simpler default.
