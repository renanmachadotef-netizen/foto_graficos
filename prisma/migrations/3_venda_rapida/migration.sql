-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN     "city" TEXT,
ADD COLUMN     "pixKeyBradesco" TEXT,
ADD COLUMN     "pixKeySicoob" TEXT;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "searchKey" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "number" INTEGER;

-- AlterTable
ALTER TABLE "QuoteItem" ADD COLUMN     "productId" TEXT,
ALTER COLUMN "quantity" SET DATA TYPE DOUBLE PRECISION;

-- CreateIndex
CREATE UNIQUE INDEX "Quote_number_key" ON "Quote"("number");


-- Chave de busca dos clientes ja cadastrados: minusculas, sem acento, so letras e numeros
UPDATE "Client" SET "searchKey" = trim(regexp_replace(
  translate(lower(coalesce("name", '') || ' ' || coalesce("phone", '') || ' ' || coalesce("document", '') || ' ' || coalesce("code", '')),
            'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
  '[^a-z0-9]+', ' ', 'g'));
