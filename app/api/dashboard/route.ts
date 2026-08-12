import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessionCookie, verifySession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(sessionCookie)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let userId: number;
  let role: string;
  try {
    ({ userId, role } = await verifySession(token));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    if (role !== "CLIENT")
      return NextResponse.json({ error: "Client access required" }, { status: 403 });
    const [user, jobs, proposals, notifications, spent, runningProjects] = await Promise.all([
      db.user.findUniqueOrThrow({
        where: { id: userId },
        select: { firstName: true, averageRating: true },
      }),
      db.clientJob.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 4,
        include: { _count: { select: { favoriteJobs: true } } },
      }),
      db.projectRequest.findMany({
        where: { clientId: userId },
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
      db.userNotification.findMany({
        where: { userId, clearedAt: null },
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
      db.projectTransaction.aggregate({
        where: {
          clientId: userId,
          status: "COMPLETED",
          createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
        _sum: { amount: true },
      }),
      db.projectTracking.findMany({
        where: { clientId: userId, status: { not: "COMPLETED" } },
        select: { jobId: true },
      }),
    ]);
    const runningJobIds = new Set(runningProjects.map((project) => project.jobId));
    return NextResponse.json({
      user,
      jobs: jobs.map((job) => ({
        ...job,
        status: runningJobIds.has(job.id) ? "RUNNING" : job.status,
      })),
      proposals,
      notifications,
      spent: spent._sum.amount ?? 0,
    });
  } catch {
    return NextResponse.json({ error: "Unable to load dashboard." }, { status: 500 });
  }
}
