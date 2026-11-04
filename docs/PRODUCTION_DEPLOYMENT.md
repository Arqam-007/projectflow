# ProjectFlow: Production Deployment & Operations Guide

This guide details the deployment architecture, configuration, containerization, database backup/restore, and security operations for running ProjectFlow in production environments.

---

## 1. Production Architecture Overview

ProjectFlow is designed as a stateless fullstack application with a unified entrypoint (`server.ts`) serving:
- **Frontend SPA**: Pre-compiled React 19 static client bundle built with Vite and Tailwind CSS.
- **Backend REST API**: Versioned Express API server (`/api/v1`) with Zod request validation, stateless JWT authentication, and centralized error handling.
- **Relational Persistence**: PostgreSQL 16 managed with Prisma ORM, enforcing row-level locking for concurrency and relational foreign-key cascades.

```
       [ Client Browser / Mobile Client ]
                       │  HTTPS (443)
                       ▼
         [ Reverse Proxy / Cloud Load Balancer ]
          (TLS Termination, DDoS Protection)
                       │
                       ▼
       ┌───────────────────────────────┐
       │   ProjectFlow Docker Container │
       │   - Express API (:3000)       │
       │   - React 19 SPA Static Files │
       │   - Prisma Query Engine       │
       └───────────────┬───────────────┘
                       │ TCP (:5432)
                       ▼
       ┌───────────────────────────────┐
       │   PostgreSQL 16 Database      │
       │   - Primary Data Storage      │
       │   - Automated Snapshots / WAL │
       └───────────────────────────────┘
```

---

## 2. Production Environment Configuration Checklist

Create a dedicated `.env.production` file on your host or configure secret manager variables. Never check real secrets into version control.

| Variable | Requirement | Description / Recommendation |
|---|---|---|
| `NODE_ENV` | `production` | Enables production error masking, HSTS headers, and optimized asset serving. |
| `PORT` | `3000` | Port on which the container listens internally. |
| `HOST` | `0.0.0.0` | Bind address for container networking. |
| `API_PREFIX` | `/api/v1` | Base route path for REST endpoints. |
| `DATABASE_URL` | `postgresql://...` | Connection string to production PostgreSQL cluster with connection pooling. |
| `STRICT_POSTGRES` | `true` | Prevents any fallback and triggers immediate alerts if the database is unreachable. |
| `JWT_SECRET` | 64+ char hex | Cryptographically secure random secret (e.g. `openssl rand -hex 32`). |
| `JWT_EXPIRES_IN` | `15m` to `7d` | Access token lifespan (recommended: `15m` to `24h` in high-security environments). |
| `CORS_ORIGIN` | `https://app.yourdomain.com` | Strict whitelist of allowed origins (never `*` in production). |

---

## 3. Containerized Deployment with Docker

ProjectFlow provides an optimized, multi-stage `Dockerfile`:
- **Builder Stage**: Installs dependencies (`npm ci`), runs Prisma generation, and compiles client assets with Vite.
- **Runner Stage**: Employs an Alpine Linux Node.js 22 runtime containing only compiled assets and production dependencies.

### 3.1 Build the Production Image
```bash
docker build -t projectflow:latest .
```

### 3.2 Run the Production Container
```bash
docker run -d \
  --name projectflow-app \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env.production \
  projectflow:latest
```

### 3.3 Verify Container Health
```bash
curl -f http://localhost:3000/api/v1/health
```

---

## 4. Database Migrations & Seeding Safety

### 4.1 Applying Migrations to Production
Always run migrations before starting updated application containers:
```bash
# Using direct Prisma CLI:
DATABASE_URL="<PRODUCTION_DB_URL>" npx prisma migrate deploy

# Inside the running container:
docker exec projectflow-app npx prisma migrate deploy
```

### 4.2 Production Seeding Guard
Database seeding (`prisma/seed.ts`) is strictly disabled in production by default. It aborts immediately with an error if `NODE_ENV=production`. If you explicitly need to populate an initial enterprise workspace in a newly provisioned tenant, run:
```bash
FORCE_PROD_SEED="true" npx tsx prisma/seed.ts
```

### 4.3 Render & Neon Serverless PostgreSQL Deployment Guide
When deploying ProjectFlow to Render with Neon PostgreSQL:

