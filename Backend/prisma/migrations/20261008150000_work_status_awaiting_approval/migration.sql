-- Novo status de andamento: "Aguardando aprovação".
-- Somente ADICIONA um valor ao enum. Nenhum registro existente é alterado.
ALTER TYPE "WorkStatus" ADD VALUE IF NOT EXISTS 'AWAITING_APPROVAL' BEFORE 'COMPLETED';
