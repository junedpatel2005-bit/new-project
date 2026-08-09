import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileCheck2,
  Clock,
  AlertCircle,
  BadgeCheck,
  IdCard,
  ScrollText,
  FileText,
  Shield,
  type LucideIcon,
} from "lucide-react";

type Status = "approved" | "reviewing" | "pending" | "rejected";

const docs: { icon: LucideIcon; title: string; desc: string; status: Status; file?: string }[] = [
  {
    icon: IdCard,
    title: "Government ID",
    desc: "Driver's license, passport, or national ID.",
    status: "approved",
    file: "passport.pdf",
  },
  {
    icon: ScrollText,
    title: "Trade License",
    desc: "Required for plumbing, electrical & HVAC.",
    status: "reviewing",
    file: "trade-license.pdf",
  },
  {
    icon: FileText,
    title: "Certifications",
    desc: "Optional — boost your profile with industry certs.",
    status: "pending",
  },
  {
    icon: Shield,
    title: "Insurance",
    desc: "Recommended for in-home services.",
    status: "rejected",
    file: "insurance.jpg",
  },
];

const statusMap = {
  approved: { label: "Approved", color: "bg-success/10 text-success", icon: FileCheck2 },
  reviewing: { label: "Reviewing", color: "bg-primary/10 text-primary", icon: Clock },
  pending: { label: "Not uploaded", color: "bg-warning/15 text-warning-foreground", icon: Upload },
  rejected: { label: "Rejected", color: "bg-destructive/10 text-destructive", icon: AlertCircle },
} as const;

export default function Verification() {
  return (
    <AppShell title="Verification">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-card to-success/5 p-6 shadow-soft">
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-success text-success-foreground shadow-soft">
            <BadgeCheck className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h2 className="font-display text-xl font-bold">You're 50% verified</h2>
            <p className="text-sm text-muted-foreground">
              Complete remaining documents to earn the full Trusted Pro badge.
            </p>
            <div className="mt-3 h-2 w-full max-w-md overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/2 rounded-full bg-success" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {docs.map((d) => {
          const s = statusMap[d.status];
          return (
            <div key={d.title} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="flex items-start gap-4">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <d.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-base font-semibold">{d.title}</h3>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.color}`}
                    >
                      <s.icon className="h-3 w-3" /> {s.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{d.desc}</p>
                </div>
              </div>

              {d.file ? (
                <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2.5 text-sm">
                  <span className="truncate">{d.file}</span>
                  <Button size="sm" variant="ghost">
                    Replace
                  </Button>
                </div>
              ) : (
                <div className="mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-6 text-center">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Drag & drop or click to upload
                  </p>
                  <Button size="sm" className="mt-3 bg-cta text-cta-foreground hover:bg-cta/90">
                    Upload file
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
