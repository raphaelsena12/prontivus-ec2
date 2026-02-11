import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";
import {
  sendEmail,
  gerarEmailCancelamentoAgendamento,
  gerarEmailCancelamentoAgendamentoTexto,
  gerarEmailAlteracaoAgendamento,
  gerarEmailAlteracaoAgendamentoTexto,
} from "@/lib/email";
import { gerarEmailMedico } from "@/lib/utils";

const atualizarAgendamentoSchema = z.object({
  pacienteId: z.string().uuid().optional(),
  medicoId: z.string().uuid().optional(),
  dataHora: z.string().transform((str) => new Date(str)).optional(),
  codigoTussId: z.string().uuid().optional(),
  tipoConsultaId: z.string().uuid().optional().nullable(),
  procedimentoId: z.string().uuid().optional().nullable(),
  operadoraId: z.string().uuid().optional().nullable(),
  planoSaudeId: z.string().uuid().optional().nullable(),
  numeroCarteirinha: z.string().optional().nullable(),
  valorCobrado: z.number().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  status: z.enum(["AGENDADA", "CONFIRMADA", "REALIZADA", "CANCELADA"]).optional(),
  motivoCancelamento: z.string().optional(),
  motivoAlteracao: z.string().optional(),
});

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

  if (session.user.tipo !== TipoUsuario.SECRETARIA && session.user.tipo !== TipoUsuario.ADMIN_CLINICA) {
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

  return { authorized: true, clinicaId };
}

