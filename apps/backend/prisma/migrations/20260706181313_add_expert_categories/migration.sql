-- CreateTable
CREATE TABLE "expert_categories" (
    "expertId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "expert_categories_pkey" PRIMARY KEY ("expertId","categoryId")
);

-- AddForeignKey
ALTER TABLE "expert_categories" ADD CONSTRAINT "expert_categories_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "expert_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_categories" ADD CONSTRAINT "expert_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
