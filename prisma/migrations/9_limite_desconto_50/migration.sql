-- Limite de desconto da equipe passa a ser 50% (era 100%, ou seja, sem limite).
-- So troca quem ainda esta no valor antigo; quem ja ajustou em Configuracoes fica como esta.
ALTER TABLE "CompanySettings" ALTER COLUMN "staffDiscountMax" SET DEFAULT 50;
UPDATE "CompanySettings" SET "staffDiscountMax" = 50 WHERE "staffDiscountMax" = 100;
