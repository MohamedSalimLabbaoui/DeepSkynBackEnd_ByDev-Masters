-- AlterTable
ALTER TABLE "users" ADD COLUMN     "churnRiskLevel" TEXT,
ADD COLUMN     "churnRiskScore" DOUBLE PRECISION,
ADD COLUMN     "lastChurnAnalysis" TIMESTAMP(3),
ADD COLUMN     "reEngagementSentAt" TIMESTAMP(3);
