-- CreateTable
CREATE TABLE "QuoteArt" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "uploadedBy" TEXT,
    "response" TEXT,
    "responseComment" TEXT,
    "respondedAt" TIMESTAMP(3),
    "seenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteArt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuoteArt_token_key" ON "QuoteArt"("token");

-- CreateIndex
CREATE INDEX "QuoteArt_quoteId_idx" ON "QuoteArt"("quoteId");

-- AddForeignKey
ALTER TABLE "QuoteArt" ADD CONSTRAINT "QuoteArt_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
