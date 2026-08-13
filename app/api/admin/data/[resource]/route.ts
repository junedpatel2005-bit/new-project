import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessionCookie, verifySession } from "@/lib/auth";

const publicPages = [
  { title: "Home", slug: "", pageKey: "home" },
  { title: "About", slug: "about", pageKey: "about" },
  { title: "How It Works", slug: "how-it-works", pageKey: "how-it-works" },
  { title: "Services", slug: "services", pageKey: "services" },
  { title: "For Clients", slug: "for-clients", pageKey: "for-clients" },
  { title: "For Professionals", slug: "for-professionals", pageKey: "for-professionals" },
  { title: "Pricing", slug: "pricing", pageKey: "pricing" },
  { title: "FAQ", slug: "faq", pageKey: "faq" },
  { title: "Contact", slug: "contact", pageKey: "contact" },
];

export async function GET(request: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const token = request.cookies.get(sessionCookie)?.value;
  if (!token) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  let session;
  try { session = await verifySession(token); } catch { return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 }); }
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const { resource } = await params;
  if (resource === "overview") {
    const [clients, professionals, pendingVerifications, jobs, disputes, payments, newUsers, newJobs, newDisputes] = await Promise.all([
      db.user.count({ where: { role: "CLIENT" } }), db.user.count({ where: { role: "PROFESSIONAL" } }), db.professionalVerification.count({ where: { status: "PENDING" } }), db.clientJob.count(), db.projectDispute.count({ where: { status: "OPEN" } }), db.projectTransaction.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true } }),
      db.user.findMany({ where: { role: { in: ["CLIENT", "PROFESSIONAL"] } }, select: { id: true, firstName: true, lastName: true, email: true, role: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 5 }),
      db.clientJob.findMany({ select: { id: true, title: true, category: true, status: true, createdAt: true, user: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: "desc" }, take: 5 }),
      db.projectDispute.findMany({ select: { id: true, issueType: true, priority: true, status: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 5 }),
    ]);
    return NextResponse.json({ clients, professionals, pendingVerifications, jobs, disputes, payments: payments._sum.amount ?? 0, newUsers, newJobs, newDisputes });
  }
  if (resource === "users") return NextResponse.json({ users: await db.user.findMany({ select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true, isVerified: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 100 }) });
  if (resource === "jobs") return NextResponse.json({ jobs: await db.clientJob.findMany({ include: { user: { select: { firstName: true, lastName: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 100 }), disputes: await db.projectDispute.findMany({ orderBy: { createdAt: "desc" }, take: 50 }) });
  if (resource === "finance") {
    const [transactions, withdrawals] = await Promise.all([db.projectTransaction.findMany({ orderBy: { createdAt: "desc" }, take: 100 }), db.projectWithdrawal.findMany({ orderBy: { createdAt: "desc" }, take: 100 })]);
    const ids = [...new Set([...transactions.flatMap((item) => [item.clientId, item.professionalId]), ...withdrawals.map((item) => item.professionalId)])];
    const [users, legacyProfiles] = await Promise.all([
      db.user.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true, lastName: true } }),
      db.legacyUserProfile.findMany({ where: { userId: { in: ids.map(String) } }, select: { userId: true, fullName: true } }),
    ]);
    const names = Object.fromEntries(users.map((user) => [user.id, `${user.firstName} ${user.lastName}`.trim()]));
    for (const profile of legacyProfiles) if (profile.fullName && !names[profile.userId]) names[profile.userId] = profile.fullName;
    return NextResponse.json({ transactions, withdrawals, names });
  }
  if (resource === "cms") {
    const now = new Date();
    const pages = await Promise.all(publicPages.map((page) => db.cmsPage.upsert({
      where: { slug: page.slug },
      create: { ...page, content: "", status: "PUBLISHED", createdAt: now, updatedAt: now },
      update: { title: page.title, pageKey: page.pageKey },
    })));
    return NextResponse.json({ pages, faqs: await db.faq.findMany({ orderBy: { displayOrder: "asc" }, take: 100 }) });
  }
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
