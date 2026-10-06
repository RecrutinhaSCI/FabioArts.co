-- R18 — Pedidos: fluxo rápido Cliente → Projeto → Orçamento → Financeiro
-- Migration ADITIVA: nenhuma coluna/tabela/valor de enum é removido e nenhum
-- dado pré-existente é sobrescrito (backfill só preenche colunas novas).

-- CreateEnum
CREATE TYPE "WorkStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "FinancialStatus" ADD VALUE 'PARTIAL';

-- AlterEnum
ALTER TYPE "ProjectCategory" ADD VALUE 'COMBO';

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "phoneNormalized" TEXT;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "carModel" TEXT,
ADD COLUMN     "deliveryDate" DATE,
ADD COLUMN     "workStatus" "WorkStatus" NOT NULL DEFAULT 'NOT_STARTED';

-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "projectId" TEXT,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "description" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "clients_phoneNormalized_key" ON "clients"("phoneNormalized");

-- CreateIndex
CREATE INDEX "projects_clientId_idx" ON "projects"("clientId");

-- CreateIndex
CREATE INDEX "projects_deliveryDate_idx" ON "projects"("deliveryDate");

-- CreateIndex
CREATE INDEX "quotes_clientId_idx" ON "quotes"("clientId");

-- CreateIndex
CREATE INDEX "quotes_projectId_idx" ON "quotes"("projectId");

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ── Backfill de dados (não destrutivo) ─────────────────────────────

-- 1) Projetos já existentes são peças de portfólio finalizadas.
UPDATE "projects" SET "workStatus" = 'COMPLETED';

-- 2) Telefone: o Fabio já guardava o telefone no campo "instagram"
--    (rotulado "Contato" a partir desta versão). COPIA para phone /
--    phoneNormalized para a deduplicação reconhecer clientes antigos.
--    O valor original em "instagram" é mantido intacto.
--    Normalização = mesma regra de src/utils/phone.ts.
WITH src AS (
  SELECT id, instagram,
         ltrim(regexp_replace(instagram, '[^0-9]', '', 'g'), '0') AS d
  FROM "clients"
  WHERE instagram IS NOT NULL
    AND instagram !~ '[A-Za-z@/]'
), norm AS (
  SELECT id, instagram,
         CASE WHEN length(d) >= 12 AND d LIKE '55%' THEN substr(d, 3) ELSE d END AS n
  FROM src
), ranked AS (
  SELECT id, instagram, n,
         row_number() OVER (PARTITION BY n ORDER BY id) AS rn
  FROM norm
  WHERE length(n) BETWEEN 10 AND 11
)
UPDATE "clients" c
SET "phone" = r.instagram, "phoneNormalized" = r.n
FROM ranked r
WHERE c.id = r.id AND r.rn = 1 AND c."phoneNormalized" IS NULL;

-- Nenhuma coluna pré-existente é alterada: os UPDATEs acima só gravam nas
-- colunas novas (workStatus, phone, phoneNormalized). Valores antigos de
-- paymentMethod ("pix"/"PIX") são tratados sem distinção na interface.
