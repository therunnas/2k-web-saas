-- AlterTable
ALTER TABLE "FinancialEntry" ADD COLUMN     "accountName" TEXT,
ADD COLUMN     "costCenter" TEXT,
ADD COLUMN     "expectedAmount" DECIMAL(14,2),
ADD COLUMN     "linkedClient" TEXT,
ADD COLUMN     "paidAmount" DECIMAL(14,2),
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "proofUrl" TEXT;
