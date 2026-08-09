import { DatabaseStatus } from "@/components/DatabaseStatus";
import { AppShell } from "@/components/AppShell";
export default function Admin() {
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Admin panel</h1>
      <p className="mt-1 text-muted-foreground">Database health and platform administration.</p>
      <DatabaseStatus />
      <section className="mt-6 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-semibold">Administration data</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Mock records have been removed. The next step is implementing role-protected user,
          verification, and dispute administration commands against the database.
        </p>
      </section>
    </AppShell>
  );
}
