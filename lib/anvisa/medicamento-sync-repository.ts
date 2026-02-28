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
  controle?: string | null;
  data?: string | null;
}

export class MedicamentoSyncRepository {
  /**
   * Busca um medicamento pelo número de registro e clínica
   */
  async findByNumeroRegistro(clinicaId: string, numeroRegistro: string) {
    return await prisma.medicamento.findFirst({
      where: {
        AND: [
          { clinicaId },
          { numeroRegistro },
        ],
      },
    });
  }

  /**
   * Cria ou atualiza um medicamento (UPSERT)
   * Usa numeroRegistro + clinicaId como chave única
   */
  async upsert(clinicaId: string, data: MedicamentoAnvisaData) {
    // Primeiro verificar se existe
    const existing = await this.findByNumeroRegistro(clinicaId, data.numeroRegistro);
    
    if (existing) {
      // Atualizar
      return await prisma.medicamento.update({
        where: {
          id: existing.id,
        },
        data: {
          nome: data.nomeProduto,
          principioAtivo: data.principioAtivo,
          laboratorio: data.empresa,
          apresentacao: data.apresentacao,
          concentracao: data.concentracao,
          controle: data.controle,
          updatedAt: new Date(),
        },
      });
    } else {
      // Criar
      return await prisma.medicamento.create({
        data: {
          clinicaId,
          numeroRegistro: data.numeroRegistro,
          nome: data.nomeProduto,
          principioAtivo: data.principioAtivo,
          laboratorio: data.empresa,
          apresentacao: data.apresentacao,
          concentracao: data.concentracao,
          controle: data.controle,
          ativo: true,
        },
      });
    }
  }

  /**
   * Conta o total de medicamentos sincronizados da ANVISA para uma clínica
   */
  async countByClinica(clinicaId: string) {
    return await prisma.medicamento.count({
      where: {
        clinicaId,
        numeroRegistro: { not: null },
      },
    });
  }
}
