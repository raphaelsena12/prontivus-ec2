import { NextRequest, NextResponse } from "next/server";
import { getSession, hasUserType, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario, StatusClinica } from "@/lib/generated/prisma";
import { registrarPagamento } from "@/lib/pagamento-service";

// POST /api/admin-clinica/planos/alterar - Altera o plano da clínica (upgrade/downgrade)
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
    const { planoId, gerarPagamento } = body;

    if (!planoId) {
      return NextResponse.json(
        { error: "planoId é obrigatório" },
        { status: 400 }
      );
    }

    // Buscar clínica atual
    const clinica = await prisma.tenant.findUnique({
      where: { id: clinicaId },
    });

    if (!clinica) {
      return NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 404 }
      );
    }

    // Buscar plano atual separadamente
    const planoAtual = await prisma.plano.findUnique({
      where: { id: clinica.planoId },
    });

    if (!planoAtual) {
      return NextResponse.json(
        { error: "Plano atual não encontrado" },
        { status: 404 }
      );
    }

    // Verificar se o plano existe
    const novoPlano = await prisma.plano.findUnique({
      where: { id: planoId },
    });

    if (!novoPlano || !novoPlano.ativo) {
      return NextResponse.json(
        { error: "Plano não encontrado ou inativo" },
        { status: 404 }
      );
    }

    // Verificar se já está no mesmo plano
    if (clinica.planoId === planoId) {
      return NextResponse.json(
        { error: "A clínica já está neste plano" },
        { status: 400 }
      );
    }

    // Calcular diferença de preço (se upgrade, cobrar diferença proporcional)
    const precoAtual = Number(planoAtual.preco);
    const precoNovo = Number(novoPlano.preco);
    const diferenca = precoNovo - precoAtual;

    // Atualizar plano da clínica
    const clinicaAtualizada = await prisma.tenant.update({
      where: { id: clinicaId },
      data: {
        planoId: planoId,
        tokensMensaisDisponiveis: novoPlano.tokensMensais,
        telemedicineHabilitada: novoPlano.telemedicineHabilitada,
        // Se downgrade, ajustar tokens consumidos se necessário
        tokensConsumidos:
          clinica.tokensConsumidos > novoPlano.tokensMensais
            ? novoPlano.tokensMensais
            : clinica.tokensConsumidos,
      },
    });

    // Se gerarPagamento for true e houver diferença de preço, gerar pagamento
    let pagamento = null;
    if (gerarPagamento && diferenca !== 0) {
      const hoje = new Date();
      const mesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

      // Calcular valor proporcional do restante do mês
      const diasRestantes = new Date(
        hoje.getFullYear(),
        hoje.getMonth() + 1,
        0
      ).getDate();
      const diaAtual = hoje.getDate();
      const diasProporcionais = diasRestantes - diaAtual + 1;
      const valorProporcional = (diferenca / diasRestantes) * diasProporcionais;

      if (Math.abs(valorProporcional) > 0.01) {
        // Só gerar se a diferença for significativa
        pagamento = await registrarPagamento(
          clinicaId,
          mesAtual,
          Math.abs(valorProporcional),
          "BOLETO"
        );
      }
    }

    return NextResponse.json({
      clinica: {
        ...clinicaAtualizada,
        plano: novoPlano,
      },
      pagamento,
      message: "Plano alterado com sucesso",
    });
  } catch (error) {
    console.error("Erro ao alterar plano:", error);
    return NextResponse.json(
      { error: "Erro ao alterar plano" },
      { status: 500 }
    );
  }
}














