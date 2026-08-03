# Smart Factory Monitoring System

Real-time industrial machine monitoring platform for a single factory (21-50 machines).

## Architecture

```
ESP32 / Raspberry Pi Machine Controller
              |
            MQTT
              |
        Mosquitto Broker
              |
         NestJS Backend
         /           \
    PostgreSQL    Socket.IO
                    |
              Next.js Dashboard
```

- Frontend never connects directly to MQTT. All realtime data flows through the backend WebSocket.
- See `ai-context/` for full architecture, database design, MQTT spec, and development rules.

## Tech Stack

| Layer      | Technology                                    |
| ---------- | --------------------------------------------- |
| Backend    | NestJS, TypeScript, Prisma, PostgreSQL, Socket.IO |
| Frontend   | Next.js App Router, TypeScript, TailwindCSS, ECharts |
| IoT        | MQTT (Mosquitto)                              |
| Deployment | Docker Compose, Ubuntu Server 24.04, ARM64    |

## Project Structure

```
smart-factory/
├── ai-context/          # Architecture docs & specs (reference)
├── backend/             # NestJS API + MQTT subscriber + WebSocket
├── frontend/            # Next.js dashboard
├── docker/              # Mosquitto config, nginx config, DB init scripts
├── scripts/             # backup.sh / restore.sh (production)
├── docker-compose.yml   # Dev infrastructure (postgres + mosquitto)
└── docker-compose.prod.yml  # Production stack (5 services behind nginx)
```

## Development Setup

Requirements: Node.js >= 20, npm >= 10, Docker with Compose.

```bash
# 1. Install dependencies (monorepo workspaces)
npm install

# 2. Start infrastructure (PostgreSQL + Mosquitto)
docker compose up -d

# 3. Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# 4. Apply database migrations + seed (Phase 2)
npm run db:migrate --workspace backend
npm run db:seed --workspace backend

# 5. Start backend (http://localhost:3000, Swagger at /api/docs)
npm run dev:backend

# 6. Start frontend (http://localhost:3001)
npm run dev:frontend
```

MQTT credentials: broker user `backend` / `SmartFactory@123`; per-machine users
`machine_M001`–`machine_M030` with password `{machine_code}@SmartFactory`
(e.g. `M001@SmartFactory`). Regenerate credentials with
`docker/mosquitto/scripts/create-credentials.ps1` (or `.sh`).

> Note (Windows dev): Mosquitto's default port 1883 may be taken by another
> broker installed on the host. Stop/disable the conflicting service
> (e.g. `Stop-Service mosquitto`) before running the Docker broker.

Seed users (password for all: `SmartFactory@123`):

| Role     | Email                         |
| -------- | ----------------------------- |
| ADMIN    | admin@smartfactory.local      |
| MANAGER  | manager@smartfactory.local    |
| ENGINEER | engineer@smartfactory.local   |
| OPERATOR | operator@smartfactory.local   |
| VIEWER   | viewer@smartfactory.local     |

## Development Phases

| Phase | Scope                        | Status       |
| ----- | ---------------------------- | ------------ |
| 1     | Project setup, monorepo, docker infra | Done       |
| 2     | Database (Prisma schema, migrations, seed) | Done       |
| 3     | Authentication (JWT, refresh token, RBAC) | Done       |
| 4     | MQTT system (subscribe, validate, store, offline detection) | Done       |
| 5     | Realtime system (Socket.IO gateway) | Done       |
| 6     | Dashboard pages (Overview, Production, Machine Detail, Alarm, Admin) | Done |
| 7     | Testing                          | Done |
| 8     | Deployment (production compose, nginx, backup/restore) | Done |

## Deployment (Production)

The production stack runs 5 containers behind nginx: `mosquitto`, `postgres`,
`backend`, `frontend` (Next.js standalone), and `nginx` (reverse proxy).
Only nginx is exposed to the host; nothing else publishes a port.

Files:

| File                              | Purpose                                    |
| --------------------------------- | ------------------------------------------ |
| `docker-compose.prod.yml`         | Production stack (healthchecks + named volumes) |
| `.env.production.example`         | All production variables (secrets included) |
| `backend/Dockerfile`              | Multi-stage build; runs `prisma migrate deploy` on start |
| `frontend/Dockerfile`             | Multi-stage standalone build (public URLs as build args) |
| `docker/nginx/nginx.conf`         | `/` → frontend, `/api` + `/socket.io` → backend |
| `scripts/backup.sh`               | pg_dump + mosquitto volume, keeps last N backups |
| `scripts/restore.sh`              | Restore DB dump (and optionally mosquitto data) |

Deploy (on Linux/Ubuntu server):

```bash
cp .env.production.example .env.production
# Edit .env.production: set strong JWT secrets and POSTGRES_PASSWORD,
# keep MQTT_PASSWORD consistent with docker/mosquitto/config/passwd.

docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Verify:

```bash
curl http://<server>/api/health      # {"status":"ok",...}
curl http://<server>/                # dashboard HTML
docker compose -f docker-compose.prod.yml --env-file .env.production ps
```

First boot applies migrations automatically (`prisma migrate deploy` in the
backend entrypoint). Seed the database once:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend npx tsx prisma/seed.ts
```

Backup / restore (cron the backup, e.g. daily):

```bash
bash scripts/backup.sh 14            # keep 14 backups
bash scripts/restore.sh backups/db-YYYYMMDD-HHMMSS.dump
```

Management:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production down   # stop (keeps volumes)
docker compose -f docker-compose.prod.yml --env-file .env.production up -d  # start
docker compose -f docker-compose.prod.yml --env-file .env.production down -v # destroy data too
```

Notes:

- Images build for `linux/amd64` and `linux/arm64` (node:22 bookworm/alpine).
- Next.js public URLs (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`) are
  baked in at build time; default same-origin values work behind nginx.
- Change the entry port with `NGINX_PORT` in `.env.production` (default `80`).

## Testing

Prerequisites: `docker compose up -d` (mosquitto + postgres) with backend env vars.

Backend unit tests (53 tests):

```
cd backend && npm test
```

Backend API + MQTT integration tests (55 tests, against the real broker/DB):

```
cd backend && npm run test:e2e
```

Frontend component tests (30 tests, vitest + testing-library):

```
cd frontend && npm test
```

Lint:

```
cd backend && npm run lint
cd frontend && npm run lint
```
