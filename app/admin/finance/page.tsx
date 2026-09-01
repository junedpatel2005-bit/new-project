"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  CircleDollarSign,
  Clock3,
  Landmark,
  WalletCards,
  XCircle,
} from "lucide-react";

type Payment = {
  id: number;
  clientId: number;
  professionalId: number;
  amount: number;
  baseAmount: number;
  clientFeeAmount: number;
  professionalPayoutAmount: number;
  adminNetAmount: number;
  currency: string;
  provider: string;
  status: string;
  failureReason: string | null;
  createdAt: string;
};
type WalletTopUp = {
  id: number;
  amount: number;
  status: string;
  providerReference: string | null;
  createdAt: string;
  wallet: { userId: number };
};
type Withdrawal = {
  id: number;
  professionalId: number;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
};
type PlatformWallet = {
  balance: number;
  currency: string;
  ownerName: string | null;
  totalReceived: number;
  totalPaidToProfessionals: number;
  retainedEarnings: number;
};
type PlatformLedgerItem = {
  id: number;
  type: string;
  amount: number;
  status: string;
  description: string;
  createdAt: string;
};
type Finance = {
  payments: Payment[];
  walletTransactions: WalletTopUp[];
  withdrawals: Withdrawal[];
  platformWallet: PlatformWallet | null;
  platformWalletTransactions: PlatformLedgerItem[];
  names: Record<string, string>;
};
type View = "latest" | "payments" | "wallet" | "payouts" | "failed";
type Activity = {
  id: string;
  view: Exclude<View, "latest">;
  title: string;
  person: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  detail?: string | null;
  paymentId?: number;
};

const money = (amount: number, currency = "INR") =>
  `₹${amount.toLocaleString("en-IN")} ${currency}`;
const statusClass = (status: string) =>
  status === "COMPLETED"
    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
    : status === "FAILED"
      ? "bg-rose-50 text-rose-700 border border-rose-200"
      : "bg-amber-50 text-amber-700 border border-amber-200";

