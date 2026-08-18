"use client";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
import { CardListSkeleton } from "@/components/LoadingSkeleton";
type Payment = {
  id: number;
  amount: number;
  currency: string;
  type: string;
  status: string;
  description: string;
  createdAt: string;
};
export default function ClientEarnings() {
  const [payments, setPayments] = useState<Payment[] | null>(null);
  useEffect(() => {
    void fetch("/api/v1/portal/earnings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then(setPayments);
  }, []);
  const completed = useMemo(
    () => payments?.filter((payment) => payment.status === "COMPLETED") ?? [],
    [payments],
  );
  const total = completed.reduce((sum, p) => sum + p.amount, 0);
  const thisMonth = useMemo(
    () =>
      completed
        .filter((p) => {
          const d = new Date(p.createdAt),
            now = new Date();
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((sum, p) => sum + p.amount, 0),
    [completed],
  );
  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-[linear-gradient(120deg,var(--color-ink),var(--color-primary))] p-7 text-white shadow-card">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-white/65">Client payments</p>
        <h1 className="mt-3 font-display text-3xl font-bold">Clear project payment records.</h1>
        <p className="mt-2 text-sm text-white/75">
          Review every approved milestone payment to professionals in one place.
        </p>
      </section>
      {!payments ? (
        <CardListSkeleton count={3} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat icon={CircleDollarSign} value={`₹${total.toLocaleString()}`} label="Total paid" />
            <Stat
              icon={CalendarDays}
              value={`₹${thisMonth.toLocaleString()}`}
              label="Paid this month"
            />
            <Stat icon={ReceiptText} value={String(completed.length)} label="Approved milestones" />
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
              <div className="flex items-center justify-between border-b border-border p-5">
                <div>
                  <h2 className="font-display text-xl font-semibold">Payment history</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Payments are released after milestone approval.
                  </p>
                </div>
                <ReceiptText className="h-5 w-5 text-primary" />
              </div>
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between gap-4 border-b border-border p-5 last:border-0"
                >
                  <div>
                    <p className="font-semibold">{payment.description}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {new Date(payment.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      ₹{payment.amount.toLocaleString()} {payment.currency}
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {payment.status === "COMPLETED" ? "Paid" : payment.status}
                    </p>
                  </div>
                </div>
              ))}
              {!payments.length && (
                <p className="p-8 text-sm text-muted-foreground">No milestone payments yet.</p>
              )}
            </section>
            <aside className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <h2 className="mt-5 font-display text-xl font-semibold">How payment works</h2>
              <ol className="mt-4 space-y-4 text-sm text-muted-foreground">
                <li>
                  <span className="mr-2 font-semibold text-primary">1.</span>A professional submits
                  their milestone work.
                </li>
                <li>
                  <span className="mr-2 font-semibold text-primary">2.</span>You review and approve
                  the milestone.
                </li>
                <li>
                  <span className="mr-2 font-semibold text-primary">3.</span>The approved amount is
                  recorded and released to the professional.
                </li>
              </ol>
              <p className="mt-6 rounded-xl bg-primary/5 p-4 text-sm text-muted-foreground">
                Need to review a payment? Open the related project from your Projects page.
              </p>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
function Stat({ icon: Icon, value, label }: { icon: LucideIcon; value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-4 text-3xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
