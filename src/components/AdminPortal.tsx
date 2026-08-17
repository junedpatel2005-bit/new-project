"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AdminHeader } from "@/components/AdminHeader";
import { AdminSidebar } from "@/components/AdminSidebar";

export function AdminPortal({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const stored = window.localStorage.getItem("servio-admin-theme");
    if (stored === "light" || stored === "dark") setTheme(stored);
  }, []);
  const toggleTheme = () => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      window.localStorage.setItem("servio-admin-theme", next);
      return next;
    });
  };
  if (pathname === "/admin/login") return <>{children}</>;
  return (
    <div data-admin-theme={theme}>
      <div className="min-h-screen bg-[#0b1020] text-slate-100">
        <AdminSidebar />
        <main className="lg:pl-64">
          <AdminHeader theme={theme} onToggleTheme={toggleTheme} />
          <div className="mx-auto max-w-7xl p-5 sm:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
