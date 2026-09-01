-- CreateTable
CREATE TABLE "AdAccount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "encryptedTokens" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdCampaignSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "adAccountId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "campaignName" TEXT NOT NULL,
    "spend" DOUBLE PRECISION NOT NULL,
    "impressions" INTEGER NOT NULL,
    "clicks" INTEGER NOT NULL,
    "conversions" INTEGER NOT NULL,

    CONSTRAINT "AdCampaignSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackedKeyword" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackedKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeywordRankSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "keywordId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "position" INTEGER NOT NULL,

    CONSTRAINT "KeywordRankSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdAccount_organizationId_idx" ON "AdAccount"("organizationId");

-- CreateIndex
CREATE INDEX "AdCampaignSnapshot_organizationId_idx" ON "AdCampaignSnapshot"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackedKeyword_organizationId_keyword_targetUrl_key" ON "TrackedKeyword"("organizationId", "keyword", "targetUrl");

-- CreateIndex
CREATE INDEX "KeywordRankSnapshot_organizationId_idx" ON "KeywordRankSnapshot"("organizationId");

-- AddForeignKey
ALTER TABLE "AdAccount" ADD CONSTRAINT "AdAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCampaignSnapshot" ADD CONSTRAINT "AdCampaignSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCampaignSnapshot" ADD CONSTRAINT "AdCampaignSnapshot_adAccountId_fkey" FOREIGN KEY ("adAccountId") REFERENCES "AdAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackedKeyword" ADD CONSTRAINT "TrackedKeyword_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordRankSnapshot" ADD CONSTRAINT "KeywordRankSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordRankSnapshot" ADD CONSTRAINT "KeywordRankSnapshot_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "TrackedKeyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;
