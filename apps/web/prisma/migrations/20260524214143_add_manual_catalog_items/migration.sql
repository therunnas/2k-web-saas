-- CreateTable
CREATE TABLE "ManualCatalogItem" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentName" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManualCatalogItem_workspaceId_type_idx" ON "ManualCatalogItem"("workspaceId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ManualCatalogItem_workspaceId_type_name_key" ON "ManualCatalogItem"("workspaceId", "type", "name");
