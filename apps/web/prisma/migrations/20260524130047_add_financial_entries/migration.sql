-- CreateEnum
CREATE TYPE "FinancialEntryType" AS ENUM ('REVENUE', 'EXPENSE', 'RECEIVABLE', 'PAYABLE', 'UNKNOWN');

-- CreateTable
CREATE TABLE "FinancialEntry" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "importId" TEXT,
    "type" "FinancialEntryType" NOT NULL DEFAULT 'UNKNOWN',
    "date" TIMESTAMP(3),
    "competence" TEXT,
    "client" TEXT,
    "groupName" TEXT,
    "project" TEXT,
    "description" TEXT,
    "category" TEXT,
    "status" TEXT,
    "grossAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "costAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "profitAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "marginPercent" DECIMAL(8,2),
    "sourceSheet" TEXT,
    "sourceRow" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancialEntry_workspaceId_idx" ON "FinancialEntry"("workspaceId");

-- CreateIndex
CREATE INDEX "FinancialEntry_importId_idx" ON "FinancialEntry"("importId");

-- CreateIndex
CREATE INDEX "FinancialEntry_type_idx" ON "FinancialEntry"("type");

-- CreateIndex
CREATE INDEX "FinancialEntry_date_idx" ON "FinancialEntry"("date");

-- CreateIndex
CREATE INDEX "FinancialEntry_client_idx" ON "FinancialEntry"("client");

-- CreateIndex
CREATE INDEX "FinancialEntry_groupName_idx" ON "FinancialEntry"("groupName");

-- AddForeignKey
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_importId_fkey" FOREIGN KEY ("importId") REFERENCES "Import"("id") ON DELETE SET NULL ON UPDATE CASCADE;
