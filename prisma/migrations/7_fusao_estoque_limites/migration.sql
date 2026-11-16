-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN "staffDiscountMax" DOUBLE PRECISION NOT NULL DEFAULT 100,
ADD COLUMN "receiptPaper" TEXT NOT NULL DEFAULT '80';

-- AlterTable
ALTER TABLE "Client" ADD COLUMN "creditLimit" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "trackStock" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "stockQty" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ProductStockMove" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "qtyDelta" DOUBLE PRECISION NOT NULL,
    "qtyAfter" DOUBLE PRECISION NOT NULL,
    "quoteId" TEXT,
    "unitCost" DOUBLE PRECISION,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductStockMove_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductStockMove_productId_createdAt_idx" ON "ProductStockMove"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductStockMove_quoteId_idx" ON "ProductStockMove"("quoteId");

-- AddForeignKey
ALTER TABLE "ProductStockMove" ADD CONSTRAINT "ProductStockMove_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
