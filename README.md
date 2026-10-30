# ProjectFlow

> A professional full-stack project and task management platform featuring role-based access control, PostgreSQL data modeling, JWT authentication, REST APIs, and containerized deployment.

[![CI](https://github.com/your-username/projectflow/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/projectflow/actions)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg)

---

## Tech Stack

- **Frontend**: React 19, TypeScript (Strict), Tailwind CSS, Lucide Icons, Vite
- **Backend**: Node.js 22, Express 4, TypeScript
- **Authentication**: JWT (`jsonwebtoken`) with `tokenVersion` invalidation, Password hashing via `bcryptjs` (12 salt rounds)
- **Authorization**: Role-Based Access Control (RBAC) with Owner, Admin, Member, Viewer permissions
- **Database & ORM**: PostgreSQL 16, Prisma ORM
- **Validation**: Zod (Strict runtime schema validation for request payloads, queries, and environment)
- **Testing**: Vitest, Supertest (69 passing integration & unit tests)
- **DevOps & Containers**: Docker, Docker Compose, GitHub Actions CI

---

## Repository Structure

```
projectflow/
├── apps/
│   ├── web/src/              # Frontend React 19 SPA (Interactive Kanban Board, Modals)
│   └── api/src/              # Backend Express REST API
│       ├── config/           # Zod-validated environment config
│       ├── controllers/      # Route controllers (tasks, projects, workspaces, auth, health)
│       ├── middleware/       # JWT auth guard, RBAC guards (requireTaskRole, requireProjectRole), validation, logging
│       ├── routes/v1/        # Versioned route registry (/api/v1/{tasks,projects,workspaces,auth,health})
│       ├── services/         # TaskService, ProjectService, WorkspaceService, AuthService, TokenService
│       ├── repositories/     # TaskRepo, ProjectRepo, WorkspaceRepo, UserRepo (Prisma & Memory adapters)
│       └── utils/            # Domain error classes (AppError, ConflictError, UnauthorizedError, ForbiddenError)
├── packages/
│   └── shared/src/           # Shared domain models & Zod validation schemas
├── prisma/
│   └── schema.prisma         # PostgreSQL schema definition with Prisma (Task model, taskNumber, relations)
├── tests/
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

## REST API Endpoints (Milestones 1–3)

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
- Web Application & RBAC Workspace UI: [http://localhost:3000](http://localhost:3000)
- API Health Endpoint: [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)

---

## Running Automated Tests

To run the complete test suite (39 integration and unit tests):
```bash
npm run test
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
- [ ] **Milestone 4**: Task Management & Interactive Kanban Board
- [ ] **Milestone 5**: Executive Analytics Dashboard & Activity Audit Feeds
- [ ] **Milestone 6**: Automated Test Coverage Expansion & Portfolio Documentation Finalization
