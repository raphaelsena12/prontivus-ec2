import { prisma } from "@/lib/prisma";
import { StatusPagamento, StatusClinica } from "@/lib/generated/prisma/enums";
import { Prisma } from "@/lib/generated/prisma/client";

/**
 * Registra um novo pagamento mensal para uma clínica
 */
export async function registrarPagamento(
  tenantId: string,
  mesReferencia: Date,
  valor: number,
  metodoPagamento?: string,
  dataVencimento?: Date
) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { plano: true },
  });

  if (!tenant) {
    throw new Error("Clínica não encontrada");
  }

  // Se não informado, usar o valor do plano atual
  const valorPagamento = valor || Number(tenant.plano.preco);

  // Se não informado, vencimento em 7 dias
  const vencimento = dataVencimento || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const pagamento = await prisma.pagamento.create({
    data: {
      tenantId,
      valor: valorPagamento,
      mesReferencia,
      status: StatusPagamento.PENDENTE,
      metodoPagamento: metodoPagamento || "BOLETO",
      dataVencimento: vencimento,
    },
    include: {
      tenant: {
        include: {
          plano: true,
        },
      },
    },
  });

  return pagamento;
}

/**
 * Confirma um pagamento e renova a licença da clínica automaticamente
 */
export async function confirmarPagamento(
  pagamentoId: string,
  transacaoId?: string,
  dataPagamento?: Date
) {
  const pagamento = await prisma.pagamento.findUnique({
    where: { id: pagamentoId },
    include: {
      tenant: {
        include: {
          plano: true,
        },
      },
    },
  });

  if (!pagamento) {
    throw new Error("Pagamento não encontrado");
  }

  if (pagamento.status === StatusPagamento.PAGO) {
    throw new Error("Pagamento já foi confirmado anteriormente");
  }

  // Atualizar status do pagamento
  await prisma.pagamento.update({
    where: { id: pagamentoId },
    data: {
      status: StatusPagamento.PAGO,
      transacaoId: transacaoId || pagamento.transacaoId,
      dataPagamento: dataPagamento || new Date(),
    },
  });

  // Renovar licença da clínica
  await renovarLicenca(pagamento.tenantId, pagamento.mesReferencia);

  return pagamento;
}

/**
 * Renova a licença da clínica adicionando 1 mês à data de expiração
 */
export async function renovarLicenca(tenantId: string, mesReferencia: Date) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { plano: true },
  });

  if (!tenant) {
    throw new Error("Clínica não encontrada");
  }

  // Calcular nova data de expiração
  // Se não tem dataExpiracao, usar dataContratacao + 1 mês
  // Se tem dataExpiracao, adicionar 1 mês a partir dela
  const dataBase = tenant.dataExpiracao || tenant.dataContratacao;
  const novaDataExpiracao = new Date(dataBase);
  novaDataExpiracao.setMonth(novaDataExpiracao.getMonth() + 1);

  // Resetar tokens consumidos no início do novo mês
  const tokensDisponiveis = tenant.plano.tokensMensais;

  // Atualizar clínica
  const tenantAtualizado = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      dataExpiracao: novaDataExpiracao,
      tokensMensaisDisponiveis: tokensDisponiveis,
      tokensConsumidos: 0, // Resetar tokens consumidos
      status: StatusClinica.ATIVA, // Garantir que está ativa
    },
    include: {
      plano: true,
    },
  });

  return tenantAtualizado;
}

/**
 * Verifica se a clínica está com pagamento em dia
 */
export async function verificarPagamentoEmDia(tenantId: string): Promise<boolean> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      plano: true,
      pagamentos: {
        where: {
          status: StatusPagamento.PAGO,
        },
        orderBy: {
          mesReferencia: "desc",
        },
        take: 1,
      },
    },
  });

  if (!tenant) {
    return false;
  }

  // Se não tem dataExpiracao, considerar como não pago
  if (!tenant.dataExpiracao) {
    return false;
  }

  // Verificar se a data de expiração é futura
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const dataExpiracao = new Date(tenant.dataExpiracao);
  dataExpiracao.setHours(0, 0, 0, 0);

  return dataExpiracao >= hoje;
}

/**
 * Gera pagamentos pendentes para todas as clínicas ativas que precisam pagar
 */
export async function gerarPagamentosMensais() {
  const hoje = new Date();
  const mesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  // Buscar clínicas ativas que têm data de expiração próxima ou vencida
  const clinicas = await prisma.tenant.findMany({
    where: {
      status: StatusClinica.ATIVA,
      dataExpiracao: {
        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expira em até 7 dias
      },
    },
    include: {
      plano: true,
      pagamentos: {
        where: {
          mesReferencia: {
            gte: mesAtual,
          },
          status: {
            in: [StatusPagamento.PENDENTE, StatusPagamento.PAGO],
          },
        },
      },
    },
  });

  const pagamentosGerados = [];

  for (const clinica of clinicas) {
    // Verificar se já existe pagamento pendente ou pago para este mês
    const pagamentoExistente = clinica.pagamentos.find(
      (p) =>
        p.mesReferencia.getMonth() === mesAtual.getMonth() &&
        p.mesReferencia.getFullYear() === mesAtual.getFullYear() &&
        (p.status === StatusPagamento.PENDENTE || p.status === StatusPagamento.PAGO)
    );

    if (!pagamentoExistente) {
      // Gerar novo pagamento
      const pagamento = await registrarPagamento(
        clinica.id,
        mesAtual,
        Number(clinica.plano.preco),
        "BOLETO"
      );
      pagamentosGerados.push(pagamento);
    }
  }

  return pagamentosGerados;
}

/**
 * Suspende clínicas com pagamento vencido há mais de X dias
 */
export async function suspenderClinicasVencidas(diasTolerancia: number = 7) {
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - diasTolerancia);

  const clinicasVencidas = await prisma.tenant.findMany({
    where: {
      status: StatusClinica.ATIVA,
      dataExpiracao: {
        lt: dataLimite,
      },
    },
  });

  const resultados = [];

  for (const clinica of clinicasVencidas) {
    // Verificar se há pagamento pendente recente
    const pagamentoPendente = await prisma.pagamento.findFirst({
      where: {
        tenantId: clinica.id,
        status: StatusPagamento.PENDENTE,
        dataVencimento: {
          gte: dataLimite,
        },
      },
    });

    // Se não tem pagamento pendente válido, suspender
    if (!pagamentoPendente) {
      await prisma.tenant.update({
        where: { id: clinica.id },
        data: { status: StatusClinica.SUSPENSA },
      });

      resultados.push({
        clinicaId: clinica.id,
        nome: clinica.nome,
        acao: "SUSPENSA",
      });
    }
  }

  return resultados;
}

