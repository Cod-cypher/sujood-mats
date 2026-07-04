// PM2 process config for the Sujood server.
// Usage on the Ubuntu box (from the repo root):
//   pm2 start ecosystem.config.cjs
//   pm2 save            # persist the process list
//   pm2 startup         # print the command to enable start-on-boot
//
// DATABASE_URL is read from the local .env by dotenv at runtime.

module.exports = {
  apps: [
    {
      name: "sujood",
      cwd: __dirname,
      script: "dist/server.cjs",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      autorestart: true,
      max_restarts: 10,
      // Optional: keep a bounded log
      max_memory_restart: "300M",
    },
  ],
};
