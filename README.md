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
- **Database & ORM**: PostgreSQL 16, Prisma ORM
- **Validation**: Zod (Strict runtime schema validation for request payloads, queries, and environment)
- **Testing**: Vitest, Supertest (19 passing integration & unit tests)
- **DevOps & Containers**: Docker, Docker Compose, GitHub Actions CI

---

## Repository Structure

```
projectflow/
├── apps/
│   ├── web/src/              # Frontend React 19 SPA
│   └── api/src/              # Backend Express REST API
│       ├── config/           # Zod-validated environment config
│       ├── controllers/      # Route controllers (auth, health)
│       ├── middleware/       # JWT auth guard, validation, logging, error handling
│       ├── routes/v1/        # Versioned route registry (/api/v1/auth, /api/v1/health)
│       ├── services/         # AuthService, PasswordService, TokenService, HealthService
│       ├── repositories/     # IUserRepository, PrismaUserRepository, MemoryUserRepository
│       └── utils/            # Domain error classes (AppError, ConflictError, UnauthorizedError)
├── packages/
│   └── shared/src/           # Shared domain models & Zod validation schemas
├── prisma/
│   └── schema.prisma         # PostgreSQL schema definition with Prisma (User with tokenVersion)
├── tests/
│   ├── api/auth.test.ts      # Supertest authentication & security tests (13 tests)
│   ├── api/health.test.ts    # Supertest health endpoint tests (2 tests)
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

## Authentication Endpoints (Milestone 2)

All API endpoints are versioned under `/api/v1/`.

| Method | Endpoint | Authorization | Description | Status Code |
|---|---|---|---|---|
| `POST` | `/api/v1/auth/register` | None | Normalizes email, validates input with Zod, hashes password with bcrypt (salt 12), persists user, and returns JWT | `201 Created` |
| `POST` | `/api/v1/auth/login` | None | Validates credentials against password hash, returns JWT token | `200 OK` |
| `GET` | `/api/v1/auth/me` | `Bearer <token>` | Verifies JWT signature, expiration, and `tokenVersion`; returns user profile | `200 OK` (or `401 Unauthorized`) |
| `POST` | `/api/v1/auth/logout` | `Bearer <token>` | Revokes token and increments `tokenVersion` on user record | `200 OK` |

### Security Guarantees
- **Bcrypt Hashing**: Passwords are salted with 12 rounds before database storage.
- **Credential Protection**: Password hashes are strictly omitted from all response DTOs and logs.
- **Safe Authentication Errors**: Login attempts with incorrect passwords or non-existent emails return identical `401 Unauthorized ("Invalid email or password")` errors, preventing user enumeration.
- **Token Invalidation**: Calling `/api/v1/auth/logout` immediately invalidates the token using an in-memory revocation blocklist and increments the database `tokenVersion`, invalidating all tokens issued with that version.

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
Verify the container is healthy:
```bash
docker compose ps
```

### 4. Install Dependencies & Generate Prisma Client
```bash
npm install
npx prisma generate
```

### 5. Run Database Migrations
Apply the initial PostgreSQL schema:
```bash
npx prisma migrate dev --name add_auth
```

### 6. Start the Full-Stack Development Server
```bash
npm run dev
```
- Web Application & Auth Playground: [http://localhost:3000](http://localhost:3000)
- API Health Endpoint: [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)

---

## Running Automated Tests

To run the complete test suite (19 integration and unit tests):
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
- [ ] **Milestone 3**: Project Creation, Workspaces & Role-Based Access Control (RBAC)
- [ ] **Milestone 4**: Task Management & Interactive Kanban Board
- [ ] **Milestone 5**: Executive Analytics Dashboard & Activity Audit Feeds
- [ ] **Milestone 6**: Automated Test Coverage Expansion & Portfolio Documentation Finalization
