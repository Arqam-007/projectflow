# ProjectFlow — System Architecture & Technical Specifications

ProjectFlow is a modular full-stack project and task management system designed for production readiness, clear role separation, and containerized deployment.

## 1. Directory Structure

```
projectflow/
├── apps/
│   ├── web/src/              # React 19 Frontend SPA (Vite + Tailwind CSS + Lucide)
│   │   ├── App.tsx           # Dashboard shell & telemetry
│   │   └── main.tsx          # Client entry point
│   └── api/src/              # Express API Server (Node.js + TypeScript)
│       ├── config/           # Zod-validated environment config (JWT_SECRET, PORT)
│       ├── controllers/      # Route controllers (auth, health, workspaces, projects)
│       ├── middleware/       # JWT auth guard, RBAC guards, error handling, validation, logging
│       ├── routes/v1/        # Versioned route registry (/api/v1/{auth,health,workspaces,projects})
│       ├── services/         # WorkspaceService, ProjectService, AuthService, TokenService
│       ├── repositories/     # WorkspaceRepo, ProjectRepo, UserRepo (Prisma & Memory adapters)
│       ├── utils/            # Domain errors (AppError, ConflictError, UnauthorizedError, ForbiddenError)
│       └── app.ts            # Express application setup
├── packages/
│   └── shared/src/           # Shared types and Zod schemas
│       ├── types.ts          # Core domain models (Workspace, Project, User, Role, Status)
│       └── schemas.ts        # Zod validation schemas (Workspaces, Projects, Members, Auth)
├── prisma/
│   └── schema.prisma         # PostgreSQL schema definition with Prisma
├── tests/
│   ├── api/tasks.test.ts      # Supertest task management, concurrency & state machine tests (30 tests)
│   ├── api/projects.test.ts   # Supertest project & membership integration tests (10 tests)
│   ├── api/workspaces.test.ts # Supertest workspace & RBAC integration tests (10 tests)
│   ├── api/auth.test.ts       # Supertest authentication & security tests (13 tests)
│   ├── api/health.test.ts     # Supertest health tests (2 tests)
│   └── unit/validation.test.ts # Zod schema unit tests (4 tests)
├── .github/workflows/
│   └── ci.yml                # GitHub Actions automated lint, test, build
├── docker-compose.yml        # Local PostgreSQL container service
├── Dockerfile                # Production multi-stage build container
├── server.ts                 # Full-stack dev & prod runner (Vite + Express)
└── README.md                 # Setup & portfolio guide
```

## 2. Authentication & Authorization Architecture

ProjectFlow implements stateless JSON Web Token (JWT) authentication coupled with token version revocation and hierarchical Role-Based Access Control (RBAC):

```
[Client SPA / API Client]
        │
        ├── 1. POST /api/v1/auth/register (name, email, password)
        │      └── Validated via Zod -> Password hashed with bcrypt (salt 12)
        │      └── Stored in PostgreSQL via Prisma -> JWT issued with tokenVersion: 0
        │
        ├── 2. POST /api/v1/auth/login (email, password)
        │      └── Checked against bcrypt hash -> JWT issued -> Returns { user, accessToken }
        │
        ├── 3. GET /api/v1/workspaces/:workspaceId (Authorization: Bearer <token>)
        │      └── authenticateToken middleware verifies JWT
        │      └── requireWorkspaceRole middleware checks workspace membership & role
        │      └── Rejects unauthorized users with 404 (prevents IDOR leakage)
        │
        └── 4. PATCH / DELETE /api/v1/projects/:projectId
               └── requireProjectRole(['ADMIN', 'OWNER']) enforces role permissions
```

### Role-Based Access Control (RBAC) Matrix

| Operation | OWNER | ADMIN | MEMBER | VIEWER |
|---|:---:|:---:|:---:|:---:|
| View Workspace & Projects | ✓ | ✓ | ✓ | ✓ |
| Create Projects in Workspace | ✓ | ✓ | ✓ | ✕ |
| Update Project Details & Status | ✓ | ✓ | ✕ (403) | ✕ (403) |
| Invite Members to Workspace / Project | ✓ (All roles) | ✓ (Member / Viewer) | ✕ (403) | ✕ (403) |
| Update Member Roles | ✓ | ✓ (Non-Owners) | ✕ (403) | ✕ (403) |
| Remove Members | ✓ | ✓ (Non-Owners) | ✕ (Can leave self) | ✕ |
| Delete Project / Workspace | ✓ | ✕ (403) | ✕ (403) | ✕ (403) |

