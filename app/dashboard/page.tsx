import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession, sessionCookie } from "@/lib/auth";
import ClientDashboard from "@/routes/client/dashboard";

async function getSessionTokenFromCookies() {
  return (await cookies()).get(sessionCookie)?.value;
}

async function ensureClientAccess() {
  const token = await getSessionTokenFromCookies();
  if (!token) redirect("/login");

  let session;
  try {
    session = await verifySession(token);
  } catch {
    redirect("/login");
  }

  if (session.role === "PROFESSIONAL") redirect("/professional-profile");
  if (session.role === "ADMIN") redirect("/admin");
}

export default async function DashboardPage() {
  await ensureClientAccess();
  return <ClientDashboard />;
}
