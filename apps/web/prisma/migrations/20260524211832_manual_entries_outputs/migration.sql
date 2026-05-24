-- AlterTable
ALTER TABLE "FinancialEntry" ADD COLUMN     "commercialStatus" TEXT,
ADD COLUMN     "documentNumber" TEXT,
ADD COLUMN     "dueAt" TIMESTAMP(3),
ADD COLUMN     "financialStatus" TEXT,
ADD COLUMN     "issuedAt" TIMESTAMP(3),
ADD COLUMN     "manualKind" TEXT,
ADD COLUMN     "nature" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "recurrence" TEXT,
ADD COLUMN     "subCategory" TEXT,
ADD COLUMN     "supplierName" TEXT;
