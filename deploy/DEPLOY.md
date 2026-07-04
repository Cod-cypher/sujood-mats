# Deploying Sujood (single server on Ubuntu)

Everything runs on your Ubuntu box (`167.233.120.70`) behind Nginx:

```
Browser ──HTTPS──> sujoodmats.com ──> Nginx (TLS via certbot) ──> Express :3001
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
Do this first — certbot can't issue an HTTPS certificate until DNS points at the server.

---

## 2. Install Node.js 20

SSH into the server as a sudo user. (Nginx is already installed on your box.)

```bash
# Node.js 20 + git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

# certbot for Let's Encrypt (nginx plugin)
sudo apt-get install -y certbot python3-certbot-nginx
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
  Nginx proxies to this same port (see `deploy/nginx-sujood.conf`) — keep them in sync.
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

## 6. Run it with PM2 (keeps it alive, restarts on boot)

Install PM2 once, globally:

```bash
sudo npm install -g pm2
```

Start the app from the repo root (the `ecosystem.config.cjs` sets `NODE_ENV=production`
and `PORT=3001`):

```bash
cd /opt/sujood-mats
pm2 start ecosystem.config.cjs
pm2 status                 # the "sujood" app should show "online"
pm2 logs sujood            # live logs (Ctrl-C to stop watching)
```

Make it survive reboots:

```bash
pm2 save                   # remember the current process list
pm2 startup                # prints a `sudo env ... systemctl enable ...` line
# copy/paste and run that exact line, then:
pm2 save
```

Handy PM2 commands: `pm2 restart sujood`, `pm2 stop sujood`, `pm2 logs sujood`,
`pm2 monit`. Run PM2 as the same user each time (e.g. whoever you're logged in as).

---

## 7. Put Nginx in front (HTTPS)

Add the app's server block and enable it:

```bash
sudo cp deploy/nginx-sujood.conf /etc/nginx/sites-available/sujoodmats.conf
sudo ln -s /etc/nginx/sites-available/sujoodmats.conf /etc/nginx/sites-enabled/
sudo nginx -t                         # test config — must say "syntax is ok"
sudo systemctl reload nginx
```

Now the site is reachable on HTTP. Get a Let's Encrypt certificate — certbot edits the
nginx config to add HTTPS, sets up the HTTP→HTTPS redirect, and auto-renews:

```bash
sudo certbot --nginx -d sujoodmats.com -d www.sujoodmats.com
```

- When asked, choose to **redirect HTTP to HTTPS**.
- Renewal is automatic (a systemd timer runs `certbot renew`). Test it with
  `sudo certbot renew --dry-run`.

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

Port 3001 stays internal (only Nginx talks to it). Postgres (5432) connects over
localhost, so it doesn't need to be exposed publicly.

---

## Redeploying later

```bash
cd /opt/sujood-mats
git pull
npm ci
npm run db:deploy      # only does something if migrations changed
npm run build
pm2 restart sujood
```

---

## Troubleshooting

- **Certificate not issued / site not HTTPS:** DNS for `sujoodmats.com` must resolve to
  `167.233.120.70` before certbot can issue a cert. Re-run `sudo certbot --nginx -d sujoodmats.com -d www.sujoodmats.com`
  and read its output. Also make sure ports 80/443 are open in the firewall.
- **502 Bad Gateway from Nginx:** the app isn't running on :3001, or the `proxy_pass` port
  in the nginx config doesn't match `PORT` in `.env`. Check `pm2 status` and `pm2 logs sujood`,
  and `sudo tail -f /var/log/nginx/error.log`.
- **App won't start / DB errors:** verify `DATABASE_URL` in `/opt/sujood-mats/.env` and that
  Postgres is running (`sudo systemctl status postgresql`). Re-run `npm run db:deploy`.
  See the crash reason with `pm2 logs sujood --err`.
- **Changed code but site looks the same:** you need to rebuild (`npm run build`) and
  `pm2 restart sujood`. The frontend is a static bundle baked at build time.

---

## Notes

- **Want a CDN / GitHub Pages later?** You can move the frontend off the server without
  touching the backend: build with `VITE_API_URL=https://api.sujoodmats.com`, set
  `CORS_ORIGIN` in the server `.env`, and serve the API from an `api.` subdomain. The code
  already supports that split; this single-origin setup is just the simpler default.
