import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";

// GET /api/medico/pacientes/[id]/historico-consulta?limit=3&excluirConsultaId=uuid
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.user.tipo !== TipoUsuario.MEDICO) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const clinicaId = await getUserClinicaId();
    if (!clinicaId) {
      return NextResponse.json({ error: "Clínica não encontrada" }, { status: 403 });
    }

    const { id: pacienteId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "3", 10), 10);
    const excluirConsultaId = searchParams.get("excluirConsultaId");

    // Buscar últimas N consultas REALIZADAS do paciente
    const consultas = await prisma.consulta.findMany({
      where: {
        pacienteId,
        clinicaId,
        status: "REALIZADA",
        ...(excluirConsultaId ? { NOT: { id: excluirConsultaId } } : {}),
      },
      orderBy: { dataHora: "desc" },
      take: limit,
      select: {
        id: true,
        dataHora: true,
        consultaCids: {
          select: { code: true, description: true },
          orderBy: { createdAt: "asc" },
        },
        consultaExames: {
          select: { nome: true, tipo: true },
          orderBy: { createdAt: "asc" },
        },
        consultaPrescricoes: {
          select: { medicamento: true, dosagem: true, posologia: true, duracao: true },
          orderBy: { createdAt: "asc" },
        },
        // Fallback: dados legados
        prescricoesMedicamentos: {
          select: {
            posologia: true,
            observacoes: true,
            medicamento: { select: { nome: true, concentracao: true, unidade: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        solicitacoesExames: {
          select: {
            exame: { select: { nome: true, tipo: true } },
          },
          orderBy: { dataSolicitacao: "asc" },
        },
      },
    });

    const resultado = consultas.map((c) => {
      // Priorizar dados novos; fallback para tabelas legadas quando novas estão vazias
      const cids = c.consultaCids;
      const exames = c.consultaExames.length > 0
        ? c.consultaExames
        : c.solicitacoesExames.map((s) => ({ nome: s.exame.nome, tipo: s.exame.tipo }));
      const prescricoes = c.consultaPrescricoes.length > 0
        ? c.consultaPrescricoes
        : c.prescricoesMedicamentos.map((p) => ({
            medicamento: p.medicamento.nome,
            dosagem: p.medicamento.concentracao && p.medicamento.unidade
              ? `${p.medicamento.concentracao}${p.medicamento.unidade}`
              : null,
            posologia: p.posologia,
            duracao: p.observacoes || null,
          }));
      return {
        consultaId: c.id,
        dataHora: c.dataHora,
        cids,
        exames,
        prescricoes,
      };
    });

    // Retornar apenas consultas com pelo menos um item para repetir
    const comItens = resultado.filter(
      (c) => c.cids.length > 0 || c.exames.length > 0 || c.prescricoes.length > 0
    );

    return NextResponse.json(comItens, { status: 200 });
  } catch (error) {
    console.error("Erro ao buscar histórico de consulta:", error);
    return NextResponse.json({ error: "Erro ao buscar histórico" }, { status: 500 });
  }
}
