import "dotenv/config";
import { SignJWT } from "jose";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const base = "http://localhost:3000";
const clientId = 43;
const professionalId = 76;
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);
const cookie = async (userId: number, role: "CLIENT" | "PROFESSIONAL") =>
  `servio_session=${await new SignJWT({ userId, role }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("1h").sign(secret)}`;

let jobOne: number | undefined;
let jobTwo: number | undefined;
const requestIds: number[] = [];
const projectIds: number[] = [];

async function postProposal(jobId: number, price = 1500) {
  const response = await fetch(`${base}/api/professional/proposals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: await cookie(professionalId, "PROFESSIONAL"),
    },
    body: JSON.stringify({
      jobId,
      bidAmount: price,
      duration: "14 days",
      coverLetter: "I can complete this work with a clear design and delivery plan.",
    }),
  });
  return { status: response.status, body: await response.json() };
}

async function clientProposalAction(proposalId: number, action: "accept" | "reject") {
  const response = await fetch(`${base}/api/client/proposals/${proposalId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: await cookie(clientId, "CLIENT") },
    body: JSON.stringify({ action }),
  });
  return { status: response.status, body: await response.json() };
}

try {
  const unauthorizedProposal = await fetch(`${base}/api/professional/proposals`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: await cookie(clientId, "CLIENT") },
    body: JSON.stringify({
      jobId: 1,
      bidAmount: 1,
      duration: "1 day",
      coverLetter: "Unauthorized proposal request.",
    }),
  });
  if (unauthorizedProposal.status !== 403)
    throw new Error("client role could access professional proposals");
  const [first, second] = await Promise.all(
    [1, 2].map((number) =>
      db.clientJob.create({
        data: {
          userId: clientId,
          title: `Proposal flow test ${number}`,
          category: "UI/UX Design",
          description: "Temporary end-to-end proposal flow test job.",
          budgetMin: 1000,
          budgetMax: 2000,
          timingType: "FIXED",
          workMode: "REMOTE",
          status: "OPEN",
        },
      }),
    ),
  );
  jobOne = first.id;
  jobTwo = second.id;

  const sent = await postProposal(first.id);
  if (sent.status !== 201) throw new Error(`proposal send failed: ${JSON.stringify(sent)}`);
  requestIds.push(sent.body.proposal.id);
  const duplicate = await postProposal(first.id);
  if (duplicate.status !== 409)
    throw new Error(`duplicate proposal was not rejected: ${JSON.stringify(duplicate)}`);
  const professionalView = await fetch(`${base}/api/professional/proposals?jobId=${first.id}`, {
    headers: { Cookie: await cookie(professionalId, "PROFESSIONAL") },
  });
  const professionalData = await professionalView.json();
  if (professionalView.status !== 200 || professionalData.proposal?.id !== sent.body.proposal.id)
    throw new Error("professional proposal did not persist");
  const professionalJobs = await fetch(`${base}/api/portal/professional-jobs`, {
    headers: { Cookie: await cookie(professionalId, "PROFESSIONAL") },
  });
  const professionalJobsData = await professionalJobs.json();
  if (
    professionalJobs.status !== 200 ||
    !professionalJobsData.proposals?.some(
      (proposal: { id: number }) => proposal.id === sent.body.proposal.id,
    )
  )
    throw new Error("proposal did not appear in Professional My Jobs");
  const clientView = await fetch(`${base}/api/client/jobs/${first.id}`, {
    headers: { Cookie: await cookie(clientId, "CLIENT") },
  });
  const clientData = await clientView.json();
  if (clientView.status !== 200 || clientData.proposals?.[0]?.id !== sent.body.proposal.id)
    throw new Error("client cannot see proposal");
  const rejected = await clientProposalAction(sent.body.proposal.id, "reject");
  if (rejected.status !== 200) throw new Error(`rejection failed: ${JSON.stringify(rejected)}`);
  const denied = await postProposal(first.id);
  if (denied.status !== 201)
    throw new Error(`a declined proposal could not be resubmitted: ${JSON.stringify(denied)}`);
  requestIds.push(denied.body.proposal.id);
  const closed = await db.clientJob.update({ where: { id: first.id }, data: { status: "CLOSED" } });
  if (!closed) throw new Error("could not close test job");
  const closedResult = await postProposal(first.id);
  if (closedResult.status !== 409) throw new Error("closed job accepted a proposal");

  const acceptedProposal = await postProposal(second.id, 1750);
  if (acceptedProposal.status !== 201)
    throw new Error(`second proposal failed: ${JSON.stringify(acceptedProposal)}`);
  requestIds.push(acceptedProposal.body.proposal.id);
  const accepted = await clientProposalAction(acceptedProposal.body.proposal.id, "accept");
  if (accepted.status !== 200 || !accepted.body.project?.id)
    throw new Error(`hire failed: ${JSON.stringify(accepted)}`);
  projectIds.push(accepted.body.project.id);
  const [clientProject, professionalProject] = await Promise.all([
    fetch(`${base}/api/portal/project?id=${accepted.body.project.id}`, {
      headers: { Cookie: await cookie(clientId, "CLIENT") },
    }),
    fetch(`${base}/api/portal/project?id=${accepted.body.project.id}`, {
      headers: { Cookie: await cookie(professionalId, "PROFESSIONAL") },
    }),
  ]);
  if (!clientProject.ok || !professionalProject.ok)
    throw new Error("shared tracking was not readable by both roles");
  const notifications = await db.userNotification.findMany({
    where: {
      OR: [{ href: `/job/${first.id}` }, { href: `/project/${accepted.body.project.id}/tracking` }],
    },
    select: { type: true },
  });
  for (const type of ["NEW_PROPOSAL", "PROPOSAL_DECLINED", "PROPOSAL_ACCEPTED"])
    if (!notifications.some((notification) => notification.type === type))
      throw new Error(`${type} notification was not persisted`);
  console.log(
    JSON.stringify(
      {
        passed:
          "proposal, duplicate protection, client review, rejection, closed job, hire, and shared project",
        projectId: accepted.body.project.id,
      },
      null,
      2,
    ),
  );
} finally {
  if (projectIds.length) {
    await db.projectTimelineEvent.deleteMany({ where: { trackingId: { in: projectIds } } });
    await db.projectTracking.deleteMany({ where: { id: { in: projectIds } } });
  }
  if (requestIds.length) await db.projectRequest.deleteMany({ where: { id: { in: requestIds } } });
  const jobIds = [jobOne, jobTwo].filter((id): id is number => Boolean(id));
  if (jobIds.length) await db.clientJob.deleteMany({ where: { id: { in: jobIds } } });
  if (jobIds.length || projectIds.length)
    await db.userNotification.deleteMany({
      where: {
        OR: [
          ...jobIds.map((jobId) => ({ href: `/job/${jobId}` })),
          ...projectIds.map((projectId) => ({ href: `/project/${projectId}/tracking` })),
        ],
      },
    });
  await db.$disconnect();
}
