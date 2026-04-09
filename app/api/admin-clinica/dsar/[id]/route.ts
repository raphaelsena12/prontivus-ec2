import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { auditLog } from "@/lib/audit-log";

/**
 * PATCH /api/admin-clinica/dsar/[id]
 * Atualiza o status de uma solicitação DSAR (admin responde).
 * Body: { status: "EM_ANALISE" | "CONCLUIDA" | "RECUSADA", respostaAdmin?: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.user.tipo !== TipoUsuario.ADMIN_CLINICA) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const clinicaId = await getUserClinicaId();
    if (!clinicaId) {
      return NextResponse.json({ error: "Clínica não encontrada" }, { status: 403 });
    }

    const { id } = await params;

    const solicitacao = await prisma.solicitacaoDSAR.findFirst({
      where: { id, clinicaId },
      include: {
        paciente: { select: { nome: true } },
      },
    });

    if (!solicitacao) {
      return NextResponse.json({ error: "Solicitação não encontrada" }, { status: 404 });
    }

    const body = await request.json();
    const { status, respostaAdmin } = body;

    const validTransitions: Record<string, string[]> = {
      PENDENTE: ["EM_ANALISE", "CONCLUIDA", "RECUSADA"],
      EM_ANALISE: ["CONCLUIDA", "RECUSADA"],
    };

    const allowed = validTransitions[solicitacao.status];
    if (!allowed || !allowed.includes(status)) {
      return NextResponse.json(
        { error: `Transição de "${solicitacao.status}" para "${status}" não permitida` },
        { status: 400 }
      );
    }

    const now = new Date();
    const updated = await prisma.solicitacaoDSAR.update({
      where: { id },
      data: {
        status,
        respostaAdmin: respostaAdmin || null,
        adminId: session.user.id,
        analisadoEm: status === "EM_ANALISE" ? now : solicitacao.analisadoEm || now,
        concluidoEm: ["CONCLUIDA", "RECUSADA"].includes(status) ? now : undefined,
      },
    });

    const TIPO_LABELS: Record<string, string> = {
      EXPORTACAO: "Exportação de dados",
      EXCLUSAO: "Exclusão de dados",
      CORRECAO: "Correção de dados",
    };

    const STATUS_LABELS: Record<string, string> = {
      EM_ANALISE: "Em análise",
      CONCLUIDA: "Concluída",
      RECUSADA: "Recusada",
    };

    auditLog({
      userId: session.user.id,
      userTipo: session.user.tipo,
      clinicaId,
      action: "UPDATE",
      resource: "Paciente",
      resourceId: solicitacao.pacienteId,
      details: {
        operacao: `DSAR ${TIPO_LABELS[solicitacao.tipo]} — Status: ${STATUS_LABELS[status]}`,
        pacienteNome: solicitacao.paciente.nome,
        solicitacaoId: id,
        statusAnterior: solicitacao.status,
        novoStatus: status,
        respostaAdmin: respostaAdmin || null,
      },
      req: request,
    });

    return NextResponse.json({ solicitacao: updated });
  } catch (error) {
    console.error("Erro ao atualizar solicitação DSAR:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
