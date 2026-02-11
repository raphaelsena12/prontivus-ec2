import { NextRequest, NextResponse } from "next/server";
import { getSession, hasUserType, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario, StatusPagamento } from "@/lib/generated/prisma";
import { registrarPagamento } from "@/lib/pagamento-service";

// GET /api/admin-clinica/pagamentos - Lista pagamentos da clínica
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const isAdminClinica = await hasUserType(TipoUsuario.ADMIN_CLINICA);
    if (!isAdminClinica) {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      );
    }

    const clinicaId = await getUserClinicaId();
    if (!clinicaId) {
      return NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: any = { tenantId: clinicaId };
    if (status) {
      where.status = status;
    }

    const pagamentos = await prisma.pagamento.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ pagamentos });
  } catch (error) {
    console.error("Erro ao listar pagamentos:", error);
    return NextResponse.json(
      { error: "Erro ao listar pagamentos" },
      { status: 500 }
    );
  }
}

// POST /api/admin-clinica/pagamentos - Gera novo pagamento
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const isAdminClinica = await hasUserType(TipoUsuario.ADMIN_CLINICA);
    if (!isAdminClinica) {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      );
    }

    const clinicaId = await getUserClinicaId();
    if (!clinicaId) {
      return NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { mesReferencia, metodoPagamento } = body;

    // Buscar clínica e plano atual
    const clinica = await prisma.tenant.findUnique({
      where: { id: clinicaId },
    });

    if (!clinica) {
      return NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 404 }
      );
    }

    // Buscar plano separadamente
    const plano = await prisma.plano.findUnique({
      where: { id: clinica.planoId },
    });

    if (!plano) {
      return NextResponse.json(
        { error: "Plano não encontrado" },
        { status: 404 }
      );
    }

    // Se não informado, usar mês atual
    const mes = mesReferencia
      ? new Date(mesReferencia)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    // Verificar se já existe pagamento para este mês
    const pagamentoExistente = await prisma.pagamento.findFirst({
      where: {
        tenantId: clinicaId,
        mesReferencia: {
          gte: new Date(mes.getFullYear(), mes.getMonth(), 1),
          lt: new Date(mes.getFullYear(), mes.getMonth() + 1, 1),
        },
        status: {
          in: [StatusPagamento.PENDENTE, StatusPagamento.PAGO],
        },
      },
    });

    if (pagamentoExistente) {
      return NextResponse.json(
        { error: "Já existe um pagamento para este mês" },
        { status: 400 }
      );
    }

    // Gerar pagamento
    const pagamento = await registrarPagamento(
      clinicaId,
      mes,
      Number(plano.preco),
      metodoPagamento || "BOLETO"
    );

    return NextResponse.json(
      { pagamento, message: "Pagamento gerado com sucesso" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Erro ao gerar pagamento:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao gerar pagamento" },
      { status: 500 }
    );
  }
}

