import { PortalShell, PortalTitleProvider } from "@/components/PortalShell";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { sessionCookie, verifySession } from "@/lib/auth";

export default async function PortalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) redirect("/login");
  try {
    const session = await verifySession(token);
    if (session.role !== "ADMIN") {
      const user = await db.user.findUnique({
        where: { id: session.userId },
        select: { isActive: true, emailVerifiedAt: true },
      });
      if (!user?.isActive) redirect("/login");
      if (!user.emailVerifiedAt) redirect("/verify");
    }
  } catch {
    redirect("/login");
  }
  return (
    <PortalTitleProvider>
      <PortalShell>{children}</PortalShell>
    </PortalTitleProvider>
  );
}