### Anti-IDOR & Multi-Tenant Isolation
- Insecure Direct Object References (IDOR) are prevented by requiring both valid JWT authentication and explicit membership in the target workspace or project.
- Attempts to query or modify resources belonging to another workspace return `404 Not Found` rather than `403 Forbidden` to prevent leaking whether private resource IDs exist.
- Ownership protection guarantees that a workspace or project can never be left without an owner (demoting or removing the sole owner returns `400 Bad Request`).

## 3. REST API Endpoints (Milestones 1–3)

All API routes are prefixed under `/api/v1/`.

| Method | Endpoint | Authorization | Description | Status Code |
|---|---|---|---|---|
| `GET` | `/api/v1/health` | Public | Telemetry, uptime, and database connection state | `200` |
| `POST` | `/api/v1/auth/register` | Public | Registers user, hashes password, returns JWT token | `201` |
| `POST` | `/api/v1/auth/login` | Public | Authenticates credentials, returns JWT token | `200` |
| `POST` | `/api/v1/auth/logout` | Authenticated | Revokes token and increments `tokenVersion` | `200` |
| `GET` | `/api/v1/auth/me` | Authenticated | Returns current authenticated user profile | `200` |
| `POST` | `/api/v1/workspaces` | Authenticated | Creates a new workspace (caller assigned as `OWNER`) | `201` |
| `GET` | `/api/v1/workspaces` | Authenticated | Lists workspaces accessible to current user | `200` |
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
| `POST` | `/api/v1/projects/:projectId/tasks` | Member+ | Creates task with auto-incremented task number & key | `201` / `400` / `403` |
| `GET` | `/api/v1/projects/:projectId/tasks` | Member+ | Lists tasks in project with status/priority/assignee filters | `200` / `403` / `404` |
| `GET` | `/api/v1/tasks/:taskId` | Member+ | Retrieves task details, creator, assignee, and project | `200` / `404` |
| `PATCH` | `/api/v1/tasks/:taskId` | Member+ | Updates task title, description, priority, assignee, due date | `200` / `400` / `403` |
| `PATCH` | `/api/v1/tasks/:taskId/status` | Member+ | Validates & updates status according to state machine | `200` / `400` / `403` |
| `DELETE` | `/api/v1/tasks/:taskId` | Creator/Admin/Owner | Deletes task (Members restricted to own tasks) | `200` / `403` / `404` |

## 4. Task State Machine & Validation

ProjectFlow enforces a strict status transition state machine on the backend. Arbitrary status jumps are rejected with `400 Bad Request`.

```
        ┌──────────────┐
        │   BACKLOG    │
        └──────┬───────┘
               │ (TODO, IN_PROGRESS)
               ▼
        ┌──────────────┐
   ┌───►│     TODO     │◄───────────────────┐
   │    └──────┬───────┘                    │
   │           │ (IN_PROGRESS, BACKLOG)     │ (Reopened)
   │           ▼                            │
   │    ┌──────────────┐                    │
   └───►│ IN_PROGRESS  │◄──────┐            │
        └──────┬───────┘       │            │
               │ (IN_REVIEW)   │ (Rework)   │
               ▼               │            │
        ┌──────────────┐       │            │
        │  IN_REVIEW   ├───────┘            │
        └──────┬───────┘                    │
               │ (Approved)                 │
               ▼                            │
        ┌──────────────┐                    │
        │     DONE     ├────────────────────┘
        └──────────────┘
```

### Permitted Status Transitions Matrix

| Current Status | Allowed Next Statuses | Business Rationale |
|---|---|---|
| `BACKLOG` | `TODO`, `IN_PROGRESS` | Backlogged items must be triaged to To Do or activated into sprint |
| `TODO` | `IN_PROGRESS`, `IN_REVIEW`, `DONE`, `BACKLOG` | Standard task intake |
| `IN_PROGRESS` | `IN_REVIEW`, `DONE`, `TODO`, `BACKLOG` | Active development or parked/blocked |
| `IN_REVIEW` | `DONE` (approved), `IN_PROGRESS` (changes requested), `TODO` | Peer review verification gate |
| `DONE` | `IN_PROGRESS` (reopened bug/task), `TODO` | Completed task lifecycle |

### Task Assignee & RBAC Guard
- **Assignee Membership Check**: A user can only be assigned to a task if they are an active member or owner of the parent project. Reassignment to external users returns `400 Bad Request`.
- **Task Deletion Permission**: Only the original task creator, project Admin, or project Owner can delete a task. Other project members receive `403 Forbidden`.
- **Viewer Role**: Viewers have read-only access and cannot create tasks, update status, or delete tasks.
