import { prisma } from "@/lib/prisma";

export interface MedicamentoAnvisaData {
  numeroRegistro: string;
  nomeProduto: string;
  principioAtivo?: string | null;
  empresa?: string | null;
  situacaoRegistro?: string | null;
  classeTerapeutica?: string | null;
  apresentacao?: string | null;
  concentracao?: string | null;
  data?: string | null;
}

export class MedicamentoAnvisaRepository {
  /**
   * Busca um medicamento pelo número de registro
   */
  async findByNumeroRegistro(numeroRegistro: string) {
    return await prisma.medicamentoAnvisa.findUnique({
      where: { numeroRegistro },
    });
  }

  /**
   * Cria ou atualiza um medicamento (UPSERT)
   * Usa numeroRegistro como chave única
   */
  async upsert(data: MedicamentoAnvisaData) {
    return await prisma.medicamentoAnvisa.upsert({
      where: { numeroRegistro: data.numeroRegistro },
      update: {
        nomeProduto: data.nomeProduto,
        principioAtivo: data.principioAtivo,
        empresa: data.empresa,
        situacaoRegistro: data.situacaoRegistro,
        classeTerapeutica: data.classeTerapeutica,
        apresentacao: data.apresentacao,
        concentracao: data.concentracao,
        data: data.data,
        updatedAt: new Date(),
      },
      create: {
        numeroRegistro: data.numeroRegistro,
        nomeProduto: data.nomeProduto,
        principioAtivo: data.principioAtivo,
        empresa: data.empresa,
        situacaoRegistro: data.situacaoRegistro,
        classeTerapeutica: data.classeTerapeutica,
        apresentacao: data.apresentacao,
        concentracao: data.concentracao,
        data: data.data,
      },
    });
  }

  /**
   * Busca medicamentos por termo de busca (nome, princípio ativo ou empresa)
   */
  async search(searchTerm: string, limit: number = 50) {
    const search = searchTerm.trim().toLowerCase();

    if (!search) {
      return [];
    }

    return await prisma.medicamentoAnvisa.findMany({
      where: {
        OR: [
          { nomeProduto: { contains: search, mode: "insensitive" } },
          { principioAtivo: { contains: search, mode: "insensitive" } },
          { empresa: { contains: search, mode: "insensitive" } },
        ],
      },
      take: limit,
      orderBy: [
        // Prioriza resultados que começam com o termo de busca
        { nomeProduto: "asc" },
      ],
    });
  }

  /**
   * Busca medicamentos por nome (otimizado para autocomplete)
   */
  async searchByNome(nome: string, limit: number = 20) {
    const search = nome.trim().toLowerCase();

    if (!search) {
      return [];
    }

    return await prisma.medicamentoAnvisa.findMany({
      where: {
        nomeProduto: { contains: search, mode: "insensitive" },
      },
      take: limit,
      orderBy: { nomeProduto: "asc" },
      select: {
        id: true,
        numeroRegistro: true,
        nomeProduto: true,
        principioAtivo: true,
        empresa: true,
        apresentacao: true,
        concentracao: true,
      },
    });
  }

  /**
   * Busca medicamentos por princípio ativo
   */
  async searchByPrincipioAtivo(principioAtivo: string, limit: number = 50) {
    const search = principioAtivo.trim().toLowerCase();

    if (!search) {
      return [];
    }

    return await prisma.medicamentoAnvisa.findMany({
      where: {
        principioAtivo: { contains: search, mode: "insensitive" },
      },
      take: limit,
      orderBy: { nomeProduto: "asc" },
    });
  }

  /**
   * Conta o total de medicamentos no banco
   */
  async count() {
    return await prisma.medicamentoAnvisa.count();
  }

  /**
   * Busca todos os medicamentos (com paginação)
   */
  async findAll(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [medicamentos, total] = await Promise.all([
      prisma.medicamentoAnvisa.findMany({
        skip,
        take: limit,
        orderBy: { nomeProduto: "asc" },
      }),
      prisma.medicamentoAnvisa.count(),
    ]);

    return {
      medicamentos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
