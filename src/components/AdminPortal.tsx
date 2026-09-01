"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AdminHeader } from "@/components/AdminHeader";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminRealtime } from "@/components/AdminRealtime";

export function AdminPortal({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      <AdminRealtime />
      <AdminSidebar />
      <main className="lg:pl-64 flex flex-col min-h-screen">
        <AdminHeader />
        <div className="flex-1 mx-auto w-full max-w-7xl p-5 sm:p-8">{children}</div>
      </main>
    </div>
  );
}
