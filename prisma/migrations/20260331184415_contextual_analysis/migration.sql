-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "impressions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "views" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "stories" ADD COLUMN     "highlightOrder" INTEGER,
ADD COLUMN     "highlightTitle" TEXT,
ADD COLUMN     "isHighlight" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "musicTitle" TEXT,
ADD COLUMN     "musicUrl" TEXT;

-- CreateTable
CREATE TABLE "story_likes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_comments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sign_translations" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'fr',
    "frames" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sign_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weather_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "city" TEXT,
    "country" TEXT,
    "uvIndex" DOUBLE PRECISION NOT NULL,
    "aqi" INTEGER,
    "humidity" DOUBLE PRECISION,
    "temperature" DOUBLE PRECISION,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weather_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skin_alerts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skin_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skin_seasonal_patterns" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "avgConditionScore" DOUBLE PRECISION NOT NULL,
    "dominantIssue" TEXT,
    "totalLogs" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skin_seasonal_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skin_daily_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conditionScore" INTEGER NOT NULL,
    "notes" TEXT,
    "concerns" TEXT[],
    "weather" JSONB,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skin_daily_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "story_likes_userId_storyId_key" ON "story_likes"("userId", "storyId");

-- CreateIndex
CREATE UNIQUE INDEX "sign_translations_postId_key" ON "sign_translations"("postId");

-- CreateIndex
CREATE INDEX "weather_logs_userId_date_idx" ON "weather_logs"("userId", "date");

-- CreateIndex
CREATE INDEX "skin_alerts_userId_isRead_idx" ON "skin_alerts"("userId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "skin_seasonal_patterns_userId_month_year_key" ON "skin_seasonal_patterns"("userId", "month", "year");

-- CreateIndex
CREATE INDEX "skin_daily_logs_userId_date_idx" ON "skin_daily_logs"("userId", "date");

-- CreateIndex
CREATE INDEX "stories_userId_isHighlight_idx" ON "stories"("userId", "isHighlight");

-- AddForeignKey
ALTER TABLE "story_likes" ADD CONSTRAINT "story_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_likes" ADD CONSTRAINT "story_likes_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_comments" ADD CONSTRAINT "story_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_comments" ADD CONSTRAINT "story_comments_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_translations" ADD CONSTRAINT "sign_translations_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weather_logs" ADD CONSTRAINT "weather_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skin_alerts" ADD CONSTRAINT "skin_alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skin_seasonal_patterns" ADD CONSTRAINT "skin_seasonal_patterns_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skin_daily_logs" ADD CONSTRAINT "skin_daily_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
