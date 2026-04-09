import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { auditLog } from "@/lib/audit-log";

/**
 * GET /api/paciente/dsar
 * Lista as solicitações DSAR do paciente logado.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.tipo !== TipoUsuario.PACIENTE) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const paciente = await prisma.paciente.findFirst({
      where: {
        usuarioId: session.user.id,
        clinicaId: session.user.clinicaId!,
        ativo: true,
      },
      select: { id: true },
    });

    if (!paciente) {
      return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
    }

    const solicitacoes = await prisma.solicitacaoDSAR.findMany({
      where: {
        pacienteId: paciente.id,
        clinicaId: session.user.clinicaId!,
      },
      orderBy: { criadoEm: "desc" },
    });

    return NextResponse.json({ solicitacoes });
  } catch (error) {
    console.error("Erro ao listar solicitações DSAR:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

/**
 * POST /api/paciente/dsar
 * Cria uma nova solicitação DSAR (EXPORTACAO, EXCLUSAO ou CORRECAO).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.tipo !== TipoUsuario.PACIENTE) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const paciente = await prisma.paciente.findFirst({
      where: {
        usuarioId: session.user.id,
        clinicaId: session.user.clinicaId!,
        ativo: true,
      },
      select: { id: true, nome: true },
    });

    if (!paciente) {
      return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const { tipo, motivo } = body;

    if (!tipo || !["EXPORTACAO", "EXCLUSAO", "CORRECAO"].includes(tipo)) {
      return NextResponse.json(
        { error: "Tipo inválido. Use: EXPORTACAO, EXCLUSAO ou CORRECAO" },
        { status: 400 }
      );
    }

    // Verificar se já existe solicitação pendente do mesmo tipo
    const existente = await prisma.solicitacaoDSAR.findFirst({
      where: {
        pacienteId: paciente.id,
        clinicaId: session.user.clinicaId!,
        tipo,
        status: { in: ["PENDENTE", "EM_ANALISE"] },
      },
    });

    if (existente) {
      return NextResponse.json(
        { error: "Já existe uma solicitação deste tipo em andamento" },
        { status: 409 }
      );
    }

    const solicitacao = await prisma.solicitacaoDSAR.create({
      data: {
        pacienteId: paciente.id,
        clinicaId: session.user.clinicaId!,
        tipo,
        motivo: motivo || null,
      },
    });

    const TIPO_LABELS: Record<string, string> = {
      EXPORTACAO: "Exportação de dados",
      EXCLUSAO: "Exclusão de dados",
      CORRECAO: "Correção de dados",
    };

    auditLog({
      userId: session.user.id,
      userTipo: session.user.tipo,
      clinicaId: session.user.clinicaId,
      action: "CREATE",
      resource: "Paciente",
      resourceId: paciente.id,
      details: {
        operacao: `Solicitação DSAR: ${TIPO_LABELS[tipo]}`,
        pacienteNome: paciente.nome,
        solicitacaoId: solicitacao.id,
        tipo,
      },
      req: request,
    });

    return NextResponse.json({ solicitacao }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar solicitação DSAR:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
