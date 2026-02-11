import { prisma } from "@/lib/prisma";

/**
 * Valida se um código TUSS está vigente na data especificada
 */
export async function validarVigenciaTuss(
  codigoTussId: string,
  dataReferencia: Date = new Date()
): Promise<{ valido: boolean; motivo?: string }> {
  const codigoTuss = await prisma.codigoTuss.findUnique({
    where: { id: codigoTussId },
  });

  if (!codigoTuss) {
    return { valido: false, motivo: "Código TUSS não encontrado" };
  }

  if (!codigoTuss.ativo) {
    return { valido: false, motivo: "Código TUSS inativo" };
  }

  if (codigoTuss.dataVigenciaInicio > dataReferencia) {
    return {
      valido: false,
      motivo: `Código TUSS ainda não está vigente. Início: ${codigoTuss.dataVigenciaInicio.toLocaleDateString("pt-BR")}`,
    };
  }

  if (
    codigoTuss.dataVigenciaFim &&
    codigoTuss.dataVigenciaFim < dataReferencia
  ) {
    return {
      valido: false,
      motivo: `Código TUSS expirado. Fim: ${codigoTuss.dataVigenciaFim.toLocaleDateString("pt-BR")}`,
    };
  }

  return { valido: true };
}

/**
 * Valida se um valor TUSS está vigente na data especificada
 */
export async function validarVigenciaValor(
  valorId: string,
  dataReferencia: Date = new Date()
): Promise<{ valido: boolean; motivo?: string }> {
  const valor = await prisma.tussValor.findUnique({
    where: { id: valorId },
  });

  if (!valor) {
    return { valido: false, motivo: "Valor não encontrado" };
  }

  if (!valor.ativo) {
    return { valido: false, motivo: "Valor inativo" };
  }

  if (valor.dataVigenciaInicio > dataReferencia) {
    return {
      valido: false,
      motivo: `Valor ainda não está vigente. Início: ${valor.dataVigenciaInicio.toLocaleDateString("pt-BR")}`,
    };
  }

  if (valor.dataVigenciaFim && valor.dataVigenciaFim < dataReferencia) {
    return {
      valido: false,
      motivo: `Valor expirado. Fim: ${valor.dataVigenciaFim.toLocaleDateString("pt-BR")}`,
    };
  }

  return { valido: true };
}

/**
 * Busca valor TUSS seguindo hierarquia:
 * 1. Mais específico: planoSaudeId + operadoraId + tipoConsultaId
 * 2. Intermediário: operadoraId + tipoConsultaId
 * 3. Padrão: apenas codigoTussId (sem operadora)
 */
export async function buscarValorTuss(
  params: {
    clinicaId: string;
    codigoTussId: string;
    operadoraId?: string | null;
    planoSaudeId?: string | null;
    tipoConsultaId?: string | null;
    dataReferencia?: Date;
  }
): Promise<{ valor: number | null; valorId: string | null; motivo?: string }> {
  const {
    clinicaId,
    codigoTussId,
    operadoraId,
    planoSaudeId,
    tipoConsultaId,
    dataReferencia = new Date(),
  } = params;

  // Validar vigência do código TUSS primeiro
  const validacaoTuss = await validarVigenciaTuss(codigoTussId, dataReferencia);
  if (!validacaoTuss.valido) {
    return {
      valor: null,
      valorId: null,
      motivo: validacaoTuss.motivo,
    };
  }

  // Construir condições de busca hierárquica
  const condicoes = [];

  // 1. Mais específico: plano + operadora + tipo
  if (planoSaudeId && operadoraId && tipoConsultaId) {
    condicoes.push({
      planoSaudeId,
      operadoraId,
      tipoConsultaId,
    });
  }

  // 2. Plano + operadora (sem tipo)
  if (planoSaudeId && operadoraId) {
    condicoes.push({
      planoSaudeId,
      operadoraId,
      tipoConsultaId: null,
    });
  }

  // 3. Operadora + tipo (sem plano)
  if (operadoraId && tipoConsultaId) {
    condicoes.push({
      planoSaudeId: null,
      operadoraId,
      tipoConsultaId,
    });
  }

  // 4. Apenas operadora (sem plano e tipo)
  if (operadoraId) {
    condicoes.push({
      planoSaudeId: null,
      operadoraId,
      tipoConsultaId: null,
    });
  }

  // 5. Apenas tipo (sem operadora e plano)
  if (tipoConsultaId) {
    condicoes.push({
      planoSaudeId: null,
      operadoraId: null,
      tipoConsultaId,
    });
  }

  // 6. Padrão (sem operadora, plano e tipo)
  condicoes.push({
    planoSaudeId: null,
    operadoraId: null,
    tipoConsultaId: null,
  });

  // Buscar valores seguindo a hierarquia
  for (const condicao of condicoes) {
    const valor = await prisma.tussValor.findFirst({
      where: {
        clinicaId,
        codigoTussId,
        ...condicao,
        ativo: true,
        dataVigenciaInicio: { lte: dataReferencia },
        OR: [
          { dataVigenciaFim: null },
          { dataVigenciaFim: { gte: dataReferencia } },
        ],
      },
      orderBy: [
        { planoSaudeId: "desc" }, // Prioriza valores com plano
        { operadoraId: "desc" }, // Prioriza valores com operadora
        { tipoConsultaId: "desc" }, // Prioriza valores com tipo
      ],
    });

    if (valor) {
      return {
        valor: Number(valor.valor),
        valorId: valor.id,
      };
    }
  }

  return {
    valor: null,
    valorId: null,
    motivo: "Nenhum valor encontrado para esta combinação",
  };
}

/**
 * Verifica se um código TUSS é aceito por uma operadora/plano
 */
export async function verificarAceitacaoTuss(
  codigoTussId: string,
  operadoraId?: string | null,
  planoSaudeId?: string | null
): Promise<{ aceito: boolean; motivo?: string }> {
  // Se não há operadora, código é aceito (consulta particular)
  if (!operadoraId) {
    return { aceito: true };
  }

  // Buscar regra específica
  const regra = await prisma.tussOperadora.findFirst({
    where: {
      codigoTussId,
      operadoraId,
      OR: [
        { planoSaudeId: planoSaudeId || null },
        { planoSaudeId: null }, // Regra geral para todos os planos
      ],
    },
    orderBy: [
      { planoSaudeId: "desc" }, // Prioriza regra específica do plano
    ],
  });

  if (!regra) {
    // Se não há regra, assume que é aceito (whitelist padrão)
    return { aceito: true };
  }

  if (!regra.aceito) {
    return {
      aceito: false,
      motivo: "Código TUSS não aceito por este plano/operadora",
    };
  }

  return { aceito: true };
}

/**
 * Busca códigos TUSS válidos para uma especialidade
 */
export async function buscarCodigosTussPorEspecialidade(
  especialidadeId: string,
  tipoProcedimento: string = "CONSULTA",
  dataReferencia: Date = new Date()
) {
  const codigosTuss = await prisma.codigoTuss.findMany({
    where: {
      tipoProcedimento,
      ativo: true,
      dataVigenciaInicio: { lte: dataReferencia },
      OR: [
        { dataVigenciaFim: null },
        { dataVigenciaFim: { gte: dataReferencia } },
      ],
      tussEspecialidades: {
        some: {
          especialidadeId,
        },
      },
    },
    include: {
      grupo: true,
    },
    orderBy: {
      codigoTuss: "asc",
    },
  });

  return codigosTuss;
}














