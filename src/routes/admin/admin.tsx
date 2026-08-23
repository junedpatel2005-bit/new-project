"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BriefcaseBusiness,
  Clock3,
  ShieldCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";

type Data = {
  clients: number;
  professionals: number;
  pendingVerifications: number;
  jobs: number;
  disputes: number;
  payments: number;
  newUsers: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    createdAt: string;
  }[];
  newJobs: {
    id: number;
    title: string | null;
    category: string | null;
    status: string;
    createdAt: string;
    user: { firstName: string; lastName: string };
  }[];
  newDisputes: {
    id: number;
    issueType: string;
    priority: string;
    status: string;
    createdAt: string;
  }[];
};
const ago = (date: string) =>
  new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(date));
export default function Admin() {
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => {
    void fetch("/api/v1/admin/data/overview", { cache: "no-store" })
      .then((response) => response.json())
      .then(setData);
  }, []);
  const cards = [
    { label: "Clients", value: data?.clients, icon: UsersRound, href: "/admin/users" },
    {
      label: "Professionals",
      value: data?.professionals,
      icon: BriefcaseBusiness,
      href: "/admin/users",
    },
    {
      label: "Pending verification",
      value: data?.pendingVerifications,
      icon: ShieldCheck,
      href: "/admin/verifications",
    },
    {
      label: "Open disputes",
      value: data?.disputes,
      icon: AlertTriangle,
      href: "/admin/operations",
    },
  ];
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-400">Administration</p>
      <h1 className="mt-2 font-display text-3xl font-bold">Platform command center</h1>
      <p className="mt-2 text-slate-400">Live operational data across Klick-Pro’s marketplace.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-2xl border border-white/10 bg-white/[.035] p-5 transition hover:-translate-y-0.5 hover:bg-white/[.07]"
          >
            <card.icon className="h-5 w-5 text-indigo-400" />
            <p className="mt-5 text-3xl font-bold">{card.value ?? "—"}</p>
            <p className="mt-1 text-sm text-slate-400">{card.label}</p>
          </Link>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[.05] p-5">
          <UserPlus className="h-5 w-5 text-emerald-300" />
          <p className="mt-4 text-2xl font-bold">{data?.newUsers.length ?? "—"}</p>
          <p className="text-sm text-emerald-200">Newest users</p>
        </div>
        <div className="rounded-2xl border border-blue-400/15 bg-blue-400/[.05] p-5">
          <BriefcaseBusiness className="h-5 w-5 text-blue-300" />
          <p className="mt-4 text-2xl font-bold">{data?.newJobs.length ?? "—"}</p>
          <p className="text-sm text-blue-200">Latest jobs</p>
        </div>
        <div className="rounded-2xl border border-rose-400/15 bg-rose-400/[.05] p-5">
          <AlertTriangle className="h-5 w-5 text-rose-300" />
          <p className="mt-4 text-2xl font-bold">{data?.newDisputes.length ?? "—"}</p>
          <p className="text-sm text-rose-200">Latest disputes</p>
        </div>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Latest title="New users" icon={UserPlus} href="/admin/users">
          {data?.newUsers.map((user) => (
            <div key={user.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium text-white">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-slate-400">
                  {user.email} · {user.role}
                </p>
              </div>
              <span className="text-xs text-slate-500">{ago(user.createdAt)}</span>
            </div>
          ))}
        </Latest>
        <Latest title="New jobs" icon={BriefcaseBusiness} href="/admin/operations">
          {data?.newJobs.map((job) => (
            <div key={job.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium text-white">{job.title ?? `Job #${job.id}`}</p>
                <p className="text-xs text-slate-400">
                  {job.category ?? "General"} · {job.user.firstName} {job.user.lastName}
                </p>
              </div>
              <span className="text-xs text-slate-500">{ago(job.createdAt)}</span>
            </div>
          ))}
        </Latest>
        <Latest title="New disputes" icon={AlertTriangle} href="/admin/operations">
          {data?.newDisputes.map((dispute) => (
            <div key={dispute.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium text-white">{dispute.issueType}</p>
                <p className="text-xs text-slate-400">
                  {dispute.priority} priority · {dispute.status}
                </p>
              </div>
              <span className="text-xs text-slate-500">{ago(dispute.createdAt)}</span>
            </div>
          ))}
        </Latest>
      </div>
    </div>
  );
}
function Latest({
  title,
  icon: Icon,
  href,
  children,
}: {
  title: string;
  icon: typeof Clock3;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-indigo-400" />
          <h2 className="font-semibold text-white">{title}</h2>
        </div>
        <Link href={href} className="text-xs font-semibold text-indigo-300 hover:text-white">
          View all
        </Link>
      </div>
      <div className="mt-3 divide-y divide-white/10">
        {children || <p className="py-6 text-sm text-slate-400">No recent records.</p>}
      </div>
    </section>
  );
}
