-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "credit" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "brand" TEXT,
ADD COLUMN     "code" TEXT;

-- CreateIndex
CREATE INDEX "Client_code_idx" ON "Client"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");

