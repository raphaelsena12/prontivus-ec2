import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";

/**
 * GET /api/admin-clinica/dsar
 * Lista todas as solicitações DSAR da clínica.
 * Query params: ?status=PENDENTE|EM_ANALISE|CONCLUIDA|RECUSADA&tipo=EXPORTACAO|EXCLUSAO|CORRECAO
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.tipo !== TipoUsuario.ADMIN_CLINICA) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const clinicaId = await getUserClinicaId();
    if (!clinicaId) {
      return NextResponse.json({ error: "Clínica não encontrada" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");
    const tipoFilter = searchParams.get("tipo");
    const search = searchParams.get("search")?.trim();

    const solicitacoes = await prisma.solicitacaoDSAR.findMany({
      where: {
        clinicaId,
        ...(statusFilter && { status: statusFilter }),
        ...(tipoFilter && { tipo: tipoFilter }),
        ...(search && {
          paciente: {
            OR: [
              { nome: { contains: search, mode: "insensitive" as const } },
              { cpf: { contains: search } },
            ],
          },
        }),
      },
      include: {
        paciente: {
          select: {
            id: true,
            nome: true,
            cpf: true,
            email: true,
          },
        },
      },
      orderBy: { criadoEm: "desc" },
    });

    const stats = {
      total: solicitacoes.length,
      pendentes: solicitacoes.filter((s) => s.status === "PENDENTE").length,
      emAnalise: solicitacoes.filter((s) => s.status === "EM_ANALISE").length,
      concluidas: solicitacoes.filter((s) => s.status === "CONCLUIDA").length,
      recusadas: solicitacoes.filter((s) => s.status === "RECUSADA").length,
    };

    return NextResponse.json({ solicitacoes, stats });
  } catch (error) {
    console.error("Erro ao listar solicitações DSAR:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
