import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureWallet } from "@/lib/wallet-ledger";
import { sessionCookie, verifySession } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> },
) {
  const token = request.cookies.get(sessionCookie)?.value;
  if (!token) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  let session;
  try {
    session = await verifySession(token);
  } catch {
    return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  }
  if (session.role !== "ADMIN")
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const { resource } = await params;
  if (resource === "overview") {
    const [
      clients,
      professionals,
      pendingVerifications,
      jobs,
      disputes,
      payments,
      newUsers,
      newJobs,
      newDisputes,
    ] = await Promise.all([
      db.user.count({ where: { role: "CLIENT" } }),
      db.user.count({ where: { role: "PROFESSIONAL" } }),
      db.professionalVerification.count({ where: { status: "PENDING" } }),
      db.clientJob.count(),
      db.projectDispute.count({ where: { status: "OPEN" } }),
      db.projectTransaction.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true } }),
      db.user.findMany({
        where: { role: { in: ["CLIENT", "PROFESSIONAL"] } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      db.clientJob.findMany({
        select: {
          id: true,
          title: true,
          category: true,
          status: true,
          createdAt: true,
          user: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      db.projectDispute.findMany({
        select: { id: true, issueType: true, priority: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);
    return NextResponse.json({
      clients,
      professionals,
      pendingVerifications,
      jobs,
      disputes,
      payments: payments._sum.amount ?? 0,
      newUsers,
      newJobs,
      newDisputes,
    });
  }
  if (resource === "users")
    return NextResponse.json({
      users: await db.user.findMany({
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          isActive: true,
          isVerified: true,
          emailVerifiedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    });
  if (resource === "jobs") {
    const [jobs, disputes] = await Promise.all([
      db.clientJob.findMany({
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      db.projectDispute.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    ]);
    const projects = await db.projectTracking.findMany({
      where: { jobId: { in: jobs.map((job) => job.id) } },
      select: { jobId: true, status: true, completedAt: true },
    });
    const projectByJobId = new Map(projects.map((project) => [project.jobId, project]));
    const jobsWithProjectStatus = jobs.map((job) => {
      const project = projectByJobId.get(job.id);
      const isCompleted =
        project?.completedAt || project?.status.toUpperCase().includes("COMPLETED");
      return { ...job, status: isCompleted ? "COMPLETED" : project ? "RUNNING" : job.status };
    });
    return NextResponse.json({ jobs: jobsWithProjectStatus, disputes });
  }
  if (resource === "finance") {
    const [transactions, withdrawals, payments, walletTransactions, adminUsers] = await Promise.all(
      [
        db.projectTransaction.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
        db.projectWithdrawal.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
        db.payment.findMany({
          orderBy: { createdAt: "desc" },
          take: 100,
          select: {
            id: true,
            clientId: true,
            professionalId: true,
            amount: true,
            baseAmount: true,
            clientFeeAmount: true,
            professionalPayoutAmount: true,
            adminNetAmount: true,
            commissionAmount: true,
            currency: true,
            provider: true,
            razorpayOrderId: true,
            razorpayPaymentId: true,
            projectTrackingId: true,
            milestoneId: true,
            status: true,
            failureReason: true,
            capturedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        db.walletTransaction.findMany({
          where: { type: "WALLET_TOP_UP" },
          orderBy: { createdAt: "desc" },
          take: 100,
          include: { wallet: { select: { userId: true } } },
        }),
        db.user.findMany({
          where: { role: "ADMIN" },
          orderBy: { id: "asc" },
          select: { id: true, firstName: true, lastName: true },
        }),
      ],
    );
    // Milestone settlements credit whichever ADMIN row `findFirst` happens to resolve first
    // (src/lib/wallet-ledger.ts has no deterministic tie-breaker), so with multiple admin
    // accounts the platform's fee wallet isn't necessarily any single one of them — aggregate
    // across every admin wallet rather than guessing which one is "the" platform account.
    const adminWallets = await Promise.all(adminUsers.map((admin) => ensureWallet(admin.id)));
    const adminNameByUserId = Object.fromEntries(
      adminUsers.map((admin) => [admin.id, `${admin.firstName} ${admin.lastName}`.trim()]),
    );
    const platformWallet =
      adminWallets.length > 0
        ? {
            balance: adminWallets.reduce((sum, wallet) => sum + wallet.balance, 0),
            currency: adminWallets[0]!.currency,
            ownerName:
              adminWallets.length === 1
                ? (adminNameByUserId[adminWallets[0]!.userId] ?? null)
                : `${adminWallets.length} admin wallets combined`,
          }
        : null;
    const platformWalletTransactionsRaw =
      adminWallets.length > 0
        ? await db.walletTransaction.findMany({
            where: { walletId: { in: adminWallets.map((wallet) => wallet.id) } },
            orderBy: { createdAt: "desc" },
            take: 200,
            include: { wallet: { select: { userId: true } } },
          })
        : [];
    const platformWalletTransactions = platformWalletTransactionsRaw.map((item) => ({
      id: item.id,
      type: item.type,
      amount: item.amount,
      status: item.status,
      description:
        adminWallets.length > 1
          ? `${item.description} (${adminNameByUserId[item.wallet.userId] ?? `#${item.wallet.userId}`})`
          : item.description,
      createdAt: item.createdAt,
    }));
    const platformTotalReceived = platformWalletTransactionsRaw
      .filter((item) => item.type === "ADMIN_MILESTONE_RECEIPT" && item.amount > 0)
      .reduce((sum, item) => sum + item.amount, 0);
    const platformTotalPaid = platformWalletTransactionsRaw
      .filter((item) => item.type === "PROFESSIONAL_PAYOUT" && item.amount < 0)
      .reduce((sum, item) => sum + Math.abs(item.amount), 0);
    const ids = [
      ...new Set([
        ...transactions.flatMap((item) => [item.clientId, item.professionalId]),
        ...withdrawals.map((item) => item.professionalId),
        ...payments.flatMap((item) => [item.clientId, item.professionalId]),
        ...walletTransactions.map((item) => item.wallet.userId),
      ]),
    ];
    const [users, legacyProfiles] = await Promise.all([
      db.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, firstName: true, lastName: true },
      }),
      db.legacyUserProfile.findMany({
        where: { userId: { in: ids.map(String) } },
        select: { userId: true, fullName: true },
      }),
    ]);
    const names = Object.fromEntries(
      users.map((user) => [user.id, `${user.firstName} ${user.lastName}`.trim()]),
    );
    for (const profile of legacyProfiles)
      if (profile.fullName && !names[profile.userId]) names[profile.userId] = profile.fullName;
    return NextResponse.json({
      transactions,
      withdrawals,
      payments,
      walletTransactions,
      platformWallet: platformWallet
        ? {
            ...platformWallet,
            totalReceived: platformTotalReceived,
            totalPaidToProfessionals: platformTotalPaid,
            retainedEarnings: platformTotalReceived - platformTotalPaid,
          }
        : null,
      platformWalletTransactions,
      names,
    });
  }
  if (resource === "support") {
    const [faqs, contactRequests] = await Promise.all([
      db.faq.findMany({ orderBy: { displayOrder: "asc" }, take: 200 }),
      db.contactRequest.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    ]);
    return NextResponse.json({ faqs, contactRequests });
  }
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
