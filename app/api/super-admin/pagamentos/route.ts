import { NextRequest, NextResponse } from "next/server";
import { getSession, isSuperAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { StatusPagamento } from "@/lib/generated/prisma/enums";
import { registrarPagamento, confirmarPagamento } from "@/lib/pagamento-service";

// GET /api/super-admin/pagamentos
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const admin = await isSuperAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const status = searchParams.get("status");

    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (status) where.status = status;

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
      where,
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
      where: { id: { in: tenantIds } },
    });
    const tenantsMap = new Map(tenants.map(t => [t.id, t]));

    const planoIds = [...new Set(tenants.map(t => t.planoId))];
    const planos = await prisma.plano.findMany({
      where: { id: { in: planoIds } },
    });
    const planosMap = new Map(planos.map(p => [p.id, p]));

    const pagamentosComRelacoes = pagamentos.map(p => {
      const tenant = tenantsMap.get(p.tenantId);
      const plano = tenant ? planosMap.get(tenant.planoId) : null;
      return {
        ...p,
        tenant: tenant ? {
          ...tenant,
          plano: plano || null,
        } : null,
      };
    });

    return NextResponse.json({ pagamentos: pagamentosComRelacoes });
  } catch (error) {
    console.error("Erro ao listar pagamentos:", error);
    return NextResponse.json(
      { error: "Erro ao listar pagamentos" },
      { status: 500 }
    );
  }
}

// POST /api/super-admin/pagamentos
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const admin = await isSuperAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { tenantId, mesReferencia, valor, metodoPagamento, dataVencimento } =
      body;

    if (!tenantId || !mesReferencia) {
      return NextResponse.json(
        { error: "tenantId e mesReferencia são obrigatórios" },
        { status: 400 }
      );
    }

    const pagamento = await registrarPagamento(
      tenantId,
      new Date(mesReferencia),
      valor,
      metodoPagamento,
      dataVencimento ? new Date(dataVencimento) : undefined
    );

    return NextResponse.json(
      { pagamento, message: "Pagamento registrado com sucesso" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao registrar pagamento:", error);
    return NextResponse.json(
      { error: "Erro ao registrar pagamento" },
      { status: 500 }
    );
  }
}















