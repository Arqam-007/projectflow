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
│       ├── controllers/      # Route controllers (auth, health)
│       ├── middleware/       # JWT auth guard, error handling, validation, logging
│       ├── routes/v1/        # Versioned route registry (/api/v1/auth, /api/v1/health)
│       ├── services/         # AuthService, PasswordService, TokenService, HealthService
│       ├── repositories/     # IUserRepository, PrismaUserRepository, MemoryUserRepository
│       ├── utils/            # Domain errors (AppError, ConflictError, UnauthorizedError)
│       └── app.ts            # Express application setup
├── packages/
│   └── shared/src/           # Shared types and Zod schemas
│       ├── types.ts          # Core domain models (User, RegisterRequest, AuthResponse)
│       └── schemas.ts        # Zod validation schemas (RegisterSchema, LoginSchema)
├── prisma/
│   └── schema.prisma         # PostgreSQL schema definition with Prisma (User + tokenVersion)
├── tests/
│   ├── api/auth.test.ts      # Supertest auth integration tests (13 tests)
│   ├── api/health.test.ts    # Supertest health tests (2 tests)
│   └── unit/validation.test.ts # Zod schema unit tests (4 tests)
├── .github/workflows/
│   └── ci.yml                # GitHub Actions automated lint, test, build
├── docker-compose.yml        # Local PostgreSQL container service
├── Dockerfile                # Production multi-stage build container
├── server.ts                 # Full-stack dev & prod runner (Vite + Express)
└── README.md                 # Setup & portfolio guide
```

## 2. Authentication & Authorization Architecture (Milestone 2)

ProjectFlow implements stateless JSON Web Token (JWT) authentication coupled with token version revocation:

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
        ├── 3. GET /api/v1/auth/me (Authorization: Bearer <token>)
        │      └── authenticateToken middleware verifies JWT signature & expiry
        │      └── Verifies payload.tokenVersion === user.tokenVersion in DB
        │      └── Injects req.user -> Returns authenticated user profile
        │
        └── 4. POST /api/v1/auth/logout (Authorization: Bearer <token>)
               └── Adds token to in-memory revocation list
               └── Increments user.tokenVersion in database -> Instantly invalidates all prior tokens
```

### Security Guarantees
1. **Password Hashing**: Passwords hashed with `bcryptjs` using 12 salt rounds before database persistence.
2. **Zero Credential Leakage**: Password hashes and secret keys are excluded from API response serializations and structured logs.
3. **No User Enumeration**: Login failures due to invalid passwords or non-existent emails return identical `401 Unauthorized ("Invalid email or password")` responses.
4. **Normalized Identifiers**: Emails are normalized (`trim().toLowerCase()`) and enforced as unique in PostgreSQL.
5. **Token Revocation**: Tokens can be invalidated immediately upon logout by incrementing `tokenVersion` on the User record.

## 3. API Endpoints

All API routes are prefixed under `/api/v1/`.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/health` | Public | Telemetry, uptime, and database connection state |
| `POST` | `/api/v1/auth/register` | Public | Registers new user, hashes password, returns JWT token (201) |
| `POST` | `/api/v1/auth/login` | Public | Authenticates credentials, returns JWT token (200) |
| `POST` | `/api/v1/auth/logout` | Authenticated | Invalidates token and increments `tokenVersion` (200) |
| `GET` | `/api/v1/auth/me` | Authenticated | Returns authenticated user profile (200) |
