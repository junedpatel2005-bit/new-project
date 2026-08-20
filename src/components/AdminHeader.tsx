"use client";

import { useRouter } from "next/navigation";
import { LogOut, Moon, Sun } from "lucide-react";
import { useDatabaseStatus } from "@/hooks/use-database-status";

export function AdminHeader({
  theme,
  onToggleTheme,
}: {
  theme: "dark" | "light";
  onToggleTheme: () => void;
}) {
  const router = useRouter();
  const dbStatus = useDatabaseStatus();

  async function logout() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-white/10 bg-[#11182b]/80 px-5 backdrop-blur">
      <p className="text-sm text-slate-400">Private administration portal</p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleTheme}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
          aria-label="Toggle admin theme"
        >
          {theme === "dark" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
          {theme === "dark" ? "Dark" : "Light"}
        </button>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            dbStatus === "connected"
              ? "bg-emerald-500/10 text-emerald-400"
              : dbStatus === "disconnected"
                ? "bg-rose-500/10 text-rose-400"
                : "bg-white/5 text-slate-400"
          }`}
        >
          {dbStatus === "connected"
            ? "System online"
            : dbStatus === "disconnected"
              ? "Database unreachable"
              : "Checking…"}
        </span>
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-rose-500/10 hover:text-rose-400"
          aria-label="Log out"
        >
          <LogOut className="h-3.5 w-3.5" />
          Log out
        </button>
      </div>
    </header>
  );
}
