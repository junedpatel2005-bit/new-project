import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { sessionCookie, verifySession } from "@/lib/auth";
import ProfessionalHome from "@/routes/professional-home";

type ProfessionalHomePageProps = {
  searchParams: Promise<{ cmsPreview?: string; cmsEdit?: string }>;
};

export default async function ProfessionalHomePage({ searchParams }: ProfessionalHomePageProps) {
  const params = await searchParams;
  const cmsAdminPreview = params.cmsPreview === "1";
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) redirect("/login");

  let session;
  try {
    session = await verifySession(token);
  } catch {
    redirect("/login");
  }
  if (session.role !== "PROFESSIONAL" && !(session.role === "ADMIN" && cmsAdminPreview))
    redirect("/login");

  if (session.role === "ADMIN" && cmsAdminPreview) return <ProfessionalHome />;

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      emailVerifiedAt: true,
      professionalCategory: true,
      professionalLatitude: true,
      professionalLongitude: true,
    },
  });

  if (!user?.emailVerifiedAt) redirect("/verify");
  if (
    !user.professionalCategory ||
    user.professionalLatitude === null ||
    user.professionalLongitude === null
  ) {
    redirect("/professional/setup?profileSetup=1");
  }

  return <ProfessionalHome />;
}
