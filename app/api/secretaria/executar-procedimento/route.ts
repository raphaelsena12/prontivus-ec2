import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

async function checkAuthorization() {
  const session = await getSession();

  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      ),
    };
  }

  if (session.user.tipo !== TipoUsuario.SECRETARIA && session.user.tipo !== TipoUsuario.ADMIN_CLINICA) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      ),
    };
  }

  const clinicaId = await getUserClinicaId();
  if (!clinicaId) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, clinicaId };
}

const executarProcedimentoSchema = z.object({
  procedimentoId: z.string().uuid("ID do procedimento inválido"),
  pacienteId: z.string().uuid("ID do paciente inválido"),
  formaPagamentoId: z.string().uuid("Forma de pagamento é obrigatória"),
  valorPago: z.number().min(0.01, "Valor deve ser maior que zero"),
  observacoes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await request.json();
    const validation = executarProcedimentoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Buscar procedimento com medicamentos e insumos
    const procedimento = await prisma.procedimento.findFirst({
      where: {
        id: data.procedimentoId,
        clinicaId: auth.clinicaId!,
        ativo: true,
      },
      include: {
        procedimentosMedicamentos: {
          include: {
            medicamento: {
              include: {
                estoqueMedicamento: true,
              },
            },
          },
        },
        procedimentosInsumos: {
          include: {
            insumo: true,
          },
        },
      },
    });

    if (!procedimento) {
      return NextResponse.json(
        { error: "Procedimento não encontrado" },
        { status: 404 }
      );
    }

    // Verificar estoque de medicamentos
    const estoqueInsuficiente: string[] = [];
    for (const procMed of procedimento.procedimentosMedicamentos) {
      const estoque = procMed.medicamento.estoqueMedicamento;
      if (!estoque) {
        estoqueInsuficiente.push(
          `${procMed.medicamento.nome} - Estoque não cadastrado`
        );
        continue;
      }

      const quantidadeNecessaria = Number(procMed.quantidade || 0);
      if (estoque.quantidadeAtual < quantidadeNecessaria) {
        estoqueInsuficiente.push(
          `${procMed.medicamento.nome} - Estoque insuficiente (disponível: ${estoque.quantidadeAtual}, necessário: ${quantidadeNecessaria})`
        );
      }
    }

    if (estoqueInsuficiente.length > 0) {
      return NextResponse.json(
        {
          error: "Estoque insuficiente",
          detalhes: estoqueInsuficiente,
        },
        { status: 400 }
      );
    }

    // Verificar se paciente existe
    const paciente = await prisma.paciente.findFirst({
      where: {
        id: data.pacienteId,
        clinicaId: auth.clinicaId!,
      },
    });

    if (!paciente) {
      return NextResponse.json(
        { error: "Paciente não encontrado" },
        { status: 404 }
      );
    }

    // Verificar se forma de pagamento existe
    const formaPagamento = await prisma.formaPagamento.findFirst({
      where: {
        id: data.formaPagamentoId,
        clinicaId: auth.clinicaId!,
        ativo: true,
      },
    });

    if (!formaPagamento) {
      return NextResponse.json(
        { error: "Forma de pagamento não encontrada" },
        { status: 404 }
      );
    }

    // Executar em transação: baixar estoque, criar fluxo de caixa e registrar execução
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Baixar estoque de medicamentos
      const movimentacoes = [];
      for (const procMed of procedimento.procedimentosMedicamentos) {
        const estoque = procMed.medicamento.estoqueMedicamento;
        if (estoque) {
          const quantidade = Number(procMed.quantidade || 0);
          const novaQuantidade = estoque.quantidadeAtual - quantidade;

          // Criar movimentação
          const movimentacao = await tx.movimentacaoEstoque.create({
            data: {
              clinicaId: auth.clinicaId!,
              tipoEstoque: "MEDICAMENTO",
              estoqueMedicamentoId: estoque.id,
              tipo: "SAIDA",
              quantidade,
              motivo: "Execução de procedimento",
              observacoes: `Procedimento: ${procedimento.nome} - Paciente: ${paciente.nome}`,
            },
          });

          // Atualizar estoque
          await tx.estoqueMedicamento.update({
            where: { id: estoque.id },
            data: { quantidadeAtual: novaQuantidade },
          });

          movimentacoes.push(movimentacao);
        }
      }

      // 2. Criar entrada no fluxo de caixa
      const fluxoCaixa = await tx.fluxoCaixa.create({
        data: {
          clinicaId: auth.clinicaId!,
          tipo: "ENTRADA",
          descricao: `Execução de procedimento: ${procedimento.nome} - ${paciente.nome}`,
          valor: data.valorPago,
          data: new Date(),
          formaPagamentoId: data.formaPagamentoId,
          observacoes: data.observacoes || null,
        },
      });

      // 3. Criar conta a receber (se necessário, para controle financeiro)
      const contaReceber = await tx.contaReceber.create({
        data: {
          clinicaId: auth.clinicaId!,
          pacienteId: data.pacienteId,
          descricao: `Execução de procedimento: ${procedimento.nome}`,
          valor: data.valorPago,
          dataVencimento: new Date(),
          dataRecebimento: new Date(), // Já foi pago
          status: "RECEBIDO",
          formaPagamentoId: data.formaPagamentoId,
          observacoes: data.observacoes || null,
        },
      });

      return {
        movimentacoes,
        fluxoCaixa,
        contaReceber,
      };
    });

    return NextResponse.json(
      {
        message: "Procedimento executado com sucesso",
        resultado,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Erro ao executar procedimento:", error);
    return NextResponse.json(
      {
        error: "Erro ao executar procedimento",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

