CREATE TABLE "OutcomeReview" (
  "id" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "bookingId" INTEGER NOT NULL,
  "outcome" TEXT NOT NULL,
  "input" JSONB NOT NULL,
  "options" JSONB NOT NULL,
  "basis" JSONB NOT NULL,
  "estimate" JSONB NOT NULL,
  "plan" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ready',
  "jobId" TEXT,
  "startedAt" TIMESTAMP(3),
  "report" JSONB,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OutcomeReview_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OutcomeReview_userId_bookingId_idx" ON "OutcomeReview"("userId", "bookingId");
ALTER TABLE "OutcomeReview" ADD CONSTRAINT "OutcomeReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OutcomeReview" ADD CONSTRAINT "OutcomeReview_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