1. **Required Environment Variables in Render Dashboard**:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: `postgresql://[user]:[password]@[neon-hostname]/[database]?sslmode=require`
     *(Ensure `?sslmode=require` is appended. For pooled connections with PgBouncer, ensure direct URL is used for migrations)*
   - `JWT_SECRET`: 64+ char random hex string
   - `PORT`: `3000` (or leave default assigned by Render)
   - `STRICT_POSTGRES`: `true`

2. **Render Web Service Settings**:
   - **Environment**: `Node` or `Docker`
   - **Build Command**: `npm ci && npm run prisma:generate && npm run build`
   - **Pre-Deploy Command** *(Critical for Neon)*: `npx prisma migrate deploy`
     *(Applying migrations in the Pre-Deploy step ensures tables like `users` exist before traffic reaches the app)*
   - **Start Command**: `npm start`

3. **Diagnosing Unhandled Exceptions**:
   - Check Render logs for single-line `[SERVER EXCEPTION]` and `[HTTP ERROR]` entries.
   - Correlate by `requestId`.
   - Identify `prismaCode`:
     - `P2021`: Table does not exist $\rightarrow$ Run `npx prisma migrate deploy`.
     - `P1001`: Cannot reach database server $\rightarrow$ Verify Neon compute is active, `DATABASE_URL` is set, and `?sslmode=require` is present.
     - `P1000`: Authentication failed $\rightarrow$ Check Neon user password.
     - `P2002`: Unique constraint violation $\rightarrow$ User with email already exists.


---

## 5. PostgreSQL Backup & Restore Procedures

### 5.1 Automated Logical Backup (`pg_dump`)
Run a daily compressed snapshot of the production database:
```bash
# Docker-hosted PostgreSQL:
docker exec -t projectflow-postgres pg_dump \
  -U postgres \
  -d projectflow \
  --format=custom \
  --file=/var/lib/postgresql/data/backup_$(date +%Y%m%d_%H%M%S).dump

# Remote / Cloud SQL / AWS RDS PostgreSQL:
pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file=projectflow_backup_$(date +%Y%m%d_%H%M%S).dump
```

### 5.2 Restoring from Backup (`pg_restore`)
```bash
# Restore custom format backup:
pg_restore \
  -d "$DATABASE_URL" \
  --clean \
  --if-exists \
  --no-owner \
  projectflow_backup_YYYYMMDD_HHMMSS.dump
```

---

## 6. Security Hardening & Rate Limiting Architecture

1. **Rate Limiting Architecture**:
   - The included rate limiter middleware (`apps/api/src/middleware/security.ts`) utilizes an in-memory sliding window tracker.
   - *Note for Multi-Instance Scale-Out*: If ProjectFlow is deployed across multiple horizontal container replicas or serverless instances behind a load balancer, replace the in-memory map with a shared store (such as Redis or Memcached) to ensure rate limit counters are synchronized across nodes.

2. **HTTP Security Headers**:
   - Defense-in-depth headers are automatically applied: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection: 0`, and `Referrer-Policy: strict-origin-when-cross-origin`.
   - `Strict-Transport-Security` (HSTS) with `max-age=31536000; includeSubDomains` is enforced automatically in production over secure HTTPS connections.

3. **Anti-IDOR Multi-Tenant Isolation**:
   - Every workspace and project operation is strictly validated against the authenticated user's workspace membership.
   - Probing unauthorized workspaces or projects returns `404 Not Found` rather than `403 Forbidden` to prevent leaking the existence of internal IDs.

---

## 7. Operational Troubleshooting

| Symptom | Cause | Solution |
|---|---|---|
| Health returns `status: degraded` | Database unreachable on `DATABASE_URL` | Check network connectivity, PostgreSQL container status, and firewall rules. |
| `429 Too Many Requests` on auth | Rate limiter threshold exceeded | Wait for the window reset (default 15 minutes) or verify client IP headers (`X-Forwarded-For`). |
| `P2002 Unique constraint failed` | Concurrency collision on `(projectId, taskNumber)` | Verify row locking transaction logic; task creation retries automatically. |
| Client requests fail with CORS error | Origin not allowed | Update `CORS_ORIGIN` in `.env.production` to match client domain exactly. |
