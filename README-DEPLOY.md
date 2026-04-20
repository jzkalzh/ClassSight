# ClassSight Production Deploy

This repository can be deployed to a public Linux server as one complete stack:

- `web`: Next.js 15 application with Prisma and Auth.js credentials login
- `db`: PostgreSQL 17
- `edge`: optional Python edge clients that report to `/api/edge/*`

This document covers both:

- quick deployment with Docker Compose
- full migration of your current database to a public server
- three-instance production deployment for teacher, student, and admin portals

## 1. Recommended Server Spec

- Ubuntu 22.04 or 24.04
- 2 vCPU or more
- 4 GB RAM or more
- 30 GB SSD or more
- Docker Engine + Docker Compose plugin installed
- optional: domain name + Nginx + HTTPS

## 2. Files To Copy To The Server

Copy the repository to the server, for example:

```bash
git clone <your-repo-url> /opt/classsight
cd /opt/classsight
```

If you are not using Git on the server, upload the whole project directory except:

- `node_modules`
- `.next`
- `edge/.venv`
- local `.env`

## 3. Prepare Production Environment Variables

Create a production env file from the template:

```bash
cp .env.production.example .env.production
```

Edit `.env.production` and set at least:

```env
POSTGRES_DB=classsight
POSTGRES_USER=classsight
POSTGRES_PASSWORD=replace-with-a-strong-db-password
AUTH_SECRET=replace-with-a-long-random-secret
APP_PORT=3000
```

Generate a strong `AUTH_SECRET`:

```bash
openssl rand -hex 32
```

## 4. Start The Full Stack

```bash
docker compose --env-file .env.production up -d --build
```

Check status:

```bash
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs -f web
```

The container startup command already runs:

```bash
npx prisma migrate deploy
```

So the database schema is created automatically on first boot.

## 5. Access The App

If you expose port `3000` directly, visit:

```text
http://your-server-ip:3000
```

If you use Nginx in front of it, point your domain to the server and proxy to `127.0.0.1:3000`.
An example config is provided in:

- `deploy/nginx/classsight.conf.example`
- `deploy/nginx/classsight-multi.conf.example`

## 5.1 Recommended Demo And Cloud Strategy

For demos and public deployment, do not use `next dev`.

Use this production flow instead:

```bash
npm run build
npm run start:teacher
npm run start:student
npm run start:admin
```

This avoids on-demand dev compilation when the first visitor opens a page.
Each instance now binds to `0.0.0.0` by default, so LAN access works when you open
the machine IP instead of `127.0.0.1`.

For local network demos, visit:

- `http://<your-lan-ip>:3000` teacher
- `http://<your-lan-ip>:3001` student
- `http://<your-lan-ip>:3002` admin

## 5.2 Warm Up Key Routes Before A Demo

After all three production instances are running, pre-request the key routes once:

```bash
npm run warmup
```

You can also warm only one portal:

```bash
npm run warmup:teacher
npm run warmup:student
npm run warmup:admin
```

This is useful right before a classroom demo or presentation because the main
dashboard routes are already hot when you open them in the browser.

## 6. Enable HTTPS

After Nginx is working and your domain resolves to the server:

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
sudo cp deploy/nginx/classsight.conf.example /etc/nginx/sites-available/classsight
sudo ln -s /etc/nginx/sites-available/classsight /etc/nginx/sites-enabled/classsight
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d your-domain.com
```

After HTTPS is enabled, your public entry should be:

```text
https://your-domain.com
```

If you deploy the portals as three isolated web entries, use subdomains instead:

- `teacher.your-domain.com`
- `student.your-domain.com`
- `admin.your-domain.com`

The multi-instance Nginx sample is in:

- `deploy/nginx/classsight-multi.conf.example`

## 6.1 PM2 Multi-Process Example

If you prefer running Next.js directly on the server instead of Docker Compose,
you can build once and keep three production processes alive with PM2.

Install PM2:

```bash
npm install -g pm2
```

Build once:

```bash
npm run build
```

Start three role-specific instances:

```bash
pm2 start deploy/pm2/ecosystem.config.cjs
pm2 save
```

The provided PM2 file already splits the roles into:

- `classsight-teacher`
- `classsight-student`
- `classsight-admin`

It also assigns separate ports and cookie prefixes so browser sessions do not
overwrite each other.

## 7. Move Existing Database Data

If you want a true migration instead of a fresh empty database, export from the current machine and restore on the server.

### Export on the current machine

```bash
pg_dump "postgresql://postgres:123456@127.0.0.1:5432/postgres" -Fc -f classsight.dump
```

### Copy the dump to the server

```bash
scp classsight.dump user@your-server:/tmp/classsight.dump
```

### Restore into the server database

First bring up only the database if needed:

```bash
docker compose --env-file .env.production up -d db
```

Then restore:

```bash
docker cp /tmp/classsight.dump classsight-db:/tmp/classsight.dump
docker compose --env-file .env.production exec db sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" dropdb -U "$POSTGRES_USER" --if-exists "$POSTGRES_DB"'
docker compose --env-file .env.production exec db sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" createdb -U "$POSTGRES_USER" "$POSTGRES_DB"'
docker compose --env-file .env.production exec db sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" /tmp/classsight.dump'
```

Then start the web service:

```bash
docker compose --env-file .env.production up -d web
```

If you only need demo data instead of a full migration, you can run:

```bash
docker compose --env-file .env.production exec web node scripts/seed-simulated-classroom.js
```

## 8. Edge Device Changes After Public Deployment

Edge scripts are not deployed inside the web container. They stay on the Jetson or other edge machine and call your public server.

Update the edge env file to point to the public address:

```env
API_BASE_URL=https://your-domain.com
DEVICE_KEY=your-real-device-key
```

The relevant APIs are:

- `POST /api/edge/session`
- `POST /api/edge/events`
- `POST /api/edge/session/:id/close`

Make sure the corresponding `edge_devices.deviceKey` exists in PostgreSQL.

## 9. Common Deployment Flow

For later updates:

```bash
cd /opt/classsight
git pull
docker compose --env-file .env.production up -d --build
```

For backups:

```bash
docker exec classsight-db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" -Fc > classsight-$(date +%F).dump
```

## 10. What This Repo Now Supports

- containerized app deployment
- automatic Prisma migration on startup
- standalone Next.js production build
- PostgreSQL persistence via Docker volume
- optional Nginx reverse proxy
- public edge reporting after changing `API_BASE_URL`
