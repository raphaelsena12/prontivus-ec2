import { redirect } from "next/navigation";
import { getSession, isSuperAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { PagamentosContent } from "./pagamentos-content";

async function getPagamentos() {
  const pagamentos = await prisma.pagamento.findMany({
    select: {
      id: true,
      tenantId: true,
      valor: true,
      mesReferencia: true,
      status: true,
      metodoPagamento: true,
      transacaoId: true,
      dataPagamento: true,
      dataVencimento: true,
      observacoes: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Buscar tenants e planos separadamente
  const tenantIds = [...new Set(pagamentos.map(p => p.tenantId))];
  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      nome: true,
      cnpj: true,
      planoId: true,
    },
    where: {
      id: { in: tenantIds },
    },
  });
  const tenantsMap = new Map(tenants.map(t => [t.id, t]));

  const planoIds = [...new Set(tenants.map(t => t.planoId))];
  const planos = await prisma.plano.findMany({
    where: {
      id: { in: planoIds },
    },
  });
  const planosMap = new Map(planos.map(p => [p.id, p]));

  return pagamentos.map((p) => {
    const tenant = tenantsMap.get(p.tenantId);
    const plano = tenant ? planosMap.get(tenant.planoId) : null;
    return {
      id: p.id,
      tenantId: p.tenantId,
      clinicaNome: tenant?.nome || '',
      clinicaCnpj: tenant?.cnpj || '',
      valor: Number(p.valor),
      mesReferencia: p.mesReferencia,
      status: p.status,
      metodoPagamento: p.metodoPagamento,
      transacaoId: p.transacaoId,
      dataPagamento: p.dataPagamento,
      dataVencimento: p.dataVencimento,
      observacoes: p.observacoes,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      planoNome: plano?.nome || '',
    };
  });
}

async function getClinicas() {
  const clinicas = await prisma.tenant.findMany({
    select: {
      id: true,
      nome: true,
      planoId: true,
    },
    orderBy: {
      nome: "asc",
    },
  });

  // Buscar planos separadamente
  const planoIds = [...new Set(clinicas.map(c => c.planoId))];
  const planos = await prisma.plano.findMany({
    where: {
      id: { in: planoIds },
    },
  });
  const planosMap = new Map(planos.map(p => [p.id, p]));

  return clinicas
    .filter((clinica) => {
      const plano = planosMap.get(clinica.planoId);
      return plano !== undefined;
    })
    .map((clinica) => {
      const plano = planosMap.get(clinica.planoId)!;
      return {
        id: clinica.id,
        nome: clinica.nome,
        plano: {
          id: plano.id,
          preco: Number(plano.preco),
        },
      };
    });
}

export default async function PagamentosPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const admin = await isSuperAdmin();
  if (!admin) {
    redirect("/dashboard");
  }

  const [pagamentos, clinicas] = await Promise.all([
    getPagamentos(),
    getClinicas(),
  ]);

  return <PagamentosContent pagamentos={pagamentos} clinicas={clinicas} />;
}

