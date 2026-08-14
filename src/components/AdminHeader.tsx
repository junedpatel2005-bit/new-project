export function AdminHeader() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-white/10 bg-[#11182b]/80 px-5 backdrop-blur">
      <p className="text-sm text-slate-400">Private administration portal</p>
      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
        System online
      </span>
    </header>
  );
}