// GET /api/secretaria/agendamentos/[id] - Buscar agendamento por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    // Tentar incluir procedimento, mas se o campo não existir no banco, fazer sem ele
    let agendamento;
    try {
      agendamento = await prisma.consulta.findFirst({
        where: {
          id,
          clinicaId: auth.clinicaId,
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
          procedimento: true,
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
    } catch (includeError: any) {
      // Se falhar ao incluir procedimento (campo pode não existir no banco), tentar sem ele
      if (includeError?.message?.includes("procedimento") || includeError?.code === "P2021") {
        console.warn("Campo procedimento não encontrado, buscando sem include de procedimento");
        agendamento = await prisma.consulta.findFirst({
          where: {
            id,
            clinicaId: auth.clinicaId,
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
      } else {
        throw includeError;
      }
    }

    if (!agendamento) {
      return NextResponse.json(
        { error: "Agendamento não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ consulta: agendamento }, { status: 200 });
  } catch (error: any) {
    console.error("Erro ao buscar agendamento:", error);
    
    // Verificar se o erro é relacionado ao campo procedimento não existir no banco
    if (error?.message?.includes("procedimento") || error?.code === "P2021") {
      return NextResponse.json(
        { 
          error: "Erro ao buscar agendamento. O campo 'procedimentoId' pode não existir no banco de dados. Execute a migração do Prisma: npx prisma migrate dev",
          details: error.message 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: "Erro ao buscar agendamento", details: error?.message || "Erro desconhecido" },
      { status: 500 }
    );
  }
}

// PATCH /api/secretaria/agendamentos/[id] - Atualizar agendamento
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;
    const body = await request.json();
    const validation = atualizarAgendamentoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Buscar agendamento atual para comparação
    // Tentar incluir procedimento, mas se o campo não existir no banco, fazer sem ele
    let agendamentoAtual;
    try {
      agendamentoAtual = await prisma.consulta.findFirst({
        where: {
          id,
          clinicaId: auth.clinicaId,
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
          procedimento: true,
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
    } catch (includeError: any) {
      // Se falhar ao incluir procedimento (campo pode não existir no banco), tentar sem ele
      if (includeError?.message?.includes("procedimento") || includeError?.code === "P2021") {
        console.warn("Campo procedimento não encontrado, buscando sem include de procedimento");
        agendamentoAtual = await prisma.consulta.findFirst({
          where: {
            id,
            clinicaId: auth.clinicaId,
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
      } else {
        throw includeError;
      }
    }

    if (!agendamentoAtual) {
      return NextResponse.json(
        { error: "Agendamento não encontrado" },
        { status: 404 }
      );
    }

    // Preparar dados para atualização
    const updateData: any = {};
    if (data.pacienteId) updateData.pacienteId = data.pacienteId;
    if (data.medicoId) updateData.medicoId = data.medicoId;
    if (data.dataHora) updateData.dataHora = data.dataHora;
    if (data.codigoTussId) updateData.codigoTussId = data.codigoTussId;
    if (data.tipoConsultaId !== undefined) updateData.tipoConsultaId = data.tipoConsultaId;
    if (data.procedimentoId !== undefined) updateData.procedimentoId = data.procedimentoId;
    if (data.operadoraId !== undefined) updateData.operadoraId = data.operadoraId;
    if (data.planoSaudeId !== undefined) updateData.planoSaudeId = data.planoSaudeId;
    if (data.numeroCarteirinha !== undefined) updateData.numeroCarteirinha = data.numeroCarteirinha;
    if (data.valorCobrado !== undefined) updateData.valorCobrado = data.valorCobrado;
    if (data.observacoes !== undefined) updateData.observacoes = data.observacoes;
    if (data.status) updateData.status = data.status;

    // Se a data/hora ou médico foi alterado, verificar conflitos e bloqueios
    if (data.dataHora || data.medicoId) {
      const medicoIdParaVerificar = data.medicoId || agendamentoAtual.medicoId;
      const dataHoraParaVerificar = data.dataHora ? new Date(data.dataHora) : agendamentoAtual.dataHora;

      // Duração padrão da consulta (30 minutos)
      const DURACAO_CONSULTA_MINUTOS = 30;
      const dataHoraInicio = new Date(dataHoraParaVerificar);
      const dataHoraFim = new Date(dataHoraInicio);
      dataHoraFim.setMinutes(dataHoraFim.getMinutes() + DURACAO_CONSULTA_MINUTOS);

      // Verificar conflitos com outros agendamentos (exceto o próprio agendamento que está sendo editado)
      const agendamentosMedico = await prisma.consulta.findMany({
        where: {
          clinicaId: auth.clinicaId,
          medicoId: medicoIdParaVerificar,
          id: {
            not: id, // Excluir o próprio agendamento que está sendo editado
          },
          status: {
            notIn: ["CANCELADA"], // Ignorar agendamentos cancelados
          },
        },
        include: {
          paciente: {
            select: {
              nome: true,
            },
          },
        },
      });

      // Verificar conflitos de horário
      for (const agendamentoExistente of agendamentosMedico) {
        const inicioExistente = new Date(agendamentoExistente.dataHora);
        const fimExistente = new Date(inicioExistente);
        fimExistente.setMinutes(fimExistente.getMinutes() + DURACAO_CONSULTA_MINUTOS);

        // Verificar se há sobreposição de horários
        const haConflito = 
          (dataHoraInicio >= inicioExistente && dataHoraInicio < fimExistente) || // Novo começa durante existente
          (dataHoraFim > inicioExistente && dataHoraFim <= fimExistente) || // Novo termina durante existente
          (dataHoraInicio <= inicioExistente && dataHoraFim >= fimExistente); // Novo engloba existente

        if (haConflito) {
          return NextResponse.json(
            {
              error: "Não é possível agendar neste horário. Já existe um agendamento para este médico neste período.",
              detalhes: {
                agendamentoExistente: {
                  paciente: agendamentoExistente.paciente?.nome || "Paciente",
                  dataHora: agendamentoExistente.dataHora,
                  status: agendamentoExistente.status,
                },
                horarioSolicitado: {
                  inicio: dataHoraInicio,
                  fim: dataHoraFim,
                },
              },
            },
            { status: 400 }
          );
        }
      }

      // Verificar bloqueios de agenda
      const bloqueios = await prisma.bloqueioAgenda.findMany({
        where: {
          clinicaId: auth.clinicaId,
          medicoId: medicoIdParaVerificar,
        },
      });

      // Verificar se há sobreposição com bloqueios
      for (const bloqueio of bloqueios) {
        const dataInicioBloqueio = new Date(
          `${bloqueio.dataInicio.toISOString().split("T")[0]}T${bloqueio.horaInicio}:00`
        );
        const dataFimBloqueio = new Date(
          `${bloqueio.dataFim.toISOString().split("T")[0]}T${bloqueio.horaFim}:00`
        );

        // Verificar se há sobreposição com o bloqueio
        const haConflitoBloqueio = 
          (dataHoraInicio >= dataInicioBloqueio && dataHoraInicio < dataFimBloqueio) ||
          (dataHoraFim > dataInicioBloqueio && dataHoraFim <= dataFimBloqueio) ||
          (dataHoraInicio <= dataInicioBloqueio && dataHoraFim >= dataFimBloqueio);

        if (haConflitoBloqueio) {
          return NextResponse.json(
            {
              error: "Não é possível agendar neste horário. Existe um bloqueio de agenda neste período.",
              detalhes: {
                dataInicio: dataInicioBloqueio,
                dataFim: dataFimBloqueio,
                observacoes: bloqueio.observacoes,
              },
            },
            { status: 400 }
          );
        }
      }
    }

    // Atualizar agendamento
    const agendamentoAtualizado = await prisma.consulta.update({
      where: { id },
      data: updateData,
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

    // Verificar se houve alteração de data/hora para enviar email
    const dataHoraAlterada = data.dataHora && 
      new Date(data.dataHora).getTime() !== agendamentoAtual.dataHora.getTime();

    // Enviar email de alteração se a data/hora foi alterada
    if (dataHoraAlterada && agendamentoAtualizado.paciente.email) {
      try {
        const emailHtml = gerarEmailAlteracaoAgendamento({
          pacienteNome: agendamentoAtualizado.paciente.nome,
          medicoNome: agendamentoAtualizado.medico.usuario.nome,
          dataHoraAnterior: agendamentoAtual.dataHora,
          dataHoraNova: agendamentoAtualizado.dataHora,
          tipoConsulta: agendamentoAtualizado.tipoConsulta?.nome,
          codigoTuss: agendamentoAtualizado.codigoTuss.codigoTuss,
          descricaoTuss: agendamentoAtualizado.codigoTuss.descricao,
          observacoes: agendamentoAtualizado.observacoes || undefined,
          clinicaNome: agendamentoAtualizado.clinica.nome,
          motivoAlteracao: data.motivoAlteracao,
        });

        const emailTexto = gerarEmailAlteracaoAgendamentoTexto({
          pacienteNome: agendamentoAtualizado.paciente.nome,
          medicoNome: agendamentoAtualizado.medico.usuario.nome,
          dataHoraAnterior: agendamentoAtual.dataHora,
          dataHoraNova: agendamentoAtualizado.dataHora,
          tipoConsulta: agendamentoAtualizado.tipoConsulta?.nome,
          codigoTuss: agendamentoAtualizado.codigoTuss.codigoTuss,
          descricaoTuss: agendamentoAtualizado.codigoTuss.descricao,
          observacoes: agendamentoAtualizado.observacoes || undefined,
          clinicaNome: agendamentoAtualizado.clinica.nome,
          motivoAlteracao: data.motivoAlteracao,
        });

        // Gerar email personalizado do médico no formato: medico@clinicanome.prontivus.com
        const emailMedico = gerarEmailMedico(
          agendamentoAtualizado.medico.usuario.nome,
          agendamentoAtualizado.clinica.nome
        );

        await sendEmail({
          to: agendamentoAtualizado.paciente.email,
          subject: "Alteração de Agendamento - Prontivus",
          html: emailHtml,
          text: emailTexto,
          from: emailMedico,
          fromName: agendamentoAtualizado.medico.usuario.nome,
        });

        console.log(`Email de alteração enviado para ${agendamentoAtualizado.paciente.email}`);
      } catch (emailError) {
        console.error("Erro ao enviar email de alteração:", emailError);
      }
    }

    return NextResponse.json({ consulta: agendamentoAtualizado }, { status: 200 });
  } catch (error) {
    console.error("Erro ao atualizar agendamento:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar agendamento" },
      { status: 500 }
    );
  }
}

// DELETE /api/secretaria/agendamentos/[id] - Cancelar agendamento
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    // Buscar agendamento antes de cancelar
    const agendamento = await prisma.consulta.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId,
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
        { error: "Agendamento não encontrado" },
        { status: 404 }
      );
    }

    // Verificar se já está cancelado
    if (agendamento.status === "CANCELADA") {
      return NextResponse.json(
        { error: "Agendamento já está cancelado" },
        { status: 400 }
      );
    }

    // Buscar motivo do cancelamento do body se fornecido
    let motivoCancelamento: string | undefined;
    try {
      const body = await request.json();
      if (body && typeof body === "object" && "motivoCancelamento" in body) {
        motivoCancelamento = body.motivoCancelamento;
      }
    } catch {
      // Body vazio ou inválido, continuar sem motivo
    }

    // Atualizar status para CANCELADA
    const agendamentoCancelado = await prisma.consulta.update({
      where: { id },
      data: {
        status: "CANCELADA",
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

    // Enviar email de cancelamento para o paciente
    if (agendamentoCancelado.paciente.email) {
      try {
        const emailHtml = gerarEmailCancelamentoAgendamento({
          pacienteNome: agendamentoCancelado.paciente.nome,
          medicoNome: agendamentoCancelado.medico.usuario.nome,
          dataHora: agendamentoCancelado.dataHora,
          tipoConsulta: agendamentoCancelado.tipoConsulta?.nome,
          codigoTuss: agendamentoCancelado.codigoTuss.codigoTuss,
          descricaoTuss: agendamentoCancelado.codigoTuss.descricao,
          observacoes: agendamentoCancelado.observacoes || undefined,
          clinicaNome: agendamentoCancelado.clinica.nome,
          motivoCancelamento,
        });

        const emailTexto = gerarEmailCancelamentoAgendamentoTexto({
          pacienteNome: agendamentoCancelado.paciente.nome,
          medicoNome: agendamentoCancelado.medico.usuario.nome,
          dataHora: agendamentoCancelado.dataHora,
          tipoConsulta: agendamentoCancelado.tipoConsulta?.nome,
          codigoTuss: agendamentoCancelado.codigoTuss.codigoTuss,
          descricaoTuss: agendamentoCancelado.codigoTuss.descricao,
          observacoes: agendamentoCancelado.observacoes || undefined,
          clinicaNome: agendamentoCancelado.clinica.nome,
          motivoCancelamento,
        });

        // Gerar email personalizado do médico no formato: medico@clinicanome.prontivus.com
        const emailMedico = gerarEmailMedico(
          agendamentoCancelado.medico.usuario.nome,
          agendamentoCancelado.clinica.nome
        );

        await sendEmail({
          to: agendamentoCancelado.paciente.email,
          subject: "Cancelamento de Agendamento - Prontivus",
          html: emailHtml,
          text: emailTexto,
          from: emailMedico,
          fromName: agendamentoCancelado.medico.usuario.nome,
        });

        console.log(`Email de cancelamento enviado para ${agendamentoCancelado.paciente.email}`);
      } catch (emailError) {
        console.error("Erro ao enviar email de cancelamento:", emailError);
      }
    } else {
      console.log(`Paciente ${agendamentoCancelado.paciente.nome} não possui email cadastrado`);
    }

    return NextResponse.json(
      { consulta: agendamentoCancelado },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro ao cancelar agendamento:", error);
    return NextResponse.json(
      { error: "Erro ao cancelar agendamento" },
      { status: 500 }
    );
  }
}

