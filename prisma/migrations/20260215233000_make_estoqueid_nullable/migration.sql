-- Tornar a coluna estoqueId opcional para permitir movimentações de insumos
-- Primeiro verificar se a coluna existe e é NOT NULL
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'movimentacoes_estoque' 
        AND column_name = 'estoqueId' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE "movimentacoes_estoque" ALTER COLUMN "estoqueId" DROP NOT NULL;
    END IF;
END $$;
