import { redirect } from "next/navigation";
import { getSession, hasUserType, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario, StatusPagamento } from "@/lib/generated/prisma";
import { PagamentosPlanosContent } from "./pagamentos-planos-content";

async function getPagamentosData(clinicaId: string) {
  const clinica = await prisma.tenant.findUnique({
    select: {
      id: true,
      nome: true,
      dataExpiracao: true,
      status: true,
      planoId: true,
    },
    where: { id: clinicaId },
  });

  if (!clinica) {
    return null;
  }

  const plano = await prisma.plano.findUnique({
    where: { id: clinica.planoId },
  });

  if (!plano) {
    return null;
  }

  const [pagamentos, planos] = await Promise.all([
    prisma.pagamento.findMany({
      where: { tenantId: clinicaId },
      orderBy: { createdAt: "desc" },
      take: 12, // Últimos 12 pagamentos
    }),
    prisma.plano.findMany({
      where: { ativo: true },
      orderBy: { preco: "asc" },
    }),
  ]);

  // Verificar se há pagamento pendente para o mês atual
  const hoje = new Date();
  const mesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);

  const pagamentoPendente = await prisma.pagamento.findFirst({
    where: {
      tenantId: clinicaId,
      mesReferencia: {
        gte: mesAtual,
        lt: proximoMes,
      },
      status: StatusPagamento.PENDENTE,
    },
  });

  // Calcular estatísticas
  const pagamentosPagos = pagamentos.filter(
    (p) => p.status === StatusPagamento.PAGO
  ).length;
  const pagamentosPendentes = pagamentos.filter(
    (p) => p.status === StatusPagamento.PENDENTE
  ).length;
  const pagamentosVencidos = pagamentos.filter(
    (p) =>
      p.status === StatusPagamento.PENDENTE &&
      new Date(p.dataVencimento) < hoje
  ).length;

  return {
    clinica: {
      id: clinica.id,
      nome: clinica.nome,
      planoAtual: {
        id: plano.id,
        nome: plano.nome,
        preco: Number(plano.preco),
        tokensMensais: plano.tokensMensais,
        telemedicineHabilitada: plano.telemedicineHabilitada,
        descricao: plano.descricao,
      },
      dataExpiracao: clinica.dataExpiracao,
      status: clinica.status,
    },
    pagamentos: pagamentos.map((p) => ({
      id: p.id,
      valor: Number(p.valor),
      mesReferencia: p.mesReferencia,
      status: p.status,
      metodoPagamento: p.metodoPagamento,
      dataVencimento: p.dataVencimento,
      dataPagamento: p.dataPagamento,
      transacaoId: p.transacaoId,
      observacoes: p.observacoes,
      createdAt: p.createdAt,
    })),
    planos: planos.map((p) => ({
      id: p.id,
      nome: p.nome,
      preco: Number(p.preco),
      tokensMensais: p.tokensMensais,
      telemedicineHabilitada: p.telemedicineHabilitada,
      descricao: p.descricao,
    })),
    pagamentoPendente: pagamentoPendente
      ? {
          id: pagamentoPendente.id,
          valor: Number(pagamentoPendente.valor),
          mesReferencia: pagamentoPendente.mesReferencia,
          dataVencimento: pagamentoPendente.dataVencimento,
        }
      : null,
    estatisticas: {
      pagamentosPagos,
      pagamentosPendentes,
      pagamentosVencidos,
      total: pagamentos.length,
    },
  };
}

export default async function PagamentosPlanosPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const isAdminClinica = await hasUserType(TipoUsuario.ADMIN_CLINICA);

  if (!isAdminClinica) {
    redirect("/dashboard");
  }

  const clinicaId = await getUserClinicaId();

  if (!clinicaId) {
    redirect("/dashboard");
  }

  const data = await getPagamentosData(clinicaId);

  if (!data) {
    redirect("/dashboard");
  }

  return <PagamentosPlanosContent data={data} />;
}














