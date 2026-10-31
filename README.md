# ProjectFlow

> A professional full-stack project and task management platform featuring role-based access control, PostgreSQL data modeling, JWT authentication, REST APIs, and containerized deployment.

[![CI](https://github.com/your-username/projectflow/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/projectflow/actions)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg)

---

### Tech Stack

- **Frontend**: React 19, TypeScript (Strict), Tailwind CSS, Lucide Icons, Vite
- **Backend**: Node.js 22, Express 4, TypeScript
- **Authentication**: JWT (`jsonwebtoken`) with `tokenVersion` invalidation, Password hashing via `bcryptjs` (12 salt rounds)
- **Authorization**: Role-Based Access Control (RBAC) with Owner, Admin, Member, Viewer permissions
- **Database & ORM**: PostgreSQL 16, Prisma ORM
- **Validation**: Zod (Strict runtime schema validation for request payloads, queries, and environment)
- **Testing**: Vitest, Supertest (88 passing integration & unit tests across 9 suites)
- **DevOps & Containers**: Docker, Docker Compose, GitHub Actions CI

---

## Repository Structure

```
projectflow/
├── apps/
│   ├── web/src/              # Frontend React 19 SPA (Dashboard Analytics, Kanban Board, Modals)
│   └── api/src/              # Backend Express REST API
│       ├── config/           # Zod-validated environment config
│       ├── controllers/      # Route controllers (tasks, analytics, activity, projects, workspaces, auth, health)
│       ├── middleware/       # JWT auth guard, RBAC guards (requireTaskRole, requireProjectRole), validation, logging
│       ├── routes/v1/        # Versioned route registry (/api/v1/{tasks,analytics,activity,projects,workspaces,auth,health})
│       ├── services/         # TaskService, ActivityService, ProjectService, WorkspaceService, AuthService, TokenService
│       ├── repositories/     # TaskRepo, ActivityRepo, ProjectRepo, WorkspaceRepo, UserRepo (Prisma & Memory adapters)
│       └── utils/            # Domain error classes (AppError, ConflictError, UnauthorizedError, ForbiddenError)
├── packages/
│   └── shared/src/           # Shared domain models & Zod validation schemas
├── prisma/
│   ├── schema.prisma         # PostgreSQL schema definition with Prisma (Task model, ActivityLog, relations)
│   └── migrations/           # Versioned SQL migrations
├── tests/
│   ├── api/analytics.test.ts  # Supertest project & workspace analytics aggregation tests (6 tests)
│   ├── api/activity.test.ts   # Supertest audit logging & sanitization tests (7 tests)
│   ├── api/filters.test.ts    # Supertest multi-attribute filtering & deterministic sorting tests (6 tests)
│   ├── api/tasks.test.ts      # Supertest task management, concurrency & state machine tests (30 tests)
│   ├── api/projects.test.ts   # Supertest project & membership integration tests (10 tests)
│   ├── api/workspaces.test.ts # Supertest workspace & RBAC integration tests (10 tests)
│   ├── api/auth.test.ts       # Supertest authentication & security tests (13 tests)
│   ├── api/health.test.ts     # Supertest health endpoint tests (2 tests)
│   └── unit/validation.test.ts # Zod schema validation unit tests (4 tests)
├── docs/
│   └── architecture.md       # Detailed technical architecture reference
├── .github/workflows/
│   └── ci.yml                # Automated CI for type checking, tests, and build
├── docker-compose.yml        # PostgreSQL 16 container setup
├── Dockerfile                # Multi-stage production container build
├── server.ts                 # Single-process fullstack dev server (Express + Vite)
├── .env.example              # Environment variables template
└── package.json              # Project dependencies and operational scripts
```

---

## REST API Endpoints (Milestones 1–5)

All API endpoints are versioned under `/api/v1/`.

| Method | Endpoint | Authorization | Description | Status Code |
|---|---|---|---|---|
| `GET` | `/api/v1/health` | Public | Telemetry, server uptime, and database connection state | `200` |
| `POST` | `/api/v1/auth/register` | Public | Normalizes email, hashes password with bcrypt, returns JWT | `201` |
| `POST` | `/api/v1/auth/login` | Public | Validates credentials, issues JWT access token | `200` |
| `POST` | `/api/v1/auth/logout` | `Bearer <token>` | Revokes token and increments `tokenVersion` | `200` |
| `GET` | `/api/v1/auth/me` | `Bearer <token>` | Returns current authenticated user profile | `200` |
| `POST` | `/api/v1/workspaces` | `Bearer <token>` | Creates a new workspace (caller assigned as `OWNER`) | `201` |
| `GET` | `/api/v1/workspaces` | `Bearer <token>` | Lists workspaces accessible to current user | `200` |
| `GET` | `/api/v1/workspaces/:workspaceId` | Member+ | Retrieves workspace details and current user role | `200` / `404` |
| `PATCH` | `/api/v1/workspaces/:workspaceId` | Admin+ | Updates workspace name and description | `200` / `403` |
| `DELETE` | `/api/v1/workspaces/:workspaceId` | Owner | Deletes workspace and cascades all projects | `200` / `403` |
| `GET` | `/api/v1/workspaces/:workspaceId/members` | Member+ | Lists members and roles in workspace | `200` |
| `POST` | `/api/v1/workspaces/:workspaceId/members` | Admin+ | Adds registered user by email to workspace | `201` / `409` |
| `PATCH` | `/api/v1/workspaces/:workspaceId/members/:userId` | Admin+ | Updates workspace member role | `200` / `403` |
| `DELETE` | `/api/v1/workspaces/:workspaceId/members/:userId` | Member+ | Removes member or allows leaving workspace | `200` / `400` |
| `POST` | `/api/v1/workspaces/:workspaceId/projects` | Member+ | Creates project with unique key in workspace | `201` / `409` |
| `GET` | `/api/v1/workspaces/:workspaceId/projects` | Member+ | Lists accessible projects in workspace | `200` |
| `GET` | `/api/v1/projects/:projectId` | Member+ | Retrieves project details and current user role | `200` / `404` |
| `PATCH` | `/api/v1/projects/:projectId` | Admin+ | Updates project name, description, or status | `200` / `403` |
| `DELETE` | `/api/v1/projects/:projectId` | Owner | Deletes project and associated tasks | `200` / `403` |
| `GET` | `/api/v1/projects/:projectId/members` | Member+ | Lists project members and roles | `200` |
| `POST` | `/api/v1/projects/:projectId/members` | Admin+ | Adds user to project with assigned role | `201` / `409` |
| `PATCH` | `/api/v1/projects/:projectId/members/:userId` | Admin+ | Updates project member role | `200` / `403` |
| `DELETE` | `/api/v1/projects/:projectId/members/:userId` | Member+ | Removes member from project | `200` / `400` |
| `POST` | `/api/v1/projects/:projectId/tasks` | Member+ | Creates task with atomic project key (`PROJ-1`) | `201` |
| `GET` | `/api/v1/projects/:projectId/tasks` | Member+ | Lists tasks with multi-status, priority, assignee, date filters & pagination | `200` |
| `GET` | `/api/v1/tasks/:taskId` | Member+ | Retrieves task details with creator & assignee | `200` / `404` |
| `PATCH` | `/api/v1/tasks/:taskId` | Member+ | Updates task fields (assignee, priority, dates) with validation | `200` |
| `PATCH` | `/api/v1/tasks/:taskId/status` | Member+ | Transitions task status via strict state machine | `200` / `400` |
| `DELETE` | `/api/v1/tasks/:taskId` | Admin+ / Creator | Deletes task with audit logging | `200` |
| `GET` | `/api/v1/projects/:projectId/analytics` | Member+ | Aggregated project task metrics, status & priority counts, completion rate | `200` |
| `GET` | `/api/v1/workspaces/:workspaceId/analytics` | Member+ | Aggregated workspace portfolio metrics & per-project completion breakdown | `200` |
| `GET` | `/api/v1/projects/:projectId/activities` | Member+ | Audit activity logs with sanitized details and pagination | `200` |
| `GET` | `/api/v1/workspaces/:workspaceId/activities` | Member+ | Workspace-wide audit logs with action filters | `200` |

---

## Database Architecture & Sandbox Environment

ProjectFlow utilizes a dual-engine repository architecture:
1. **Production & Local Docker**: **PostgreSQL 16** managed via **Prisma ORM**, strict relational constraints (`@@unique([projectId, taskNumber])`), foreign key cascades, and timestamp indexing.
2. **CI & Sandbox Environments**: When running in isolated build containers or environments without an active Docker daemon, the application gracefully switches to high-fidelity, in-memory repository adapters that implement the exact same TypeScript repository interfaces. This guarantees 100% reproducible test runs (88 passing tests) without false persistence claims.

---

## Local Development Quickstart

### Prerequisites
- **Node.js**: v20.x or v22.x
- **npm**: v10.x+
- **Docker & Docker Compose**: (Required for running local PostgreSQL)

### 1. Clone the repository
```bash
git clone https://github.com/your-username/projectflow.git
cd projectflow
```

### 2. Configure Environment Variables
Copy the template to `.env`:
```bash
cp .env.example .env
```
Default `.env` values are pre-configured for local Docker development:
- `PORT=3000`
- `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/projectflow?schema=public"`
- `JWT_SECRET="replace-with-a-secure-random-secret-at-least-32-chars"`
- `JWT_EXPIRES_IN="7d"`

### 3. Start Local PostgreSQL Database
Launch the PostgreSQL 16 Alpine container via Docker Compose:
```bash
docker compose up -d
```

### 4. Install Dependencies & Generate Prisma Client
```bash
npm install
npx prisma generate
```

### 5. Run Database Migrations
Apply the PostgreSQL schema migrations:
```bash
npx prisma migrate dev --name add_workspaces_projects_rbac
```

### 6. Start the Full-Stack Development Server
```bash
npm run dev
```
- Web Application & Dashboard Analytics: [http://localhost:3000](http://localhost:3000)
- API Health Endpoint: [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)

---

---

## Windows PowerShell Setup Guide

For Windows developers using PowerShell and Docker Desktop, see the dedicated step-by-step guide:
👉 [docs/WINDOWS_SETUP_GUIDE.md](docs/WINDOWS_SETUP_GUIDE.md)

---

## Running Automated Tests

To run the unit and API integration test suite (98 tests across 9 test suites):
```bash
npm test
```

To run the dedicated PostgreSQL integration tests (requires Docker PostgreSQL running):
```bash
npm run test:pg
```

To run all suites together (104 tests total):
```bash
npm run test:all
```

To run strict TypeScript compilation check:
```bash
npm run lint
```

---

## Implementation Roadmap

- [x] **Milestone 1**: Project Scaffolding, Express `/api/v1`, Prisma PostgreSQL Schema, Docker Compose, CI, and SaaS Shell
- [x] **Milestone 2**: Authentication & User Management (JWT, Password Hashing, Profile API, Auth UI & Guards)
- [x] **Milestone 3**: Workspaces, Project Creation and Management, Project Membership, and RBAC
- [x] **Milestone 4**: Task Management, Priorities, Assignees, and Interactive Kanban Board
- [x] **Milestone 5**: Executive Analytics Dashboard, Task Statistics, Activity Logging & Advanced Filtering
- [ ] **Milestone 6**: Automated Test Coverage Expansion & Portfolio Documentation Finalization
