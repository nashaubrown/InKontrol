-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'X', 'TIKTOK', 'PINTEREST', 'YOUTUBE', 'GOOGLE_BUSINESS', 'DEMO');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'SCHEDULED', 'PUBLISHED', 'FAILED');

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "handle" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT true,
    "encryptedTokens" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountAnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "followers" INTEGER NOT NULL,
    "engagementRate" DOUBLE PRECISION NOT NULL,
    "reach" INTEGER NOT NULL,
    "impressions" INTEGER NOT NULL,

    CONSTRAINT "AccountAnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPost" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "linkedTaskId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostTarget" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "contentOverride" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "externalId" TEXT,
    "errorMessage" TEXT,

    CONSTRAINT "PostTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostAnalytics" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "postTargetId" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "handle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "competitorId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "followers" INTEGER NOT NULL,
    "engagementRate" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CompetitorSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocialAccount_organizationId_idx" ON "SocialAccount"("organizationId");

-- CreateIndex
CREATE INDEX "AccountAnalyticsSnapshot_organizationId_idx" ON "AccountAnalyticsSnapshot"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountAnalyticsSnapshot_socialAccountId_date_key" ON "AccountAnalyticsSnapshot"("socialAccountId", "date");

-- CreateIndex
CREATE INDEX "SocialPost_organizationId_status_idx" ON "SocialPost"("organizationId", "status");

-- CreateIndex
CREATE INDEX "PostTarget_organizationId_status_scheduledAt_idx" ON "PostTarget"("organizationId", "status", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "PostTarget_postId_socialAccountId_key" ON "PostTarget"("postId", "socialAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "PostAnalytics_postTargetId_key" ON "PostAnalytics"("postTargetId");

-- CreateIndex
CREATE INDEX "PostAnalytics_organizationId_idx" ON "PostAnalytics"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitorProfile_organizationId_platform_handle_key" ON "CompetitorProfile"("organizationId", "platform", "handle");

-- CreateIndex
CREATE INDEX "CompetitorSnapshot_organizationId_idx" ON "CompetitorSnapshot"("organizationId");

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountAnalyticsSnapshot" ADD CONSTRAINT "AccountAnalyticsSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountAnalyticsSnapshot" ADD CONSTRAINT "AccountAnalyticsSnapshot_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_linkedTaskId_fkey" FOREIGN KEY ("linkedTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTarget" ADD CONSTRAINT "PostTarget_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTarget" ADD CONSTRAINT "PostTarget_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTarget" ADD CONSTRAINT "PostTarget_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostAnalytics" ADD CONSTRAINT "PostAnalytics_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostAnalytics" ADD CONSTRAINT "PostAnalytics_postTargetId_fkey" FOREIGN KEY ("postTargetId") REFERENCES "PostTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorProfile" ADD CONSTRAINT "CompetitorProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorSnapshot" ADD CONSTRAINT "CompetitorSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorSnapshot" ADD CONSTRAINT "CompetitorSnapshot_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "CompetitorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
