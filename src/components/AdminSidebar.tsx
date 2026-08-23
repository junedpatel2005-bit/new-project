"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDatabaseStatus } from "@/hooks/use-database-status";
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  ChevronRight,
  CircleDollarSign,
  FileBarChart,
  FileText,
  LayoutDashboard,
  ShieldCheck,
  UsersRound,
  Wrench,
} from "lucide-react";

const links = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: UsersRound },
  { href: "/admin/verifications", label: "Verification", icon: ShieldCheck },
  { href: "/admin/operations", label: "Jobs & disputes", icon: BriefcaseBusiness },
  { href: "/admin/services", label: "Services", icon: Wrench },
  { href: "/admin/finance", label: "Finance & payouts", icon: CircleDollarSign },
  { href: "/admin/reports", label: "Reports", icon: FileBarChart },
  { href: "/admin/support", label: "Support", icon: FileText },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/cms", label: "CMS", icon: FileText },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const dbStatus = useDatabaseStatus();
  return (
    <aside className="fixed inset-y-0 hidden w-64 border-r border-white/10 bg-[#11182b] p-5 lg:block">
      <div className="flex items-center gap-3 px-2">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500 text-white">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <p className="font-display font-bold">Klick-Pro Admin</p>
          <p className="text-xs text-slate-400">Control center</p>
        </div>
      </div>
      <nav className="mt-10 space-y-1">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${active ? "bg-indigo-500 text-white shadow-lg" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
              {active && <ChevronRight className="ml-auto h-4 w-4" />}
            </Link>
          );
        })}
      </nav>
      <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-400">
        Private admin environment
        <br />
        <span
          className={`mt-1 block ${dbStatus === "connected" ? "text-emerald-400" : dbStatus === "disconnected" ? "text-rose-400" : "text-slate-500"}`}
        >
          ●{" "}
          {dbStatus === "connected"
            ? "Database connected"
            : dbStatus === "disconnected"
              ? "Database disconnected"
              : "Checking database…"}
        </span>
      </div>
    </aside>
  );
}
