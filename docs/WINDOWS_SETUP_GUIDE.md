# ProjectFlow: Windows PowerShell Local PostgreSQL Integration & Setup Guide

This guide provides the exact commands to set up, migrate, test, and run ProjectFlow with real PostgreSQL 16 on a Windows development machine using Windows PowerShell (or PowerShell 7+).

---

## Prerequisites

Ensure the following tools are installed on your Windows machine:
1. **Node.js**: v20+ or v22+ LTS (`node -v`)
2. **Git**: (`git -v`)
3. **Docker Desktop for Windows**: With WSL 2 backend running (`docker --version`, `docker compose version`)

---

## Step-by-Step PowerShell Execution Workflow

Open Windows PowerShell (Run as Administrator or regular user) in the project root directory:

```powershell
Set-Location -Path "C:\path\to\projectflow"
```

### 1. Install Dependencies
Install all packages locked in `package.json` and `package-lock.json`:

```powershell
npm install --legacy-peer-deps
```

*Expected output:*
```text
up to date, audited 292 packages in 4s
```

---

### 2. Configure Local Environment Variables
Create your local `.env` file from `.env.example`:

```powershell
Copy-Item .env.example .env
```

Review `.env` to verify your local database connection strings:
- **Development Database**: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/projectflow?schema=public"`
- **Dedicated Test Database**: `TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/projectflow_test?schema=public"`
- **Strict PostgreSQL**: `STRICT_POSTGRES="true"` (enforces hard database connection without memory fallback)

---

### 3. Start PostgreSQL 16 with Docker Compose
Start the PostgreSQL container in the background:

```powershell
docker compose up -d postgres
```

*Expected output:*
```text
[+] Running 2/2
 ✔ Network projectflow-network      Created
 ✔ Container projectflow-postgres   Started
```

Check container status and health check:

```powershell
docker compose ps
```

*Expected output:*
```text
NAME                   IMAGE                 COMMAND                  SERVICE    STATUS
projectflow-postgres   postgres:16-alpine    "docker-entrypoint.s…"   postgres   Up (healthy)   0.0.0.0:5432->5432/tcp
```

---

### 4. Confirm PostgreSQL Connectivity
Verify that port 5432 is open and listening in Windows PowerShell:

```powershell
Test-NetConnection -ComputerName localhost -Port 5432
```

*Expected output:*
```text
ComputerName     : localhost
RemoteAddress    : 127.0.0.1
RemotePort       : 5432
InterfaceAlias   : Loopback Pseudo-Interface 1
SourceAddress    : 127.0.0.1
TcpTestSucceeded : True
```

---

### 5. Generate Prisma Client
Generate the strictly locked Prisma Client (v6.19.3):

```powershell
npm run prisma:generate
```

*Expected output:*
```text
> prisma:generate
> prisma generate

Prisma schema loaded from prisma\schema.prisma
✔ Generated Prisma Client (v6.19.3) to .\node_modules\@prisma\client in 95ms
```

---

### 6. Apply Development Migrations
Apply all migration files (`20261029000001_init` and `20261030000001_add_activity_workspace`) to the local development database:

```powershell
npm run prisma:deploy
```

*Expected output:*
```text
> prisma:deploy
> prisma migrate deploy

Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "projectflow", schema "public" at "localhost:5432"

2 migrations found in prisma/migrations

Applying migration `20261029000001_init`
Applying migration `20261030000001_add_activity_workspace`

All migrations have been successfully applied.
```

---

### 7. Initialize & Migrate Dedicated Test Database
Initialize the isolated test database `projectflow_test` so tests never touch development or production data:

```powershell
npm run prisma:test:deploy
```

*Expected output:*
```text
> prisma:test:deploy
> tsx scripts/migrate-test-db.ts

[ProjectFlow] Applying Prisma migrations to test database: postgresql://postgres:postgres@localhost:5432/projectflow_test?schema=public
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "projectflow_test", schema "public" at "localhost:5432"

2 migrations found in prisma/migrations
Applying migration `20261029000001_init`
Applying migration `20261030000001_add_activity_workspace`

All migrations have been successfully applied.
[ProjectFlow] Test database migrations applied successfully.
```

---

### 8. Run Automated Tests

#### A. Run Unit & In-Memory API Test Suite (98 Tests):
```powershell
npm test
```

*Expected output:*
```text
 Test Files  9 passed (9)
      Tests  98 passed (98)
   Duration  ~25s
```

#### B. Run Dedicated Real PostgreSQL Integration Tests (6 Real DB Tests):
```powershell
npm run test:pg
```

*Expected output:*
```text
 ✓ tests/postgres/postgres-integration.test.ts (6 tests)
   ✓ 1. verifies task persistence across client recreation (server restart simulation)
   ✓ 2. guarantees concurrent task creation produces unique, sequential task numbers
   ✓ 3. verifies atomic activity-log persistence and transaction rollback
   ✓ 4. enforces foreign-key integrity, restrict rules, and cascade deletions
   ✓ 5. performs analytics calculations and advanced filtering against actual PostgreSQL
   ✓ 6. verifies multi-tenant workspace and project isolation

 Test Files  1 passed (1)
      Tests  6 passed (6)
```

#### C. Run All Suites Together (104 Tests Total):
```powershell
npm run test:all
```

*Expected output:*
```text
 Test Files  10 passed (10)
      Tests  104 passed (104)
```

---

### 9. Start the ProjectFlow Application
Launch the dev server running React 19 + Express API:

```powershell
npm run dev
```

*Expected output:*
```text
[ProjectFlow API] Server running at http://0.0.0.0:3000/api/v1
  VITE v8.3.0  ready in 450 ms

  ➜  Local:   http://localhost:3000/
```

Verify backend health in a separate PowerShell window:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/health" | ConvertTo-Json -Depth 4
```

*Expected output when PostgreSQL is connected:*
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "serverTime": "2026-10-31T08:15:00.000Z",
    "uptimeSeconds": 12,
    "environment": "development",
    "version": "1.0.0-milestone1",
    "database": {
      "configured": true,
      "provider": "postgresql",
      "connected": true,
      "latencyMs": 4
    }
  }
}
```

---

## Troubleshooting & Maintenance

### If Docker container fails to start:
```powershell
docker compose logs postgres
```

### If you need to reset the local development database:
```powershell
docker compose down -v
docker compose up -d postgres
npm run prisma:deploy
npm run prisma:test:deploy
```

### Inspect PostgreSQL directly with psql:
```powershell
docker compose exec postgres psql -U postgres -d projectflow
```
To inspect the test database:
```powershell
docker compose exec postgres psql -U postgres -d projectflow_test
```
