"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
type Transaction = {
  id: number;
  amount: number;
  currency: string;
  type: string;
  status: string;
  description: string;
  createdAt: string;
};
export default function Earnings() {
  const [items, setItems] = useState<Transaction[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    void fetch("/api/portal/earnings")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load earnings");
        setItems((await response.json()) as Transaction[]);
      })
      .catch(() => setError(true));
  }, []);
  const total =
    items
      ?.filter((item) => item.status === "COMPLETED")
      .reduce((sum, item) => sum + item.amount, 0) ?? 0;
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Earnings</h1>
      {!items && !error && <div className="mt-6 h-48 animate-pulse rounded-2xl bg-muted" />}
      {error && (
        <p className="mt-6 rounded-xl border border-destructive/30 p-4 text-destructive">
          Earnings could not be loaded. Sign in as a professional to view this page.
        </p>
      )}
      {items && (
        <>
          <div className="mt-6 rounded-2xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Completed earnings</p>
            <p className="mt-1 text-3xl font-semibold">${total.toLocaleString()}</p>
          </div>
          {items.length ? (
            <ul className="mt-6 divide-y rounded-2xl border border-border bg-card">
              {items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4 p-5">
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString()} · {item.status}
                    </p>
                  </div>
                  <p className="font-semibold">
                    ${item.amount.toLocaleString()} {item.currency}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 rounded-2xl border border-border bg-card p-6 text-muted-foreground">
              No transactions yet.
            </p>
          )}
        </>
      )}
    </AppShell>
  );
}
