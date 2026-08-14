"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  CircleDollarSign,
  Clock3,
  Landmark,
  ReceiptText,
  Users,
} from "lucide-react";

type Transaction = {
  id: number;
  clientId: number;
  professionalId: number;
  amount: number;
  currency: string;
  type: string;
  status: string;
  description: string;
  createdAt: string;
};
type Withdrawal = {
  id: number;
  professionalId: number;
  amount: number;
  currency: string;
  destinationLabel: string | null;
  status: string;
  createdAt: string;
};
type Finance = {
  transactions: Transaction[];
  withdrawals: Withdrawal[];
  names: Record<string, string>;
};
const money = (value: number) => `$${value.toLocaleString()}`;
export default function FinancePage() {
  const [data, setData] = useState<Finance | null>(null);
  const [tab, setTab] = useState<"payments" | "payouts">("payments");
  useEffect(() => {
    void fetch("/api/v1/admin/data/finance", { cache: "no-store" })
      .then((response) => response.json())
      .then(setData);
  }, []);
  const paid = useMemo(
    () =>
      data?.transactions
        .filter((item) => item.status === "COMPLETED")
        .reduce((sum, item) => sum + item.amount, 0) ?? 0,
    [data],
  );
  const pending = useMemo(
    () =>
      data?.withdrawals
        .filter((item) => item.status === "PENDING")
        .reduce((sum, item) => sum + item.amount, 0) ?? 0,
    [data],
  );
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-400">Finance center</p>
      <h1 className="mt-2 font-display text-3xl font-bold">Finance & payouts</h1>
      <p className="mt-2 text-slate-400">
        Review completed client payments and professional withdrawal requests.
      </p>
      {!data ? (
        <div className="mt-8 h-72 animate-pulse rounded-3xl bg-white/5" />
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              icon={CircleDollarSign}
              label="Completed payments"
              value={money(paid)}
              tone="emerald"
            />
            <Metric
              icon={ReceiptText}
              label="Payment records"
              value={String(data.transactions.length)}
              tone="blue"
            />
            <Metric icon={Clock3} label="Pending payouts" value={money(pending)} tone="amber" />
            <Metric
              icon={Landmark}
              label="Withdrawal requests"
              value={String(data.withdrawals.length)}
              tone="indigo"
            />
          </div>
          <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[.035]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5">
              <div>
                <h2 className="font-display text-xl font-semibold">Financial activity</h2>
                <p className="mt-1 text-sm text-slate-400">Latest marketplace money movement</p>
              </div>
              <div className="flex rounded-xl bg-[#0b1020] p-1">
                <button
                  onClick={() => setTab("payments")}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === "payments" ? "bg-indigo-500 text-white" : "text-slate-400"}`}
                >
                  Payments
                </button>
                <button
                  onClick={() => setTab("payouts")}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === "payouts" ? "bg-indigo-500 text-white" : "text-slate-400"}`}
                >
                  Payouts
                </button>
              </div>
            </div>
            {tab === "payments" ? (
              <div className="divide-y divide-white/10">
                {data.transactions.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300">
                      <ArrowDownLeft className="h-5 w-5" />
                    </span>
                    <div className="min-w-52 flex-1">
                      <p className="font-semibold text-white">{item.description}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Client: {data.names[item.clientId] ?? `#${item.clientId}`} · Professional:{" "}
                        {data.names[item.professionalId] ?? `#${item.professionalId}`}
                      </p>
                    </div>
                    <span className="text-sm text-slate-400">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                    <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                      {item.status}
                    </span>
                    <p className="min-w-24 text-right font-bold text-white">
                      {money(item.amount)}{" "}
                      <span className="text-xs text-slate-400">{item.currency}</span>
                    </p>
                  </div>
                ))}
                {!data.transactions.length && <Empty text="No payment records yet." />}
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {data.withdrawals.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400/10 text-amber-300">
                      <Landmark className="h-5 w-5" />
                    </span>
                    <div className="min-w-52 flex-1">
                      <p className="font-semibold text-white">
                        {data.names[item.professionalId] ?? `Professional #${item.professionalId}`}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Destination: {item.destinationLabel ?? "Not provided"}
                      </p>
                    </div>
                    <span className="text-sm text-slate-400">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === "COMPLETED" ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}
                    >
                      {item.status}
                    </span>
                    <p className="min-w-24 text-right font-bold text-white">
                      {money(item.amount)}{" "}
                      <span className="text-xs text-slate-400">{item.currency}</span>
                    </p>
                  </div>
                ))}
                {!data.withdrawals.length && (
                  <Empty text="No professional withdrawal requests yet." />
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  tone: "emerald" | "blue" | "amber" | "indigo";
}) {
  const color = {
    emerald: "text-emerald-300 bg-emerald-400/10",
    blue: "text-blue-300 bg-blue-400/10",
    amber: "text-amber-300 bg-amber-400/10",
    indigo: "text-indigo-300 bg-indigo-400/10",
  }[tone];
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-5 text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <p className="p-10 text-center text-sm text-slate-400">{text}</p>;
}
