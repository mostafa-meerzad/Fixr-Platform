-- AlterTable
ALTER TABLE "expert_profiles" ADD COLUMN     "shopAddress" TEXT,
ADD COLUMN     "shopZoneId" TEXT;

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "tags" TEXT[];

-- CreateTable
CREATE TABLE "homeowner_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "zoneId" TEXT,
    "address" TEXT,
    "positivePoints" INTEGER NOT NULL DEFAULT 0,
    "negativePoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homeowner_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "homeowner_profiles_userId_key" ON "homeowner_profiles"("userId");

-- AddForeignKey
ALTER TABLE "homeowner_profiles" ADD CONSTRAINT "homeowner_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homeowner_profiles" ADD CONSTRAINT "homeowner_profiles_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_profiles" ADD CONSTRAINT "expert_profiles_shopZoneId_fkey" FOREIGN KEY ("shopZoneId") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
