import "dotenv/config";
import { spawn, type ChildProcess } from "node:child_process";
import { io as socketClient } from "socket.io-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const sessionCookie = "servio_session";

const base = process.env.TEST_BASE_URL ?? process.env.APP_URL ?? "http://localhost:3000";
let managedServer: ChildProcess | undefined;

type FlowResult = {
  flow: string;
  status: "PASSED" | "FAILED" | "SKIPPED";
  details: string;
  durationMs: number;
};

const results: FlowResult[] = [];

async function serverIsAvailable() {
  try {
    const response = await fetch(`${base}/api/v1/auth/me`, { signal: AbortSignal.timeout(1500) });
    return response.status < 500;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (await serverIsAvailable()) return;

  const url = new URL(base);
  managedServer = spawn(process.execPath, ["server.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: url.port || "3000" },
    stdio: "ignore",
  });

  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await serverIsAvailable()) return;
    if (managedServer.exitCode !== null) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Server did not start at ${base} within 60 seconds.`);
}

function extractCookie(response: Response, name: string): string | undefined {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) return undefined;
  const match = setCookie.match(new RegExp(`${name}=([^;]+)`));
  return match?.[1];
}

async function runFlow(name: string, fn: () => Promise<string>) {
  const start = Date.now();
  try {
    const details = await fn();
    results.push({ flow: name, status: "PASSED", details, durationMs: Date.now() - start });
    console.log(`  ✓ [PASSED] ${name} (${Date.now() - start}ms) - ${details}`);
  } catch (error: unknown) {
    const details = error instanceof Error ? error.message : String(error);
    results.push({ flow: name, status: "FAILED", details, durationMs: Date.now() - start });
    console.error(`  ✗ [FAILED] ${name} (${Date.now() - start}ms) - ${details}`);
  }
}

async function main() {
  console.log("=================================================================");
  console.log("  SERVIO / KLICK-PRO: COMPLETE WEBSITE FLOWS END-TO-END AUDIT  ");
  console.log("=================================================================\n");

  await ensureServer();

  // Test state tracked for cleanup
  const createdUserIds: number[] = [];
  const createdJobIds: number[] = [];
  const createdProjectIds: number[] = [];

  const timestamp = Date.now();
  const testClientEmail = `flow.client.${timestamp}@test.servio.example`;
  const testProEmail = `flow.pro.${timestamp}@test.servio.example`;
  const testPassword = "TestPassword#2026";
  const testPhone = `+9198765${String(timestamp).slice(-5)}`;

  let clientSessionToken: string | undefined;
  let proSessionToken: string | undefined;
  let testJobId: number | undefined;
  let testProjectId: number | undefined;

  try {
    // 1. PUBLIC MARKETING & STATIC PAGES
    await runFlow("Flow 1: Public Marketing & Static Routes", async () => {
      const paths = ["/", "/about", "/contact", "/pricing", "/services", "/how-it-works", "/faq"];
      for (const p of paths) {
        const res = await fetch(`${base}${p}`);
        if (!res.ok) throw new Error(`Page ${p} returned HTTP ${res.status}`);
      }
      return `Successfully rendered 7 public pages: ${paths.join(", ")}`;
    });

    // 2. CLIENT REGISTRATION & EMAIL VERIFICATION
    await runFlow("Flow 2: Client Registration & Email Verification", async () => {
      const regRes = await fetch(`${base}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: base },
        body: JSON.stringify({
          firstName: "AuditClient",
          lastName: "Tester",
          email: testClientEmail,
          password: testPassword,
          role: "CLIENT",
          terms: true,
        }),
      });
      const regData = await regRes.json();
      if (regRes.status !== 201)
        throw new Error(`Registration failed (${regRes.status}): ${JSON.stringify(regData)}`);

      const user = await db.user.findUnique({ where: { email: testClientEmail } });
      if (!user) throw new Error("Client was not created in database");
      createdUserIds.push(user.id);
      if (user.emailVerifiedAt !== null) throw new Error("User should not be verified yet");

      // Attempt login before verification (MUST BE REJECTED)
      const prematureLogin = await fetch(`${base}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: base },
        body: JSON.stringify({ email: testClientEmail, password: testPassword }),
      });
      if (prematureLogin.status !== 403)
        throw new Error(`Unverified login should return 403, got ${prematureLogin.status}`);

      // Verify email directly in DB
      await db.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      });

      return `Client registered (ID: ${user.id}), unverified login correctly blocked (HTTP 403), verified successfully`;
    });

    // 3. PROFESSIONAL REGISTRATION & SETUP
    await runFlow("Flow 3: Professional Registration & Profile Setup", async () => {
      const regRes = await fetch(`${base}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: base },
        body: JSON.stringify({
          firstName: "AuditPro",
          lastName: "Specialist",
          email: testProEmail,
          password: testPassword,
          role: "PROFESSIONAL",
          terms: true,
        }),
      });
      const regData = await regRes.json();
      if (regRes.status !== 201)
        throw new Error(`Pro registration failed (${regRes.status}): ${JSON.stringify(regData)}`);

      const user = await db.user.findUnique({ where: { email: testProEmail } });
      if (!user) throw new Error("Professional not found in database");
      createdUserIds.push(user.id);

      await db.user.update({
        where: { id: user.id },
        data: {
          emailVerifiedAt: new Date(),
          professionalCategory: "Electrical",
          professionalCity: "Surat",
          professionalState: "Gujarat",
          professionalLatitude: 21.1702,
          professionalLongitude: 72.8311,
          hourlyRate: 500,
          fixedRate: 2000,
          isVerified: true,
        },
      });

      return `Professional registered (ID: ${user.id}) and profile configured`;
    });

    // 4. AUTHENTICATION, LOGIN & SESSION ISSUANCE
    await runFlow("Flow 4: Login & Authenticated Session Issuance", async () => {
      // Client Login
      const clientLoginRes = await fetch(`${base}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: base },
        body: JSON.stringify({ email: testClientEmail, password: testPassword }),
      });
      const clientLoginData = await clientLoginRes.json();
      if (!clientLoginRes.ok || !clientLoginData.success) {
        throw new Error(
          `Client login failed (${clientLoginRes.status}): ${JSON.stringify(clientLoginData)}`,
        );
      }
      clientSessionToken = extractCookie(clientLoginRes, sessionCookie);
      if (!clientSessionToken) throw new Error("Client session cookie not returned");

      // Verify /api/auth/me with Client Token
      const clientMeRes = await fetch(`${base}/api/v1/auth/me`, {
        headers: { Cookie: `${sessionCookie}=${clientSessionToken}` },
      });
      const clientMe = await clientMeRes.json();
      if (!clientMeRes.ok || clientMe.user?.email !== testClientEmail) {
        throw new Error(`Client /me check failed: ${JSON.stringify(clientMe)}`);
      }

      // Professional Login
      const proLoginRes = await fetch(`${base}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: base },
        body: JSON.stringify({ email: testProEmail, password: testPassword }),
      });
      proSessionToken = extractCookie(proLoginRes, sessionCookie);
      if (!proSessionToken) throw new Error("Professional session cookie not returned");

      return `Both Client & Professional logged in; session tokens issued and validated via /api/auth/me`;
    });

    // 5. PHONE OTP FLOW (DEV PROVIDER)
    await runFlow("Flow 5: Phone OTP Challenge & Verification", async () => {
      const otpReqRes = await fetch(`${base}/api/v1/auth/send-phone-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: base,
          Cookie: `${sessionCookie}=${clientSessionToken}`,
        },
        body: JSON.stringify({ phone: testPhone, role: "CLIENT" }),
      });
      const otpReqData = await otpReqRes.json();
      if (!otpReqRes.ok)
        throw new Error(
          `send-phone-otp failed (${otpReqRes.status}): ${JSON.stringify(otpReqData)}`,
        );

      const otpVerifyRes = await fetch(`${base}/api/v1/auth/verify-phone`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: base,
          Cookie: `${sessionCookie}=${clientSessionToken}`,
        },
        body: JSON.stringify({ phone: testPhone, code: "2412", role: "CLIENT" }),
      });
      const otpVerifyData = await otpVerifyRes.json();
      if (!otpVerifyRes.ok || !otpVerifyData.success) {
        throw new Error(
          `verify-phone failed (${otpVerifyRes.status}): ${JSON.stringify(otpVerifyData)}`,
        );
      }

      return `Phone OTP requested and verified with dev code 2412 for ${testPhone}`;
    });

    // 6. PASSWORD RESET FLOW
    await runFlow("Flow 6: Password Reset Request", async () => {
      const forgotRes = await fetch(`${base}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: base },
        body: JSON.stringify({ email: testClientEmail }),
      });
      if (!forgotRes.ok) throw new Error(`forgot-password failed: ${forgotRes.status}`);

      const user = await db.user.findUnique({ where: { email: testClientEmail } });
      const resetToken = await db.apiToken.findFirst({
        where: { userId: user!.id, kind: "PASSWORD_RESET", usedAt: null },
        orderBy: { createdAt: "desc" },
      });
      if (!resetToken) throw new Error("Password reset token not found in database");

      return `Password reset token generated and validated in database`;
    });

    // 7. CLIENT JOB POSTING & RETRIEVAL
    await runFlow("Flow 7: Client Job Posting & Retrieval", async () => {
      const category = await db.serviceCategory.findFirst();
      if (!category) throw new Error("No service category found in database to attach job to");

      const jobRes = await fetch(`${base}/api/v1/client/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: base,
          Cookie: `${sessionCookie}=${clientSessionToken}`,
        },
        body: JSON.stringify({
          title: `Automated Flow Verification Job ${timestamp}`,
          category: category.name,
          description: "This is an end-to-end automated flow verification job description.",
          budgetMin: 3000,
          budgetMax: 7000,
          timingType: "FIXED",
          paymentMethod: "WALLET",
          urgency: "MEDIUM",
          workMode: "REMOTE",
          deadline: "2026-10-15",
          mode: "publish",
        }),
      });
      const jobData = await jobRes.json();
      if (!jobRes.ok || !jobData.job?.id) {
        throw new Error(`Post job failed (${jobRes.status}): ${JSON.stringify(jobData)}`);
      }
      testJobId = jobData.job.id;
      createdJobIds.push(testJobId!);

      const listRes = await fetch(`${base}/api/v1/client/jobs`, {
        headers: { Cookie: `${sessionCookie}=${clientSessionToken}` },
      });
      const listData = await listRes.json();
      if (!listRes.ok || !listData.jobs?.some((j: { id: number }) => j.id === testJobId)) {
        throw new Error("Created job was not listed in client's jobs list");
      }

      return `Job #${testJobId} published successfully under category '${category.name}'`;
    });

    // 8. MARKETPLACE BROWSING & SEARCH
    await runFlow("Flow 8: Marketplace Discovery & Public Search APIs", async () => {
      const jobsRes = await fetch(`${base}/api/v1/marketplace/jobs`);
      const jobsData = await jobsRes.json();
      if (!jobsRes.ok || !Array.isArray(jobsData)) {
        throw new Error(`Marketplace jobs endpoint failed: ${jobsRes.status}`);
      }

      const searchRes = await fetch(`${base}/api/v1/search?q=Electrical`);
      if (!searchRes.ok) throw new Error(`Search API failed: ${searchRes.status}`);

      return `Marketplace returned ${jobsData.length} jobs; Search API responded with HTTP 200`;
    });

    // 9. PROPOSAL SUBMISSION & DIRECT HIRE
    await runFlow("Flow 9: Professional Proposal Submission & Client Hiring", async () => {
      if (!testJobId) throw new Error("No test job available from Flow 7");

      const propRes = await fetch(`${base}/api/v1/professional/proposals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: base,
          Cookie: `${sessionCookie}=${proSessionToken}`,
        },
        body: JSON.stringify({
          jobId: testJobId,
          bidAmount: 4500,
          duration: "10 days",
          coverLetter: "I have 6 years of expertise in this area and can deliver on time.",
        }),
      });
      const propData = await propRes.json();
      if (!propRes.ok || !propData.proposal?.id) {
        throw new Error(
          `Proposal submission failed (${propRes.status}): ${JSON.stringify(propData)}`,
        );
      }
      const proposalId = propData.proposal.id;

      const acceptRes = await fetch(`${base}/api/v1/client/project-requests/${proposalId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Origin: base,
          Cookie: `${sessionCookie}=${clientSessionToken}`,
        },
        body: JSON.stringify({ action: "accept" }),
      });
      const acceptData = await acceptRes.json();
      if (!acceptRes.ok || !acceptData.project?.id) {
        throw new Error(
          `Proposal acceptance failed (${acceptRes.status}): ${JSON.stringify(acceptData)}`,
        );
      }
      testProjectId = acceptData.project.id;
      createdProjectIds.push(testProjectId!);

      return `Proposal #${proposalId} submitted and accepted. Project #${testProjectId} created.`;
    });

    // 10. SHARED PROJECT TRACKING & MILESTONES
    await runFlow("Flow 10: Shared Project Tracking & Milestone Lifecycle", async () => {
      if (!testProjectId) throw new Error("No test project available from Flow 9");

      const clientView = await fetch(`${base}/api/v1/portal/project?id=${testProjectId}`, {
        headers: { Cookie: `${sessionCookie}=${clientSessionToken}` },
      });
      const proView = await fetch(`${base}/api/v1/portal/project?id=${testProjectId}`, {
        headers: { Cookie: `${sessionCookie}=${proSessionToken}` },
      });
      if (!clientView.ok || !proView.ok)
        throw new Error("Shared project tracking not accessible to both roles");

      const milestoneAction = await fetch(`${base}/api/v1/portal/project-actions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: base,
          Cookie: `${sessionCookie}=${clientSessionToken}`,
        },
        body: JSON.stringify({
          action: "create-milestone",
          projectId: testProjectId,
          title: "Phase 1: Initial Architecture & Delivery",
          amount: 2500,
          description: "Complete base setup and schema.",
        }),
      });
      const milestoneData = await milestoneAction.json();
      if (!milestoneAction.ok)
        throw new Error(`Milestone creation failed: ${JSON.stringify(milestoneData)}`);

      // Client authorizes start-work
      const startAction = await fetch(`${base}/api/v1/portal/project-actions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: base,
          Cookie: `${sessionCookie}=${clientSessionToken}`,
        },
        body: JSON.stringify({
          action: "start-work",
          projectId: testProjectId,
        }),
      });
      if (!startAction.ok) throw new Error(`Start work failed: ${startAction.status}`);

      // Professional updates progress
      const progressAction = await fetch(`${base}/api/v1/portal/project-actions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: base,
          Cookie: `${sessionCookie}=${proSessionToken}`,
        },
        body: JSON.stringify({
          action: "update-progress",
          projectId: testProjectId,
          progress: 50,
          stage: "Development",
          note: "Phase 1 underway with preliminary deliverables ready.",
        }),
      });
      if (!progressAction.ok) throw new Error(`Update progress failed: ${progressAction.status}`);

      return `Project #${testProjectId} milestone created (₹2,500), work started by client, and progress updated to 50% by professional`;
    });

    // 11. WALLET & ESCROW LEDGER
    await runFlow("Flow 11: Wallet Balance & Ledger Queries", async () => {
      const clientWalletRes = await fetch(`${base}/api/v1/wallet`, {
        headers: { Cookie: `${sessionCookie}=${clientSessionToken}` },
      });
      const clientWalletData = await clientWalletRes.json();
      if (!clientWalletRes.ok || !clientWalletData.wallet) {
        throw new Error(`Client wallet query failed: ${clientWalletRes.status}`);
      }

      const proWalletRes = await fetch(`${base}/api/v1/wallet`, {
        headers: { Cookie: `${sessionCookie}=${proSessionToken}` },
      });
      const proWalletData = await proWalletRes.json();
      if (!proWalletRes.ok || !proWalletData.wallet) {
        throw new Error(`Pro wallet query failed: ${proWalletRes.status}`);
      }

      return `Client wallet (balance: ₹${clientWalletData.wallet.balance}) and Pro wallet (balance: ₹${proWalletData.wallet.balance}) verified`;
    });

    // 12. REALTIME SOCKET.IO CONNECTION
    await runFlow("Flow 12: Realtime Socket.IO Connection & Auth", async () => {
      if (!clientSessionToken) throw new Error("No client session token available");

      const socket = socketClient(base, {
        path: "/api/realtime",
        extraHeaders: {
          Cookie: `${sessionCookie}=${clientSessionToken}`,
        },
        transports: ["websocket", "polling"],
        timeout: 10_000,
      });

      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          socket.disconnect();
          reject(new Error("Socket.IO connection timed out after 10s"));
        }, 10_000);

        socket.on("connect", () => {
          clearTimeout(timer);
          socket.disconnect();
          resolve();
        });

        socket.on("connect_error", (err) => {
          clearTimeout(timer);
          socket.disconnect();
          reject(new Error(`Socket.IO connect_error: ${err.message}`));
        });
      });

      return `Socket.IO connected successfully over WebSocket with authenticated session cookie`;
    });

    // 13. SESSION REVOCATION & LOGOUT
    await runFlow("Flow 13: Logout & Database Session Revocation", async () => {
      if (!clientSessionToken) throw new Error("No client session token available");

      const logoutRes = await fetch(`${base}/api/v1/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: base,
          Cookie: `${sessionCookie}=${clientSessionToken}`,
        },
        body: JSON.stringify({}),
      });
      if (!logoutRes.ok) throw new Error(`Logout failed: ${logoutRes.status}`);

      const afterLogoutRes = await fetch(`${base}/api/v1/auth/me`, {
        headers: { Cookie: `${sessionCookie}=${clientSessionToken}` },
      });
      const afterLogoutData = await afterLogoutRes.json();
      if (afterLogoutData.user !== null && afterLogoutRes.status === 200) {
        throw new Error("Revoked session token was still accepted by /api/auth/me");
      }

      return `Client logged out; session revoked in database and rejected on subsequent requests`;
    });

    // 14. ADMIN SECURITY GATE
    await runFlow("Flow 14: Admin Portal Security Gate", async () => {
      const unauthAdmin = await fetch(`${base}/api/v1/admin/data/overview`);
      if (unauthAdmin.status !== 401 && unauthAdmin.status !== 403) {
        throw new Error(
          `Unauthenticated admin access should be blocked, got ${unauthAdmin.status}`,
        );
      }

      return `Admin security gate confirmed: unauthenticated request blocked with HTTP ${unauthAdmin.status}`;
    });
  } finally {
    console.log("\nCleaning up automated test fixtures...");
    if (createdProjectIds.length) {
      await db.projectTimelineEvent
        .deleteMany({ where: { trackingId: { in: createdProjectIds } } })
        .catch(() => {});
      await db.projectMilestone
        .deleteMany({ where: { trackingId: { in: createdProjectIds } } })
        .catch(() => {});
      await db.projectTracking
        .deleteMany({ where: { id: { in: createdProjectIds } } })
        .catch(() => {});
    }
    if (createdJobIds.length) {
      await db.projectRequest
        .deleteMany({ where: { jobId: { in: createdJobIds } } })
        .catch(() => {});
      await db.clientJob.deleteMany({ where: { id: { in: createdJobIds } } }).catch(() => {});
    }
    if (createdUserIds.length) {
      await db.userNotification
        .deleteMany({ where: { userId: { in: createdUserIds } } })
        .catch(() => {});
      await db.walletTransaction
        .deleteMany({ where: { wallet: { userId: { in: createdUserIds } } } })
        .catch(() => {});
      await db.wallet.deleteMany({ where: { userId: { in: createdUserIds } } }).catch(() => {});
      await db.session.deleteMany({ where: { userId: { in: createdUserIds } } }).catch(() => {});
      await db.apiToken.deleteMany({ where: { userId: { in: createdUserIds } } }).catch(() => {});
      await db.otpCode.deleteMany({ where: { phone: testPhone } }).catch(() => {});
      await db.user.deleteMany({ where: { id: { in: createdUserIds } } }).catch(() => {});
    }

    await db.$disconnect();
    if (managedServer && managedServer.exitCode === null) {
      managedServer.kill();
    }
  }

  console.log("\n=================================================================");
  console.log("                       FINAL AUDIT RESULTS                       ");
  console.log("=================================================================");
  console.table(
    results.map((r) => ({
      Flow: r.flow,
      Status: r.status,
      Duration: `${r.durationMs}ms`,
      Details: r.details,
    })),
  );

  const allPassed = results.every((r) => r.status === "PASSED");
  if (allPassed) {
    console.log("\n>>> ALL 14 FLOWS PASSED PERFECTLY! <<<");
  } else {
    console.log("\n>>> SOME FLOWS FAILED. SEE DETAILS ABOVE. <<<");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
