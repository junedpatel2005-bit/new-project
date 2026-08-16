# Servio current architecture

**Status:** Current implementation inventory  
**Reviewed:** 16 August 2026  
**Scope:** The repository as implemented. This is not a description of the planned monorepo architecture.

## Runtime and project layout

Servio is a single npm-managed Next.js application. It uses the App Router, React 19, TypeScript, Tailwind CSS v4, Prisma, PostgreSQL, and Radix/shadcn-style UI components.

```text
app/                    Next.js page and API route entry points
src/components/         Shared application and UI components
src/hooks/              Client hooks
src/lib/                Database, auth, email, queries, types, utilities
src/routes/             Page implementations re-exported by most app pages
src/generated/prisma/   Generated Prisma client; do not edit manually
src/styles.css          Tailwind v4 tokens and global styles
prisma/                 Active schema, migrations, and seed script
docs/                   Current documentation and implementation records
```

There is no `apps/`, `packages/`, `pnpm-workspace.yaml`, `turbo.json`, or Docker Compose configuration in the current repository. The initial API contract is tracked in `docs/openapi.yaml`; it must be expanded whenever an endpoint changes.

## Application routes

| Area                     | Current routes                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------- |
| Public and marketing     | `/`, `/services`, `/how-it-works`, `/for-clients`, `/for-professionals`, `/pricing`, `/faq`, `/about`, `/contact`, `/blog`, `/careers`, `/terms`, `/privacy-policy`, `/cookies` |
| Authentication           | `/signup`, `/login`, `/verify`, `/forgot-password`, `/reset-password`, `/verification`            |
| Client-facing            | `/client-profile`, `/dashboard`, `/discover`, `/post-job`, `/job/[jobId]`, `/project/[projectId]`, `/project/[projectId]/tracking`, `/my-jobs`, `/reports`, `/my-info` |
| Professional-facing      | `/professional-profile`, `/professional`, `/professional/dashboard`, `/professional/my-jobs`, `/professional/running-projects`, `/professional/reports`, `/professional/reviews`, `/pro/[proId]`, `/earnings` |
| Shared or administrative | `/messages`, `/notifications`, `/admin` (login, users, verifications, operations, services, finance, reports, support, notifications, cms) |

Most page wrappers in `app/` re-export components from `src/routes/`. `client-profile` and `professional-profile` directly use `ProfileSetup`. The public marketing pages live in the `app/(marketing)/` route group, which wraps them in a shared layout rendering `SiteHeader` and `SiteFooter`, so the shell stays persistent across client-side navigation.

## Current API surface

The application currently has 44 API route handlers, including shared project-tracking actions and authenticated project-file upload/access routes. The `/api/v1/*` namespace rewrites to `/api/*` (`next.config.ts`) as a compatibility shim toward the versioned contract in `openapi.yaml`.

| Endpoint family               | Current capabilities                                                                                                        |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `/api/auth/[action]`          | Registration, login, logout, current-user lookup, email verification/resend, phone OTP, availability check, password reset, and Google OAuth callback flow |
| `/api/profile`                | Client and professional profile setup/update, locations                                                                    |
| `/api/dashboard`              | Authenticated client dashboard data                                                                                         |
| `/api/marketplace/[resource]` | Categories, professionals, jobs, and individual job/professional lookup                                                     |
| `/api/portal/[resource]`      | Notifications, professional earnings, messages, professional jobs, project lookup, project actions, project files           |
| `/api/client/*`              | Jobs CRUD, proposals, project requests, account, payments export                                                            |
| `/api/professional/*`        | Proposals, verification + document upload/access, profile, jobs/earnings export, favorite jobs                              |
| `/api/admin/*`               | Login, users, verifications, services, jobs, reports, CMS, data tables, database status                                     |
| `/api/wallet`                | Wallet balance and professional withdrawal requests                                                                         |
| `/api/website/*`             | Page text and CMS block content for public pages                                                                            |
| `/api/geocode`               | Nominatim address search/reverse geocoding (rate limited)                                                                   |
| `/api/contact`               | Contact form submissions                                                                                                    |
| `/api/v1/professionals`      | Versioned professional search with filtering and pagination                                                                 |

