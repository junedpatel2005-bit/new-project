# Integration Test Report

## Environment

PostgreSQL version: NOT AVAILABLE — Docker is not installed in this workspace.  
Prisma version: 7.9.1.  
Node version: 22.23.1.  
Database name: `servio_integration_test` (configured target; not started).  
Production database used: NO

## Migration Replay

Result: NOT AVAILABLE locally; CI job configured.  
Failure migration: Not executed locally.  
Failure reason: Docker/PostgreSQL runtime unavailable. The known expected result after startup is `MIG-001 CONFIRMED` because `prisma/migrations/0_init/migration.sql` is empty; the CI diagnostic job is intentionally not masked.  
MIG-001 status: NOT FIXED

## Integrity Migration

Clean-data test: NOT AVAILABLE.  
Invalid-data preflight test: NOT AVAILABLE.  
FK verification: NOT AVAILABLE.  
CHECK verification: NOT AVAILABLE.  
Unique verification: NOT AVAILABLE.

## Razorpay Financial Tests

| Scenario                         | Result                                | Database Assertions                                                    |
| -------------------------------- | ------------------------------------- | ---------------------------------------------------------------------- |
| Successful event                 | NOT AVAILABLE — test added            | Requires disposable PostgreSQL and signed fixture                      |
| Duplicate event                  | NOT AVAILABLE — test added            | Requires event/payment effect counts                                   |
| Failure/rollback                 | NOT AVAILABLE — test added            | Requires mismatch/failure fixture; injected DB failure remains pending |
| Retry after failure              | NOT AVAILABLE — test added            | Requires FAILED-to-PROCESSED transition                                |
| Concurrent identical webhook     | NOT AVAILABLE — test added            | Requires two concurrent route calls                                    |
| Wrong order/payment relationship | NOT AVAILABLE — coverage pending      | Requires no unrelated row mutation                                     |
| Amount/currency mismatch         | NOT AVAILABLE — covered by retry test | Requires rejected event and unchanged rows                             |
| Out-of-order event               | NOT AVAILABLE — test added            | Requires terminal-state assertion                                      |

## OTP Concurrency

Test code exists for two concurrent development OTP consumers and expired codes in `tests/integration/database.integration.test.ts`. Execution: NOT AVAILABLE because PostgreSQL/Docker is unavailable. Twilio remains NEEDS PROVIDER VERIFICATION.

## Project Concurrency

NOT AVAILABLE. No project-transition integration tests are currently implemented.

## Transaction Rollback

NOT AVAILABLE. The Razorpay route uses a local transaction in source, but failure injection has not been exercised against PostgreSQL.

## IDOR Matrix

NOT AVAILABLE. The required Client A/B, Professional A/B, and Admin route matrix is not yet implemented.

## Constraint Tests

NOT AVAILABLE. Current-schema setup will use `prisma db push` only for disposable application tests; this does not prove migration replay or the pending integrity migration.

## Validation

| Command                                                | Result             | Notes                                       |
| ------------------------------------------------------ | ------------------ | ------------------------------------------- |
| `npx prisma format`                                    | PASS               | Ran locally                                 |
| `npx prisma validate`                                  | PASS               | Ran locally                                 |
| `npx prisma generate`                                  | PASS               | Ran locally                                 |
| `npm run typecheck`                                    | PASS               | Ran locally                                 |
| `npm test -- --run`                                    | PASS               | 12 unit tests in 3 files                    |
| `npm run lint`                                         | PASS WITH WARNINGS | 6 existing React Hook warnings              |
| `npm run build`                                        | PASS               | Next.js 16.3.0                              |
| `npm run test:integration` without `TEST_DATABASE_URL` | EXPECTED FAIL      | Safety guard stopped before database access |
| Disposable PostgreSQL integration                      | NOT AVAILABLE      | Docker not installed                        |
| Migration replay                                       | NOT AVAILABLE      | CI job configured but not run here          |

## Remaining Failures

- MIG-001 remains unresolved.
- No PostgreSQL integration results exist yet.
- Financial webhook, project concurrency, transaction rollback, IDOR, constraint, and session tests remain pending.
- CI migration replay is expected to fail until the baseline is repaired; this failure must remain visible.

## Remaining Live Verification

- Deployed migration history and schema comparison.
- Integrity preflight and actual constraints/indexes.
- RLS, grants, Storage, Realtime, and function security.
- Provider webhook settings and staging payment fixtures.
- Backup/restore and rollback rehearsal.

## Production Readiness

The test harness and safety controls are implemented, but no real PostgreSQL integration test has run in this workspace. The application remains blocked by migration replay, financial test coverage, authorization testing, session revocation, live database verification, provider verification, and restore rehearsal.

NOT PRODUCTION READY
