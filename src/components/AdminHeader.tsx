"use client";

import { Moon, Sun } from "lucide-react";

export function AdminHeader({
  theme,
  onToggleTheme,
}: {
  theme: "dark" | "light";
  onToggleTheme: () => void;
}) {
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
        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
          System online
        </span>
      </div>
    </header>
  );
}
