import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";
import { verificarAceitacaoTuss, validarVigenciaTuss } from "@/lib/tuss-helpers";
import {
  sendEmail,
  gerarEmailConfirmacaoAgendamento,
  gerarEmailConfirmacaoAgendamentoTexto,
} from "@/lib/email";
import { gerarEmailMedico } from "@/lib/utils";

const agendamentoSchema = z.object({
  pacienteId: z.string().uuid(),
  medicoId: z.string().uuid(),
  dataHora: z.string().transform((str) => new Date(str)),
  codigoTussId: z.string().uuid(),
  tipoConsultaId: z.string().uuid().optional(),
  procedimentoId: z.string().uuid().optional().nullable(),
  operadoraId: z.string().uuid().optional().nullable(),
  planoSaudeId: z.string().uuid().optional().nullable(),
  numeroCarteirinha: z.string().optional(),
  valorCobrado: z.number().optional().nullable(),
  observacoes: z.string().optional(),
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

// GET /api/secretaria/agendamentos
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const date = searchParams.get("date");
    const medicoId = searchParams.get("medicoId");

    const where: any = {
      clinicaId: auth.clinicaId,
      ...(medicoId && { medicoId }),
      ...(search && {
        OR: [
          { paciente: { nome: { contains: search, mode: "insensitive" as const } } },
          { medico: { usuario: { nome: { contains: search, mode: "insensitive" as const } } } },
        ],
      }),
      ...(date && {
        dataHora: {
          gte: new Date(date + "T00:00:00"),
          lt: new Date(date + "T23:59:59"),
        },
      }),
    };

    // Tentar incluir procedimento, mas se o campo não existir no banco, fazer sem ele
    let agendamentos;
    try {
      agendamentos = await prisma.consulta.findMany({
        where,
        include: {
          paciente: {
            select: {
              id: true,
              nome: true,
              cpf: true,
              telefone: true,
              celular: true,
            },
          },
          medico: {
            include: {
              usuario: {
                select: {
                  nome: true,
                },
              },
            },
          },
          codigoTuss: {
            select: {
              codigoTuss: true,
              descricao: true,
            },
          },
          tipoConsulta: true,
          procedimento: true,
          operadora: true,
          planoSaude: true,
        },
        orderBy: { dataHora: "asc" },
      });
    } catch (includeError: any) {
      // Se falhar ao incluir procedimento (campo pode não existir no banco), tentar sem ele
      if (includeError?.message?.includes("procedimento") || includeError?.code === "P2021") {
        console.warn("Campo procedimento não encontrado, buscando sem include de procedimento");
        agendamentos = await prisma.consulta.findMany({
          where,
          include: {
            paciente: {
              select: {
                id: true,
                nome: true,
                cpf: true,
                telefone: true,
                celular: true,
              },
            },
            medico: {
              include: {
                usuario: {
                  select: {
                    nome: true,
                  },
                },
              },
            },
            codigoTuss: {
              select: {
                codigoTuss: true,
                descricao: true,
              },
            },
            tipoConsulta: true,
            operadora: true,
            planoSaude: true,
          },
          orderBy: { dataHora: "asc" },
        });
      } else {
        throw includeError;
      }
    }

    return NextResponse.json({ agendamentos });
  } catch (error: any) {
    console.error("Erro ao listar agendamentos:", error);
    
    // Verificar se o erro é relacionado ao campo procedimento não existir no banco
    if (error?.message?.includes("procedimento") || error?.code === "P2021") {
      return NextResponse.json(
        { 
          error: "Erro ao listar agendamentos. O campo 'procedimentoId' pode não existir no banco de dados. Execute a migração do Prisma: npx prisma migrate dev",
          details: error.message 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: "Erro ao listar agendamentos", details: error?.message || "Erro desconhecido" },
      { status: 500 }
    );
  }
}

// POST /api/secretaria/agendamentos
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await request.json();
    const validation = agendamentoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Validar vigência do código TUSS
    const validacaoVigencia = await validarVigenciaTuss(
      data.codigoTussId,
      data.dataHora
    );

    if (!validacaoVigencia.valido) {
      return NextResponse.json(
        {
          error: "Código TUSS inválido",
          motivo: validacaoVigencia.motivo,
        },
        { status: 400 }
      );
    }

    // Verificar se código TUSS é aceito pela operadora/plano
    const aceitacao = await verificarAceitacaoTuss(
      data.codigoTussId,
      data.operadoraId || null,
      data.planoSaudeId || null
    );

    if (!aceitacao.aceito) {
      return NextResponse.json(
        {
          error: "Código TUSS não aceito",
          motivo: aceitacao.motivo,
        },
        { status: 400 }
      );
    }

    // Verificar se paciente e médico pertencem à clínica
    const [paciente, medico] = await Promise.all([
      prisma.paciente.findFirst({
        where: {
          id: data.pacienteId,
          clinicaId: auth.clinicaId,
        },
      }),
      prisma.medico.findFirst({
        where: {
          id: data.medicoId,
          clinicaId: auth.clinicaId,
        },
      }),
    ]);

    if (!paciente) {
      return NextResponse.json(
        { error: "Paciente não encontrado" },
        { status: 404 }
      );
    }

    if (!medico) {
      return NextResponse.json(
        { error: "Médico não encontrado" },
        { status: 404 }
      );
    }

    // Duração padrão da consulta (30 minutos)
    const DURACAO_CONSULTA_MINUTOS = 30;
    const dataHoraInicio = new Date(data.dataHora);
    const dataHoraFim = new Date(dataHoraInicio);
    dataHoraFim.setMinutes(dataHoraFim.getMinutes() + DURACAO_CONSULTA_MINUTOS);

    // Buscar todos os agendamentos do médico que não estão cancelados
    const agendamentosMedico = await prisma.consulta.findMany({
      where: {
        clinicaId: auth.clinicaId,
        medicoId: data.medicoId,
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
      // Conflito ocorre quando:
      // 1. Novo agendamento começa durante um existente (inicioNovo >= inicioExistente && inicioNovo < fimExistente)
      // 2. Novo agendamento termina durante um existente (fimNovo > inicioExistente && fimNovo <= fimExistente)
      // 3. Novo agendamento engloba um existente (inicioNovo <= inicioExistente && fimNovo >= fimExistente)
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

    // Verificar se existe bloqueio de agenda no horário do agendamento
    const bloqueios = await prisma.bloqueioAgenda.findMany({
      where: {
        clinicaId: auth.clinicaId,
        medicoId: data.medicoId,
      },
    });

    // Verificar se o horário do agendamento está dentro de algum bloqueio
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

    if (!auth.clinicaId) {
      return NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 404 }
      );
    }

    const consulta = await prisma.consulta.create({
      data: {
        clinicaId: auth.clinicaId,
        pacienteId: data.pacienteId,
        medicoId: data.medicoId,
        dataHora: data.dataHora,
        codigoTussId: data.codigoTussId,
        tipoConsultaId: data.tipoConsultaId,
        procedimentoId: data.procedimentoId,
        operadoraId: data.operadoraId,
        planoSaudeId: data.planoSaudeId,
        numeroCarteirinha: data.numeroCarteirinha,
        valorCobrado: data.valorCobrado,
        observacoes: data.observacoes,
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

    // Enviar email de confirmação para o paciente (não bloqueia a resposta)
    if (consulta.paciente.email) {
      try {
        const emailHtml = gerarEmailConfirmacaoAgendamento({
          pacienteNome: consulta.paciente.nome,
          medicoNome: consulta.medico.usuario.nome,
          dataHora: consulta.dataHora,
          tipoConsulta: consulta.tipoConsulta?.nome,
          codigoTuss: consulta.codigoTuss.codigoTuss,
          descricaoTuss: consulta.codigoTuss.descricao,
          observacoes: consulta.observacoes || undefined,
          clinicaNome: consulta.clinica.nome,
        });

        const emailTexto = gerarEmailConfirmacaoAgendamentoTexto({
          pacienteNome: consulta.paciente.nome,
          medicoNome: consulta.medico.usuario.nome,
          dataHora: consulta.dataHora,
          tipoConsulta: consulta.tipoConsulta?.nome,
          codigoTuss: consulta.codigoTuss.codigoTuss,
          descricaoTuss: consulta.codigoTuss.descricao,
          observacoes: consulta.observacoes || undefined,
          clinicaNome: consulta.clinica.nome,
        });

        // Gerar email personalizado do médico no formato: medico@clinicanome.prontivus.com
        const emailMedico = gerarEmailMedico(
          consulta.medico.usuario.nome,
          consulta.clinica.nome
        );

        await sendEmail({
          to: consulta.paciente.email,
          subject: "Confirmação de Agendamento - Prontivus",
          html: emailHtml,
          text: emailTexto,
          from: emailMedico,
          fromName: consulta.medico.usuario.nome,
        });

        console.log(`Email de confirmação enviado para ${consulta.paciente.email}`);
      } catch (emailError) {
        // Log do erro mas não falha a criação do agendamento
        console.error("Erro ao enviar email de confirmação:", emailError);
      }
    } else {
      console.log(`Paciente ${consulta.paciente.nome} não possui email cadastrado`);
    }

    return NextResponse.json({ consulta }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar agendamento:", error);
    return NextResponse.json(
      { error: "Erro ao criar agendamento" },
      { status: 500 }
    );
  }
}

