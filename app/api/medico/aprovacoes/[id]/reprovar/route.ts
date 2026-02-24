import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

async function checkAuthorization() {
  const session = await getSession();

  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      ),
    };
  }

  if (session.user.tipo !== TipoUsuario.MEDICO) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      ),
    };
  }

  const clinicaId = await getUserClinicaId();
  if (!clinicaId) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 403 }
      ),
    };
  }

  // Buscar o médico associado ao usuário
  const medico = await prisma.medico.findFirst({
    where: {
      usuarioId: session.user.id,
      clinicaId,
    },
  });

  if (!medico) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Médico não encontrado" },
        { status: 404 }
      ),
    };
  }

  return { authorized: true, clinicaId, medicoId: medico.id };
}

const reprovarSchema = z.object({
  motivo: z.string().optional(),
});

// POST /api/medico/aprovacoes/[id]/reprovar - Reprovar agendamento
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    // Buscar body com motivo (opcional)
    let motivo: string | undefined;
    try {
      const body = await request.json();
      const validation = reprovarSchema.safeParse(body);
      if (validation.success) {
        motivo = validation.data.motivo;
      }
    } catch {
      // Body vazio ou inválido, continuar sem motivo
    }

    // Buscar agendamento
    const agendamento = await prisma.consulta.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId,
        medicoId: auth.medicoId,
        status: "AGUARDANDO_APROVACAO",
      },
    });

    if (!agendamento) {
      return NextResponse.json(
        { error: "Agendamento não encontrado ou já foi processado" },
        { status: 404 }
      );
    }

    // Atualizar status para CANCELADA e adicionar motivo nas observações
    const observacoesAtualizadas = motivo
      ? `${agendamento.observacoes || ''}\n\n[Reprovado pelo médico. Motivo: ${motivo}]`.trim()
      : `${agendamento.observacoes || ''}\n\n[Reprovado pelo médico]`.trim();

    const agendamentoReprovado = await prisma.consulta.update({
      where: { id },
      data: {
        status: "CANCELADA",
        observacoes: observacoesAtualizadas,
      },
      include: {
        paciente: true,
        medico: {
          include: {
            usuario: true,
          },
        },
        codigoTuss: true,
        tipoConsulta: true,
        operadora: true,
        planoSaude: true,
      },
    });

    return NextResponse.json({ consulta: agendamentoReprovado }, { status: 200 });
  } catch (error) {
    console.error("Erro ao reprovar agendamento:", error);
    return NextResponse.json(
      { error: "Erro ao reprovar agendamento" },
      { status: 500 }
    );
  }
}
