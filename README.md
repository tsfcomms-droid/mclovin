# McLovin EU

Link site (Linktree-style) plus a Showroom page (product videos + prices),
both managed from a password-protected admin panel — add, edit, reorder,
hide, or delete links and showroom items. Everything is stored on disk
(`data/links.json`, `data/showroom.json`, uploaded videos in `public/videos/`)
— no external database needed.

## Run locally

```bash
npm install
npm start
```

Visit http://localhost:3000. On first run, since no admin password is set,
one is generated automatically and printed to the console and saved to
`data/INITIAL_ADMIN_PASSWORD.txt` — read it, log in at `/admin/login`, then
change the password from the dashboard and delete that file.

## Adding the real logo

Drop the logo image at `public/img/logo.jpg` and reload the page — it
replaces the text-based fallback automatically. No code changes needed.
(The logo is already in place.)

## Deploying to a VPS

This app expects to run as an always-on Node process (not serverless),
since it saves link edits to a JSON file on disk.

1. Copy this folder to the server, then on the server:
   ```bash
   cd mclovin-eu
   npm install --omit=dev
   cp .env.example .env
   ```
2. Edit `.env`:
   - Set `NODE_ENV=production` (this makes the session cookie `secure`,
     i.e. only sent over HTTPS).
   - Set `SESSION_SECRET` to a random string (the `.env.example` comment
     shows a one-liner to generate one).
   - Optionally set `ADMIN_PASSWORD` to a password you choose. If you skip
     it, a random one is auto-generated on first start (see above).
3. Run it with a process manager so it restarts on crash/reboot, e.g. [pm2](https://pm2.keymetrics.io/):
   ```bash
   npm install -g pm2
   pm2 start server.js --name mclovin-eu
   pm2 save
   pm2 startup
   ```
4. Put a reverse proxy (nginx or Caddy) in front for HTTPS and your domain,
   proxying to `http://localhost:3000`. Caddy example (`Caddyfile`):
   ```
   mclovin.eu {
     reverse_proxy localhost:3000
   }
   ```
   Caddy automatically provisions a free HTTPS certificate.

## Showroom (product videos + prices)

`/showroom` is a public page of product cards (video, title, price,
description), linked from the homepage via the "Browse the Showroom"
button. Manage it from `/admin/showroom`: add an item with a video upload
(mp4/mov/webm, max 300MB per file), set a price, reorder, hide, or delete.
Uploaded videos are stored in `public/videos/` and served as static files;
deleting an item also deletes its video file. This is disk-backed like
links, so it needs the same always-on VPS setup — no separate work needed.

Since videos are stored directly on the server, keep an eye on disk usage
as the vendor uploads more of them.

## Backups

The state that matters: `data/links.json`, `data/showroom.json`,
`data/admin.json` (the admin password hash), and `public/videos/` (the
uploaded product videos). Back these up periodically if you want to be
able to restore edits.

## Project structure

```
server.js                 Express app + routes
lib/linksStore.js          Read/write data/links.json
lib/showroomStore.js        Read/write data/showroom.json
lib/videoUpload.js           Multer config for video uploads
lib/adminAuth.js              Admin password hashing/verification
views/index.ejs                Public link page
views/showroom.ejs              Public showroom page
views/admin/login.ejs            Admin login form
views/admin/dashboard.ejs         Admin panel for links
views/admin/showroom.ejs           Admin panel for showroom items
public/css/style.css               Styling
public/img/logo.jpg                 The logo
public/videos/                       Uploaded showroom videos
data/links.json                       The links themselves
data/showroom.json                     The showroom items
```
