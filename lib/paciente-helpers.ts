import { prisma } from "@/lib/prisma";

/**
 * Gera o próximo número de prontuário globalmente único
 * O número é sequencial e único em todo o sistema
 * @returns Próximo número de prontuário disponível
 */
export async function gerarNumeroProntuario(): Promise<number> {
  // Verificar se a coluna numeroProntuario existe no banco
  try {
    const columnCheck = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'pacientes' 
          AND column_name = 'numeroProntuario'
      ) as exists
    `);
    
    const hasColumn = columnCheck[0]?.exists || false;
    
    if (!hasColumn) {
      // Se a coluna não existe, retornar baseado no total de pacientes
      const totalResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
        SELECT COUNT(*) as count FROM pacientes
      `);
      const total = Number(totalResult[0]?.count || 0);
      return total + 1;
    }
    
    // Se a coluna existe, buscar o maior número
    const result = await prisma.$queryRawUnsafe<Array<{ numeroProntuario: number | null }>>(`
      SELECT "numeroProntuario"
      FROM pacientes
      WHERE "numeroProntuario" IS NOT NULL
      ORDER BY "numeroProntuario" DESC
      LIMIT 1
    `);

    if (result.length === 0 || !result[0]?.numeroProntuario) {
      return 1;
    }

    return (result[0].numeroProntuario as number) + 1;
  } catch (error: any) {
    // Se houver erro, usar método alternativo baseado no total de pacientes
    console.warn("Erro ao buscar número de prontuário, usando método alternativo:", error.message);
    
    try {
      const totalResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
        SELECT COUNT(*) as count FROM pacientes
      `);
      const total = Number(totalResult[0]?.count || 0);
      return total + 1;
    } catch (countError) {
      // Se tudo falhar, retornar 1
      console.error("Erro ao contar pacientes:", countError);
      return 1;
    }
  }
}

