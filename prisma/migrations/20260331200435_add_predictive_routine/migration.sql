-- CreateTable
CREATE TABLE "predictive_routines" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "routine" JSONB NOT NULL,
    "weatherData" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "predictive_routines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "predictive_routines_userId_analysisId_idx" ON "predictive_routines"("userId", "analysisId");

-- CreateIndex
CREATE INDEX "predictive_routines_expiresAt_idx" ON "predictive_routines"("expiresAt");

-- AddForeignKey
ALTER TABLE "predictive_routines" ADD CONSTRAINT "predictive_routines_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
