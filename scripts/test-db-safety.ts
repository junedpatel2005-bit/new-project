export function assertDisposableTestDatabase() {
  if (process.env.NODE_ENV !== "test")
    throw new Error("Refusing database test: NODE_ENV must be test.");

  const rawUrl = process.env.TEST_DATABASE_URL;
  if (!rawUrl) throw new Error("Refusing database test: TEST_DATABASE_URL is required.");

  let databaseUrl: URL;
  try {
    databaseUrl = new URL(rawUrl);
  } catch {
    throw new Error("Refusing database test: TEST_DATABASE_URL is not a valid URL.");
  }

  const databaseName = decodeURIComponent(databaseUrl.pathname.slice(1)).toLowerCase();
  const hostname = databaseUrl.hostname.toLowerCase();
  const safeHost = new Set(["127.0.0.1", "localhost", "::1", "postgres"]);
  if (!safeHost.has(hostname))
    throw new Error(
      "Refusing database test: test database host is not local or CI service-scoped.",
    );
  if (!/(test|integration|disposable)/.test(databaseName) || /prod|staging/.test(databaseName))
    throw new Error("Refusing database test: database name is not clearly disposable.");
  if (process.env.DATABASE_URL === rawUrl || process.env.DIRECT_URL === rawUrl)
    throw new Error("Refusing database test: test URL matches an application database URL.");

  return rawUrl;
}