export default function FinancePage() {
  const [data, setData] = useState<Finance | null>(null);
  const [view, setView] = useState<View>("latest");
  const [busyPaymentId, setBusyPaymentId] = useState<number | null>(null);

  useEffect(() => {
    void fetch("/api/v1/admin/data/finance", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const completedTotal = useMemo(
    () =>
      data?.payments
        .filter((item) => item.status === "COMPLETED")
        .reduce((sum, item) => sum + item.amount, 0) ?? 0,
    [data],
  );
  const pendingTotal = useMemo(
    () =>
      (data?.withdrawals
        .filter((item) => item.status === "PENDING")
        .reduce((sum, item) => sum + item.amount, 0) ?? 0) +
      (data?.payments
        .filter((item) => item.status === "FUNDED")
        .reduce((sum, item) => sum + item.professionalPayoutAmount, 0) ?? 0),
    [data],
  );
  const failedCount = useMemo(
    () =>
      (data?.payments.filter((item) => item.status === "FAILED").length ?? 0) +
      (data?.walletTransactions.filter((item) => item.status === "FAILED").length ?? 0),
    [data],
  );

  const activities = useMemo<Activity[]>(() => {
    if (!data) return [];
    return [
      ...data.payments.map((item) => ({
        id: `payment-${item.id}`,
        view:
          item.status === "FAILED"
            ? ("failed" as const)
            : item.status === "FUNDED"
              ? ("payouts" as const)
              : ("payments" as const),
        title:
          item.status === "FUNDED"
            ? `Milestone payout #${item.id}`
            : `Milestone payment #${item.id}`,
        person: data.names[item.clientId] ?? `Client #${item.clientId}`,
        amount: item.amount,
        currency: item.currency,
        status: item.status,
        createdAt: item.createdAt,
        detail: item.failureReason,
        paymentId: item.id,
      })),
      ...data.walletTransactions.map((item) => ({
        id: `topup-${item.id}`,
        view: item.status === "FAILED" ? ("failed" as const) : ("wallet" as const),
        title: "Client wallet top-up",
        person: data.names[item.wallet.userId] ?? `Client #${item.wallet.userId}`,
        amount: item.amount,
        currency: "INR",
        status: item.status,
        createdAt: item.createdAt,
        detail: item.providerReference,
      })),
      ...data.withdrawals.map((item) => ({
        id: `withdrawal-${item.id}`,
        view: "payouts" as const,
        title: "Professional payout request",
        person: data.names[item.professionalId] ?? `Professional #${item.professionalId}`,
        amount: item.amount,
        currency: item.currency,
        status: item.status,
        createdAt: item.createdAt,
        detail: null,
      })),
      ...data.platformWalletTransactions.map((item) => ({
        id: `platform-${item.id}`,
        view: "wallet" as const,
        title: item.type.replaceAll("_", " "),
        person: "Admin platform wallet",
        amount: Math.abs(item.amount),
        currency: "INR",
        status: item.status,
        createdAt: item.createdAt,
        detail: item.description,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [data]);

  const visibleActivities =
    view === "latest" ? activities.slice(0, 12) : activities.filter((item) => item.view === view);
  const toggleView = (next: Exclude<View, "latest">) =>
    setView((current) => (current === next ? "latest" : next));

  async function approvePayout(paymentId: number) {
    setBusyPaymentId(paymentId);
    try {
      const response = await fetch("/api/admin/finance/milestone-payout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "Payout could not be completed.");
      const refreshed = await fetch("/api/v1/admin/data/finance", { cache: "no-store" });
      if (refreshed.ok) setData(await refreshed.json());
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Payout could not be completed.");
    } finally {
      setBusyPaymentId(null);
    }
  }

  if (!data) return <div className="h-80 animate-pulse rounded-3xl bg-slate-100" />;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-600">
          Finance center
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-slate-900">Finance & payouts</h1>
        <p className="mt-1.5 text-slate-500">
          A clear view of platform money and the latest activity.
        </p>
      </header>

      <button
        type="button"
        onClick={() => toggleView("wallet")}
        className="flex w-full items-center gap-4 rounded-3xl border border-indigo-200 bg-indigo-50/50 p-5 text-left transition hover:border-indigo-300 hover:bg-indigo-50 shadow-xs"
      >
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-indigo-100 text-indigo-700">
          <WalletCards className="h-7 w-7" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold uppercase tracking-[.18em] text-indigo-700">
            Admin wallet
          </span>
          <span className="mt-1 block text-sm text-slate-600">
            Client fees received minus professional payouts. Click to view the wallet ledger.
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-2xl font-bold text-slate-900">
            {money(data.platformWallet?.balance ?? 0)}
          </span>
          <span className="text-xs font-medium text-slate-500">Available balance</span>
        </span>
      </button>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FinanceCard
          active={view === "payments"}
          icon={CircleDollarSign}
          label="Completed payments"
          value={money(completedTotal)}
          onClick={() => toggleView("payments")}
          tone="emerald"
        />
        <FinanceCard
          active={view === "wallet"}
          icon={WalletCards}
          label="Admin wallet balance"
          value={money(data.platformWallet?.balance ?? 0)}
          onClick={() => toggleView("wallet")}
          tone="indigo"
        />
        <FinanceCard
          active={view === "payouts"}
          icon={Clock3}
          label="Pending payouts"
          value={money(pendingTotal)}
          onClick={() => toggleView("payouts")}
          tone="amber"
        />
        <FinanceCard
          active={view === "failed"}
          icon={XCircle}
          label="Failed payments"
          value={String(failedCount)}
          onClick={() => toggleView("failed")}
          tone="rose"
        />
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-50/70 p-5">
          <div>
            <h2 className="font-display text-xl font-semibold text-slate-900">
              {view === "latest" ? "Latest transactions" : viewTitle(view)}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {view === "latest"
                ? "Newest activity across the platform."
                : "Click another summary card to change this list."}
            </p>
          </div>
          {view !== "latest" ? (
            <button
              type="button"
              onClick={() => setView("latest")}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
            >
              Show latest
            </button>
          ) : null}
        </div>
        <div className="divide-y divide-slate-100">
          {visibleActivities.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-slate-50/70 transition"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                {item.view === "failed" ? (
                  <XCircle className="h-5 w-5 text-rose-600" />
                ) : item.view === "payouts" ? (
                  <Landmark className="h-5 w-5 text-amber-600" />
                ) : item.view === "wallet" ? (
                  <WalletCards className="h-5 w-5 text-indigo-600" />
                ) : (
                  <ArrowDownLeft className="h-5 w-5 text-emerald-600" />
                )}
              </span>
              <div className="min-w-56 flex-1">
                <p className="font-semibold text-slate-900">{item.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{item.person}</p>
                {item.detail ? <p className="mt-0.5 text-xs text-slate-400">{item.detail}</p> : null}
              </div>
              <span className="text-sm text-slate-500 font-medium">
                {new Date(item.createdAt).toLocaleString()}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(item.status)}`}
              >
                {item.status}
              </span>
              <p className="min-w-32 text-right font-bold text-slate-900">
                {money(item.amount, item.currency)}
              </p>
              {item.paymentId && item.status === "FUNDED" ? (
                <button
                  type="button"
                  disabled={busyPaymentId === item.paymentId}
                  onClick={() => void approvePayout(item.paymentId!)}
                  className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-500 shadow-2xs disabled:opacity-50"
                >
                  {busyPaymentId === item.paymentId ? "Processing…" : "Approve payout"}
                </button>
              ) : null}
            </div>
          ))}
          {!visibleActivities.length ? (
            <p className="p-12 text-center text-sm text-slate-500">
              No transactions in this category.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function viewTitle(view: Exclude<View, "latest">) {
  return {
    payments: "Completed payments",
    wallet: "Admin wallet activity",
    payouts: "Pending payouts",
    failed: "Failed payments",
  }[view];
}

function FinanceCard({
  icon: Icon,
  label,
  value,
  tone,
  active,
  onClick,
}: {
  icon: typeof WalletCards;
  label: string;
  value: string;
  tone: "emerald" | "indigo" | "amber" | "rose";
  active: boolean;
  onClick: () => void;
}) {
  const styles = {
    emerald: "text-emerald-700 bg-emerald-50 border border-emerald-100",
    indigo: "text-indigo-700 bg-indigo-50 border border-indigo-100",
    amber: "text-amber-700 bg-amber-50 border border-amber-100",
    rose: "text-rose-700 bg-rose-50 border border-rose-100",
  };
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-3xl border p-5 text-left transition hover:-translate-y-0.5 shadow-xs ${
        active
          ? "border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-200"
          : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300"
      }`}
    >
      <span className={`grid h-11 w-11 place-items-center rounded-2xl ${styles[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-6 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-4 text-xs font-semibold text-indigo-600">View transactions →</p>
    </button>
  );
}
