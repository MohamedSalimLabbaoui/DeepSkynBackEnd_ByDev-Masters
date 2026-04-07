-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar3D" TEXT,
ADD COLUMN     "coverPhoto" TEXT;

-- CreateTable
CREATE TABLE "dermatology_articles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "imageUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "crawledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dermatology_articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dermatology_articles_url_key" ON "dermatology_articles"("url");

-- CreateIndex
CREATE INDEX "dermatology_articles_source_idx" ON "dermatology_articles"("source");

-- CreateIndex
CREATE INDEX "dermatology_articles_category_idx" ON "dermatology_articles"("category");

-- CreateIndex
CREATE INDEX "dermatology_articles_crawledAt_idx" ON "dermatology_articles"("crawledAt");
