ALTER TABLE "ProjectTracking"
  ADD COLUMN IF NOT EXISTS "progress" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "currentStage" TEXT,
  ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);

ALTER TABLE "ProjectTracking"
  ALTER COLUMN "status" SET DEFAULT 'READY_TO_START';

UPDATE "ProjectTracking"
SET "status" = 'READY_TO_START'
WHERE "status" = 'RUNNING';

ALTER TABLE "ProjectMilestone"
  ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);

ALTER TABLE "ProjectMilestone"
  ALTER COLUMN "status" SET DEFAULT 'UPCOMING';

ALTER TABLE "ProjectWorkUpload"
  ADD COLUMN IF NOT EXISTS "milestoneId" INTEGER,
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'UPLOADED';

CREATE TABLE IF NOT EXISTS "ProjectTimelineEvent" (
  "id" SERIAL NOT NULL,
  "trackingId" INTEGER NOT NULL,
  "milestoneId" INTEGER,
  "actorId" INTEGER NOT NULL,
  "actorRole" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "progress" INTEGER,
  "stage" TEXT,
  "attachmentJson" TEXT DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectTimelineEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProjectTimelineEvent_trackingId_createdAt_idx"
  ON "ProjectTimelineEvent"("trackingId", "createdAt");
