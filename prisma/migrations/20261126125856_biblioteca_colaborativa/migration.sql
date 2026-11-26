-- CreateEnum
CREATE TYPE "CommunityStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "CommunityItem" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "kind" "ResourceKind" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "url" TEXT,
    "storageKey" TEXT,
    "bodyText" TEXT,
    "source" TEXT,
    "category" TEXT,
    "tags" TEXT[],
    "status" "CommunityStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommunityItem_storageKey_key" ON "CommunityItem"("storageKey");

-- CreateIndex
CREATE INDEX "CommunityItem_status_createdAt_idx" ON "CommunityItem"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityItem_authorId_createdAt_idx" ON "CommunityItem"("authorId", "createdAt");

-- AddForeignKey
ALTER TABLE "CommunityItem" ADD CONSTRAINT "CommunityItem_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