The API uses dynamic resource/action dispatchers rather than stable resource-specific REST paths. Errors are generally returned as `{ error: "message" }`, not a structured error contract; `src/lib/api-response.ts` provides an `apiError`/`apiSuccess` envelope used by newer handlers.

## Authentication

- `src/lib/auth.ts` creates a signed HS256 JWT containing `userId` and `role`.
- The token is stored in a `servio_session` HTTP-only, SameSite=Lax cookie with a seven-day lifetime.
- Protected handlers read and verify that cookie server-side.
- Passwords are hashed with bcrypt.
- Email verification and password-reset values are stored as hashes in the `ApiToken` table.
- Google sign-in uses an OAuth authorization-code exchange and stores temporary state in an HTTP-only cookie.

The current implementation does not have access/refresh token pairs, refresh-token rotation, Bearer-token support, PKCE, an API token contract, or a reusable auth service layer.

Realtime Socket.IO connections authenticate with the same session JWT (see `server.mjs`); each socket joins a `user:{id}` room scoped to its authenticated user.

## Database and Prisma

`prisma/schema.prisma` is the active schema. It defines 58 models, including users, client profiles/jobs, Projects, verification records, notifications, messages, payments/wallet records, CMS content, legacy migration records, and generated-content support.

Prisma is accessed through a shared client in `src/lib/db.ts`. The current data model includes plain latitude/longitude fields and does not contain PostGIS geography columns, a `GeoRepository`, an audit-log model, or a background-job queue model.

`src/generated/prisma/` is generated output and must be recreated from the schema rather than edited directly.

## Environment variables

Only variable names are recorded here. Never add secret values to documentation.

| Variable               | Used by                                     |
| ---------------------- | ------------------------------------------- |
| `DATABASE_URL`         | Prisma database connection and seed script  |
| `AUTH_SECRET`          | JWT signing and verification                |
| `APP_URL`              | Google OAuth callback and reset-email links |
| `GOOGLE_CLIENT_ID`     | Google OAuth                                |
| `GOOGLE_CLIENT_SECRET` | Google OAuth                                |
| `SMTP_HOST`            | Transactional email transport               |
| `SMTP_PORT`            | Transactional email transport               |
| `SMTP_USER`            | Transactional email transport               |
| `SMTP_PASS`            | Transactional email transport               |
| `SMTP_FROM`            | Transactional email sender                  |
| `NODE_ENV`             | Runtime security and development behavior   |

`.env.example` also includes Google Maps browser settings. They are not currently consumed by the application source.

## Validation and quality status

| Control                          | Current status                          |
| -------------------------------- | --------------------------------------- |
| Linting                          | `npm run lint` passes                   |
| Type checking                    | `npm run typecheck` passes              |
| Production build                 | `npm run build` passes                  |
| Automated tests                  | Vitest configured; 2 test files pass    |
| CI                               | `.github/workflows/quality.yml` runs lint, typecheck, tests, and build on push/PR |
| OpenAPI                          | `docs/openapi.yaml` (initial `/api/v1` contract) |
| Security headers/CSP             | Configured in `next.config.ts`          |
| Error monitoring                 | Sentry (server, edge, and client instrumentation) |
| Realtime notifications           | Socket.IO on the custom server (`server.mjs`) at `/api/realtime`, JWT-authenticated |
| PostGIS/Docker local environment | Not configured                          |

## Missing foundations before feature expansion

1. Product-owner approval of the Phase 1 baseline in `docs/product-baseline.md`.
2. Broader automated test coverage, including a test database strategy and API tests.
3. Stable versioned API, standard error envelope across all handlers, and a complete OpenAPI specification.
4. Framework-independent services and explicit public/private DTOs.
5. A reviewed authentication migration plan for mobile-ready access/refresh tokens.
6. Production hardening for verification-document review and a background-job queue.
7. A product-approved geospatial/privacy design before PostGIS or map features are implemented.
8. Legal approval before Stripe, escrow, wallet, tax, or payout work begins.

## Project-work file storage deployment note

Project Tracking files are private and are served only through the authenticated
`/api/portal/project-files/:fileId` route after confirming the requester is the
project's Client or Professional. The current development implementation stores
the bytes on the application server. Before a serverless production deployment,
configure persistent object storage or a persistent volume while retaining this
authenticated file-access route and the stable stored-file key.

## Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm run db:seed
npm run format
```
