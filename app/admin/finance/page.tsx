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
  destinationType?: string;
  destinationLabel: string | null;
  status: string;
  createdAt: string;
  failureReason?: string | null;
};
type RazorpayPayment = {
  id: number;
  clientId: number;
  professionalId: number;
  amount: number;
  commissionAmount: number;
  currency: string;
  provider: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  projectTrackingId: number | null;
  milestoneId: number | null;
  status: string;
  failureReason: string | null;
  capturedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
type Finance = {
  transactions: Transaction[];
  withdrawals: Withdrawal[];
  payments: RazorpayPayment[];
  names: Record<string, string>;
};
const money = (value: number) => `₹${value.toLocaleString()}`;
export default function FinancePage() {
  const [data, setData] = useState<Finance | null>(null);
  const [tab, setTab] = useState<"earnings" | "commission" | "payouts">("earnings");
  const [payoutPayment, setPayoutPayment] = useState<Record<number, string>>({});
  const [processing, setProcessing] = useState<number | null>(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  useEffect(() => {
    void fetch("/api/v1/admin/data/finance", { cache: "no-store" })
      .then((response) => response.json())
      .then(setData);
  }, []);
  const paid = useMemo(
    () =>
      data?.payments
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
  const commission = useMemo(
    () =>
      data?.payments
        .filter((item) => item.status === "COMPLETED")
        .reduce((sum, item) => sum + item.commissionAmount, 0) ?? 0,
    [data],
  );
  async function processPayout(withdrawalId: number) {
    const paymentId = Number(payoutPayment[withdrawalId]);
    if (!paymentId) return;
    setProcessing(withdrawalId);
    const response = await fetch("/api/admin/finance/payouts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ withdrawalId, paymentId }),
    });
    const result = await response.json().catch(() => null);
    setProcessing(null);
    if (!response.ok) window.alert(result?.error ?? "Unable to process payout.");
    else window.location.reload();
  }
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
              label="Razorpay payment records"
              value={String(data.payments.length)}
              tone="blue"
            />
            <Metric icon={Clock3} label="Pending payouts" value={money(pending)} tone="amber" />
            <Metric
              icon={Landmark}
              label="Withdrawal requests"
              value={String(data.withdrawals.length)}
              tone="indigo"
            />
            <Metric
              icon={CircleDollarSign}
              label="Platform commission"
              value={money(commission)}
              tone="blue"
            />
          </div>
          <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[.035]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5">
              <div>
                <h2 className="font-display text-xl font-semibold">Financial activity</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Razorpay payments and professional payouts
                </p>
              </div>
              <div className="flex rounded-xl bg-[#0b1020] p-1">
                <button
                  onClick={() => setTab("earnings")}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === "earnings" ? "bg-indigo-500 text-white" : "text-slate-400"}`}
                >
                  Earnings reports
                </button>
                <button
                  onClick={() => setTab("commission")}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === "commission" ? "bg-indigo-500 text-white" : "text-slate-400"}`}
                >
                  Commission reports
                </button>
                <button
                  onClick={() => setTab("payouts")}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === "payouts" ? "bg-indigo-500 text-white" : "text-slate-400"}`}
                >
                  Payouts
                </button>
              </div>
            </div>
            {tab === "earnings" ? (
              <div className="divide-y divide-white/10">
                {data.payments.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300">
                      <ArrowDownLeft className="h-5 w-5" />
                    </span>
                    <div className="min-w-52 flex-1">
                      <p className="font-semibold text-white">
                        Razorpay payment #{item.razorpayPaymentId ?? "pending"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Client: {data.names[item.clientId] ?? `#${item.clientId}`} · Professional:{" "}
                        {data.names[item.professionalId] ?? `#${item.professionalId}`}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Order: {item.razorpayOrderId ?? "Not created"}
                        {item.projectTrackingId ? ` · Project #${item.projectTrackingId}` : ""}
                        {item.milestoneId ? ` · Milestone #${item.milestoneId}` : ""}
                      </p>
                    </div>
                    <span className="text-sm text-slate-400">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === "COMPLETED" ? "bg-emerald-400/10 text-emerald-300" : item.status === "FAILED" ? "bg-rose-400/10 text-rose-300" : "bg-amber-400/10 text-amber-300"}`}
                    >
                      {item.status}
                    </span>
                    <p className="min-w-24 text-right font-bold text-white">
                      {money(item.amount)}{" "}
                      <span className="text-xs text-slate-400">{item.currency}</span>
                    </p>
                    {item.status === "PENDING" ? (
                      <div className="flex w-full items-center justify-end gap-2">
                        <select
                          className="rounded-lg border border-white/10 bg-[#0b1020] px-2 py-2 text-xs text-slate-300"
                          value={payoutPayment[item.id] ?? ""}
                          onChange={(event) =>
                            setPayoutPayment((current) => ({
                              ...current,
                              [item.id]: event.target.value,
                            }))
                          }
                        >
                          <option value="">Select captured payment</option>
                          {data.payments
                            .filter(
                              (payment) =>
                                payment.status === "COMPLETED" &&
                                payment.professionalId === item.professionalId &&
                                payment.razorpayPaymentId,
                            )
                            .map((payment) => (
                              <option key={payment.id} value={payment.id}>
                                Payment #{payment.id} · {money(payment.amount)}
                              </option>
                            ))}
                        </select>
                        <button
                          className="rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                          disabled={!payoutPayment[item.id] || processing === item.id}
                          onClick={() => void processPayout(item.id)}
                        >
                          {processing === item.id ? "Processing…" : "Send with Razorpay"}
                        </button>
                      </div>
                    ) : null}
                    {item.failureReason ? (
                      <p className="basis-full text-xs text-rose-300">{item.failureReason}</p>
                    ) : null}
                    {item.failureReason ? (
                      <p className="basis-full text-xs text-rose-300">{item.failureReason}</p>
                    ) : null}
                  </div>
                ))}
                {!data.payments.length && <Empty text="No Razorpay payment records yet." />}
              </div>
            ) : tab === "commission" ? (
              <div className="divide-y divide-white/10">
                {data.payments
                  .filter((item) => item.status === "COMPLETED")
                  .map((item) => (
                    <div key={item.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-400/10 text-blue-300">
                        <CircleDollarSign className="h-5 w-5" />
                      </span>
                      <div className="min-w-52 flex-1">
                        <p className="font-semibold text-white">Payment #{item.id}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {data.names[item.clientId] ?? `Client #${item.clientId}`} · Razorpay
                          payment
                        </p>
                      </div>
                      <span className="text-sm text-slate-400">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                      <p className="text-sm text-slate-400">Payment: {money(item.amount)}</p>
                      <p className="min-w-28 text-right font-bold text-blue-300">
                        Commission: {money(item.commissionAmount)}
                      </p>
                    </div>
                  ))}
                {!data.payments.some((item) => item.status === "COMPLETED") && (
                  <Empty text="No commission records yet." />
                )}
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {data.withdrawals.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedWithdrawal(item)}
                    className="flex w-full flex-wrap items-center gap-4 px-5 py-4 text-left transition hover:bg-white/[.04]"
                  >
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
                  </button>
                ))}
                {!data.withdrawals.length && (
                  <Empty text="No professional withdrawal requests yet." />
                )}
              </div>
            )}
          </section>
          {selectedWithdrawal ? (
            <div
              className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
              role="presentation"
              onClick={() => setSelectedWithdrawal(null)}
            >
              <section
                className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#121827] p-6 text-white shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="withdrawal-details-title"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[.18em] text-indigo-300">
                      Withdrawal request #{selectedWithdrawal.id}
                    </p>
                    <h2 id="withdrawal-details-title" className="mt-2 text-2xl font-bold">
                      {data.names[selectedWithdrawal.professionalId] ??
                        `Professional #${selectedWithdrawal.professionalId}`}
                    </h2>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg px-3 py-1 text-2xl text-slate-400 hover:bg-white/10 hover:text-white"
                    onClick={() => setSelectedWithdrawal(null)}
                    aria-label="Close withdrawal details"
                  >
                    ×
                  </button>
                </div>
                <div className="mt-6 grid gap-3 rounded-xl bg-white/[.04] p-4 text-sm">
                  <Detail
                    label="Amount"
                    value={`${money(selectedWithdrawal.amount)} ${selectedWithdrawal.currency}`}
                  />
                  <Detail label="Status" value={selectedWithdrawal.status} />
                  <Detail
                    label="Destination type"
                    value={selectedWithdrawal.destinationType ?? "BANK"}
                  />
                  <Detail
                    label="Destination"
                    value={selectedWithdrawal.destinationLabel ?? "Not provided"}
                  />
                  <Detail
                    label="Requested"
                    value={new Date(selectedWithdrawal.createdAt).toLocaleString()}
                  />
                  {selectedWithdrawal.failureReason ? (
                    <Detail label="Failure reason" value={selectedWithdrawal.failureReason} />
                  ) : null}
                </div>
                {selectedWithdrawal.status === "PENDING" ? (
                  <div className="mt-5">
                    <label className="text-sm font-semibold text-slate-300">
                      Captured payment to use for this payout
                      <select
                        className="mt-2 w-full rounded-lg border border-white/10 bg-[#0b1020] px-3 py-2 text-sm text-slate-300"
                        value={payoutPayment[selectedWithdrawal.id] ?? ""}
                        onChange={(event) =>
                          setPayoutPayment((current) => ({
                            ...current,
                            [selectedWithdrawal.id]: event.target.value,
                          }))
                        }
                      >
                        <option value="">Select captured payment</option>
                        {data.payments
                          .filter(
                            (payment) =>
                              payment.status === "COMPLETED" &&
                              payment.professionalId === selectedWithdrawal.professionalId &&
                              Boolean(payment.razorpayPaymentId),
                          )
                          .map((payment) => (
                            <option key={payment.id} value={payment.id}>
                              Payment #{payment.id} · {money(payment.amount)}
                            </option>
                          ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className="mt-4 w-full rounded-lg bg-indigo-500 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={
                        !payoutPayment[selectedWithdrawal.id] ||
                        processing === selectedWithdrawal.id
                      }
                      onClick={() => void processPayout(selectedWithdrawal.id)}
                    >
                      {processing === selectedWithdrawal.id ? "Processing…" : "Send with Razorpay"}
                    </button>
                  </div>
                ) : null}
              </section>
            </div>
          ) : null}
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
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-3 border-b border-white/10 pb-3 last:border-0 last:pb-0">
      <span className="text-slate-400">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
