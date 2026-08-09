import Link from "next/link";
import { Briefcase } from "lucide-react";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`flex items-center gap-2 font-display font-bold text-foreground ${className}`}
    >
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-soft">
        <Briefcase className="h-4 w-4" />
      </span>
      <span className="text-xl tracking-tight">Servio</span>
    </Link>
  );
}
