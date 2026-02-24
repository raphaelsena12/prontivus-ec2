import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import {
  sendEmail,
  gerarEmailConfirmacaoAgendamento,
  gerarEmailConfirmacaoAgendamentoTexto,
} from "@/lib/email";
import { gerarEmailMedico } from "@/lib/utils";

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

// POST /api/medico/aprovacoes/[id]/aprovar - Aprovar agendamento
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

    // Buscar agendamento
    const agendamento = await prisma.consulta.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId,
        medicoId: auth.medicoId,
        status: "AGUARDANDO_APROVACAO",
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
        clinica: {
          select: {
            nome: true,
            email: true,
          },
        },
      },
    });

    if (!agendamento) {
      return NextResponse.json(
        { error: "Agendamento não encontrado ou já foi processado" },
        { status: 404 }
      );
    }

    // Atualizar status para AGENDADA
    const agendamentoAprovado = await prisma.consulta.update({
      where: { id },
      data: {
        status: "AGENDADA",
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
        clinica: {
          select: {
            nome: true,
            email: true,
          },
        },
      },
    });

    // Enviar email de confirmação para o paciente
    if (agendamentoAprovado.paciente.email) {
      try {
        const emailHtml = gerarEmailConfirmacaoAgendamento({
          pacienteNome: agendamentoAprovado.paciente.nome,
          medicoNome: agendamentoAprovado.medico.usuario.nome,
          dataHora: agendamentoAprovado.dataHora,
          tipoConsulta: agendamentoAprovado.tipoConsulta?.nome,
          codigoTuss: agendamentoAprovado.codigoTuss.codigoTuss,
          descricaoTuss: agendamentoAprovado.codigoTuss.descricao,
          observacoes: agendamentoAprovado.observacoes || undefined,
          clinicaNome: agendamentoAprovado.clinica.nome,
        });

        const emailTexto = gerarEmailConfirmacaoAgendamentoTexto({
          pacienteNome: agendamentoAprovado.paciente.nome,
          medicoNome: agendamentoAprovado.medico.usuario.nome,
          dataHora: agendamentoAprovado.dataHora,
          tipoConsulta: agendamentoAprovado.tipoConsulta?.nome,
          codigoTuss: agendamentoAprovado.codigoTuss.codigoTuss,
          descricaoTuss: agendamentoAprovado.codigoTuss.descricao,
          observacoes: agendamentoAprovado.observacoes || undefined,
          clinicaNome: agendamentoAprovado.clinica.nome,
        });

        // Gerar email personalizado do médico no formato: medico@clinicanome.prontivus.com
        const emailMedico = gerarEmailMedico(
          agendamentoAprovado.medico.usuario.nome,
          agendamentoAprovado.clinica.nome
        );

        await sendEmail({
          to: agendamentoAprovado.paciente.email,
          subject: "Confirmação de Agendamento - Prontivus",
          html: emailHtml,
          text: emailTexto,
          from: emailMedico,
          fromName: agendamentoAprovado.medico.usuario.nome,
        });

        console.log(`Email de confirmação enviado para ${agendamentoAprovado.paciente.email}`);
      } catch (emailError) {
        console.error("Erro ao enviar email de confirmação:", emailError);
      }
    }

    return NextResponse.json({ consulta: agendamentoAprovado }, { status: 200 });
  } catch (error) {
    console.error("Erro ao aprovar agendamento:", error);
    return NextResponse.json(
      { error: "Erro ao aprovar agendamento" },
      { status: 500 }
    );
  }
}
