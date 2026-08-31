# Integration Testing

## Requirements

- Node.js 22
- npm dependencies installed
- Docker Desktop or Docker Engine with Compose
- No production or staging credentials

The local test database is `servio_integration_test`, bound only to `127.0.0.1:55432`, with an ephemeral Docker volume (`tmpfs`). CI uses an isolated PostgreSQL service container.

## Safety Rules

Integration commands require `NODE_ENV=test` and `TEST_DATABASE_URL`. The URL must use a local/CI-scoped host and a database name containing `test`, `integration`, or `disposable`; production/staging names and fallback URLs are rejected.

NEVER USE PRODUCTION DATABASE_URL.

The integration runner sets `DATABASE_URL` and `DIRECT_URL` to the dedicated test URL only after the safety check. `TEST_DATABASE_URL` is never allowed to fall back to another variable.

## Starting PostgreSQL

```bash
npm run test:db:up
```

The built-in Compose credentials are disposable test credentials only.

## Migration Replay

```bash
cross-env NODE_ENV=test TEST_DATABASE_URL=postgresql://servio_test:servio_test_password@127.0.0.1:55432/servio_integration_test npm run test:migrations
```

This is the **MIGRATION REPLAY TEST DATABASE**. It starts empty and runs `npx prisma migrate deploy`. It is expected to fail while `prisma/migrations/0_init/migration.sql` remains empty; that failure is recorded as MIG-001 evidence and must not be ignored.

## Application Integration Tests

```bash
cross-env NODE_ENV=test TEST_DATABASE_URL=postgresql://servio_test:servio_test_password@127.0.0.1:55432/servio_integration_test npm run test:integration
```

This is the **CURRENT SCHEMA TEST DATABASE**. It uses `prisma db push --force-reset` only for disposable test setup and never as evidence that migrations are valid. It then runs the real PostgreSQL integration tests.

## Cleanup

```bash
cross-env NODE_ENV=test TEST_DATABASE_URL=postgresql://servio_test:servio_test_password@127.0.0.1:55432/servio_integration_test npm run test:db:down
```

Cleanup removes only the Compose test container and ephemeral volume after the safety guard passes.

## CI Behavior

CI runs current-schema integration tests in one isolated PostgreSQL service. A separate migration-replay diagnostic job intentionally fails while MIG-001 is unresolved; this keeps the known blocker visible instead of allowing a false-green migration check.

## Known Limitations

The current integration suite covers real PostgreSQL OTP concurrency and expiry. Financial webhook, project-transition, IDOR, constraint, session-revocation, upload, and rollback suites still need to be added. Twilio and Razorpay remain provider-verification concerns; tests must use signed fixtures and never contact the real providers.
