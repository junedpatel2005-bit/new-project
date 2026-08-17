import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionCookie, verifySession } from "@/lib/auth";
import Landing from "@/routes/index";

export default async function HomePage() {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (token) {
    let role: string | null = null;
    try {
      const session = await verifySession(token);
      role = session.role;
    } catch {
      // Invalid session — fall through to the public home.
    }
    if (role === "PROFESSIONAL") redirect("/professional-home");
  }
  return <Landing />;
}
