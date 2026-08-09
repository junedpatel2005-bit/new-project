import { AppShell } from "@/components/AppShell";
import { transactions, earningsChart } from "@/lib/mock-data";
import { ArrowDownToLine, TrendingUp, Wallet, DollarSign, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Earnings() {
  const max = Math.max(...earningsChart.map((d) => d.value));

  return (
    <AppShell title="Earnings">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={Wallet}
          tint="text-primary bg-primary/10"
          label="Available balance"
          value="$8,420"
          sub="Ready to withdraw"
        />
        <Stat
          icon={TrendingUp}
          tint="text-success bg-success/15"
          label="This month"
          value="$7,400"
          sub="+24% vs. last"
        />
        <Stat
          icon={DollarSign}
          tint="text-accent bg-accent/15"
          label="Pending"
          value="$2,200"
          sub="In escrow"
        />
        <Stat
          icon={ArrowDownToLine}
          tint="text-warning bg-warning/15"
          label="Lifetime"
          value="$84,310"
          sub="Since 2024"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Earnings overview</h2>
              <p className="text-sm text-muted-foreground">Last 7 months</p>
            </div>
            <select className="h-9 rounded-lg border border-input bg-background px-2 text-sm">
              <option>Last 7 months</option>
              <option>Last 12 months</option>
              <option>YTD</option>
            </select>
          </div>
          <div className="mt-8 flex h-56 items-end gap-3">
            {earningsChart.map((d) => (
              <div key={d.month} className="group flex flex-1 flex-col items-center gap-2">
                <div className="relative w-full">
                  <div
                    className="w-full rounded-t-lg gradient-primary transition-all group-hover:opacity-90"
                    style={{ height: `${(d.value / max) * 200}px` }}
                  />
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background opacity-0 group-hover:opacity-100">
                    ${d.value.toLocaleString()}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{d.month}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl gradient-primary p-6 text-white shadow-elevated">
          <p className="text-sm opacity-80">Wallet balance</p>
          <p className="mt-2 text-4xl font-bold">$8,420.50</p>
          <p className="mt-1 text-xs opacity-80">Updated just now</p>
          <Button className="mt-6 w-full bg-white/15 text-white hover:bg-white/25">
            <ArrowDownToLine className="mr-2 h-4 w-4" /> Withdraw to bank
          </Button>
          <div className="mt-6 space-y-2 border-t border-white/20 pt-5 text-sm">
            <div className="flex justify-between">
              <span className="opacity-80">Bank</span>
              <span>•••• 4521</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-80">Payout cycle</span>
              <span>Weekly</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-80">Next payout</span>
              <span>May 12</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Transactions</h2>
          <Button variant="outline" size="sm">
            Export CSV
          </Button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-3 pr-4 font-medium">Date</th>
                <th className="py-3 pr-4 font-medium">Description</th>
                <th className="py-3 pr-4 font-medium">Type</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-border/60 last:border-0 hover:bg-muted/40"
                >
                  <td className="py-3 pr-4 text-muted-foreground">{t.date}</td>
                  <td className="py-3 pr-4">{t.desc}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        t.type === "Earning"
                          ? "bg-success/15 text-success"
                          : t.type === "Withdrawal"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {t.type}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">{t.status}</td>
                  <td
                    className={`py-3 text-right font-medium ${t.amount < 0 ? "text-foreground" : "text-success"}`}
                  >
                    {t.amount < 0 ? "-" : "+"}${Math.abs(t.amount).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({
  icon: Icon,
  tint,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  tint: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${tint}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-2xl font-semibold">{value}</p>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
