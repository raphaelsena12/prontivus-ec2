import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";
import { verificarAceitacaoTuss, validarVigenciaTuss } from "@/lib/tuss-helpers";
import { uploadPDFToS3, areAwsCredentialsConfigured } from "@/lib/s3-service";
import {
  sendEmail,
  gerarEmailConfirmacaoAgendamento,
  gerarEmailConfirmacaoAgendamentoTexto,
} from "@/lib/email";
import { gerarEmailMedico } from "@/lib/utils";
import { getClinicaWhatsAppService } from "@/lib/whatsapp";
import { horarioEstaDentroDasFaixas, obterFaixasAgendaMedicoParaData } from "@/lib/medico-escala";

const agendamentoSchema = z.object({
  pacienteId: z.string().uuid(),
  medicoId: z.string().uuid(),
  dataHora: z.string().transform((str) => new Date(str)),
  dataHoraFim: z.string().transform((str) => new Date(str)).optional(),
  codigoTussId: z.string().uuid().optional().nullable(),
  tipoConsultaId: z.string().uuid().optional(),
  procedimentoId: z.string().uuid().optional().nullable(),
  formaPagamentoId: z.string().uuid().optional().nullable(),
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
      status: {
        notIn: ["CANCELADA"], // Excluir agendamentos cancelados
      },
      ...(medicoId && { medicoId }),
      ...(search && {
        OR: [
          { paciente: { nome: { contains: search, mode: "insensitive" as const } } },
          { medico: { usuario: { nome: { contains: search, mode: "insensitive" as const } } } },
        ],
      }),
      ...(date && {
        dataHora: {
          gte: new Date(date + "T00:00:00-03:00"),
          lt: new Date(date + "T23:59:59-03:00"),
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
          formaPagamento: true,
          operadora: true,
          planoSaude: true,
        },
        orderBy: { dataHora: "desc" },
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
          orderBy: { dataHora: "desc" },
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

    const contentType = request.headers.get("content-type") || "";
    let body: any;
    let anexosFiles: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = (await request.formData()) as any;
      const fd = (key: string) => formData.get(key) as string | null;
      body = {
        pacienteId: fd("pacienteId") ?? undefined,
        medicoId: fd("medicoId") ?? undefined,
        dataHora: fd("dataHora") ?? undefined,
        dataHoraFim: fd("dataHoraFim") ?? undefined,
        codigoTussId: fd("codigoTussId") ?? undefined,
        tipoConsultaId: fd("tipoConsultaId") ?? undefined,
        procedimentoId: fd("procedimentoId") ?? null,
        formaPagamentoId: fd("formaPagamentoId") ?? null,
        operadoraId: fd("operadoraId") ?? null,
        planoSaudeId: fd("planoSaudeId") ?? null,
        numeroCarteirinha: fd("numeroCarteirinha") ?? undefined,
        valorCobrado: fd("valorCobrado") ? parseFloat(fd("valorCobrado")!) : null,
        observacoes: fd("observacoes") ?? undefined,
      };
      const anexosFormData = formData.getAll("anexos");
      anexosFiles = anexosFormData.filter((item: any): item is File => item instanceof File);
    } else {
      body = await request.json();
    }

    const validation = agendamentoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Validar vigência do código TUSS (apenas quando informado)
    if (data.codigoTussId) {
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
        auth.clinicaId!,
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

    const dataHoraInicio = new Date(data.dataHora);
    const dataHoraFim = data.dataHoraFim ? new Date(data.dataHoraFim) : (() => {
      const fim = new Date(dataHoraInicio);
      fim.setMinutes(fim.getMinutes() + 30);
      return fim;
    })();
    const inicioHHMM = dataHoraInicio.toLocaleTimeString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
    const fimHHMM = dataHoraFim.toLocaleTimeString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });

    const faixasPermitidas = await obterFaixasAgendaMedicoParaData(
      auth.clinicaId!,
      data.medicoId,
      dataHoraInicio
    );
    if (!horarioEstaDentroDasFaixas(inicioHHMM, fimHHMM, faixasPermitidas)) {
      return NextResponse.json(
        {
          error: "Este médico não possui atendimento configurado para este horário.",
          detalhes: { inicio: inicioHHMM, fim: fimHHMM },
        },
        { status: 400 }
      );
    }

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
      const fimExistente = agendamentoExistente.dataHoraFim
        ? new Date(agendamentoExistente.dataHoraFim)
        : (() => { const f = new Date(inicioExistente); f.setMinutes(f.getMinutes() + 30); return f; })();

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

    // Validar regra de retorno: criar alçada de aprovação se houver retorno nos últimos 30 dias
    // ou se já houver um retorno agendado no futuro
    let precisaAprovacao = false;
    let motivoAprovacao: string | null = null;

    if (data.tipoConsultaId) {
      const tipoConsulta = await prisma.tipoConsulta.findFirst({
        where: {
          id: data.tipoConsultaId,
          codigo: "RETORNO",
          ativo: true,
        },
      });

      if (tipoConsulta) {
        // Buscar TODOS os retornos do paciente com o mesmo médico (passados e futuros)
        const retornosExistentes = await prisma.consulta.findMany({
          where: {
            pacienteId: data.pacienteId,
            medicoId: data.medicoId,
            clinicaId: auth.clinicaId,
            tipoConsultaId: tipoConsulta.id,
            status: {
              not: "CANCELADA",
            },
          },
          orderBy: {
            dataHora: "desc",
          },
          include: {
            medico: {
              include: {
                usuario: {
                  select: {
                    nome: true,
                  },
                },
              },
            },
          },
        });

        if (retornosExistentes.length > 0) {
          const hoje = new Date();
          const trintaDiasAtras = new Date(hoje);
          trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

          // Encontrar o retorno mais recente (pode ser passado ou futuro)
          const retornoMaisRecente = retornosExistentes[0];
          const dataRetornoMaisRecente = new Date(retornoMaisRecente.dataHora);

          // Verificar se há retorno nos últimos 30 dias (passado)
          if (dataRetornoMaisRecente >= trintaDiasAtras && dataRetornoMaisRecente <= hoje) {
            // Calcular data mínima permitida (30 dias após a última consulta)
            const dataMinimaPermitida = new Date(dataRetornoMaisRecente);
            dataMinimaPermitida.setDate(dataMinimaPermitida.getDate() + 30);

            // Se a data do novo agendamento for antes da data mínima permitida, requer aprovação
            if (dataHoraInicio < dataMinimaPermitida) {
              precisaAprovacao = true;
              motivoAprovacao = `Este paciente já teve uma consulta de retorno nos últimos 30 dias (${dataRetornoMaisRecente.toLocaleDateString('pt-BR')}). A data mínima recomendada seria ${dataMinimaPermitida.toLocaleDateString('pt-BR')}.`;
            }
          }

          // Verificar se já existe um retorno agendado no futuro
          const retornosFuturos = retornosExistentes.filter(
            (r) => new Date(r.dataHora) > hoje
          );

          if (retornosFuturos.length > 0) {
            precisaAprovacao = true;
            motivoAprovacao = `Este paciente já possui ${retornosFuturos.length} retorno(s) agendado(s) no futuro.`;
          }
        }
      }
    }

    if (!auth.clinicaId) {
      return NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 404 }
      );
    }

    // Derivar modalidade do tipo de consulta selecionado
    let modalidade = "PRESENCIAL";
    if (data.tipoConsultaId) {
      const tipoConsultaModal = await prisma.tipoConsulta.findUnique({
        where: { id: data.tipoConsultaId },
        select: { nome: true, codigo: true },
      });
      if (tipoConsultaModal) {
        const check = `${tipoConsultaModal.nome} ${tipoConsultaModal.codigo}`.toLowerCase();
        if (check.includes("telemedicina")) modalidade = "TELEMEDICINA";
      }
    }

    const consulta = await prisma.consulta.create({
      data: {
        clinicaId: auth.clinicaId,
        pacienteId: data.pacienteId,
        medicoId: data.medicoId,
        dataHora: data.dataHora,
        dataHoraFim: data.dataHoraFim ?? dataHoraFim,
        codigoTussId: data.codigoTussId || null,
        tipoConsultaId: data.tipoConsultaId,
        procedimentoId: data.procedimentoId,
        formaPagamentoId: data.formaPagamentoId,
        operadoraId: data.operadoraId,
        planoSaudeId: data.planoSaudeId,
        numeroCarteirinha: data.numeroCarteirinha,
        valorCobrado: data.valorCobrado,
        modalidade,
        observacoes: motivoAprovacao 
          ? `${data.observacoes || ''}\n\n[Motivo para aprovação: ${motivoAprovacao}]`.trim()
          : data.observacoes,
        status: precisaAprovacao ? "AGUARDANDO_APROVACAO" : "AGENDADA",
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

    // Enviar email de confirmação para o paciente apenas se o agendamento foi aprovado automaticamente
    // (não enviar quando está aguardando aprovação)
    if (consulta.status === "AGENDADA" && consulta.paciente.email) {
      try {
        const emailHtml = gerarEmailConfirmacaoAgendamento({
          pacienteNome: consulta.paciente.nome,
          medicoNome: consulta.medico.usuario.nome,
          dataHora: consulta.dataHora,
          tipoConsulta: consulta.tipoConsulta?.nome,
          codigoTuss: consulta.codigoTuss?.codigoTuss,
          descricaoTuss: consulta.codigoTuss?.descricao,
          observacoes: consulta.observacoes || undefined,
          clinicaNome: consulta.clinica.nome,
        });

        const emailTexto = gerarEmailConfirmacaoAgendamentoTexto({
          pacienteNome: consulta.paciente.nome,
          medicoNome: consulta.medico.usuario.nome,
          dataHora: consulta.dataHora,
          tipoConsulta: consulta.tipoConsulta?.nome,
          codigoTuss: consulta.codigoTuss?.codigoTuss,
          descricaoTuss: consulta.codigoTuss?.descricao,
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

    // Enviar WhatsApp de confirmação via template (se clínica tiver WhatsApp configurado e paciente tiver celular)
    if (consulta.status === "AGENDADA") {
      const celular = consulta.paciente.celular || consulta.paciente.telefone;
      if (celular) {
        try {
          const service = await getClinicaWhatsAppService(auth.clinicaId!);
          if (service) {
            const dataFormatada = consulta.dataHora.toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              timeZone: "America/Sao_Paulo",
            });
            const horaFormatada = consulta.dataHora.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "America/Sao_Paulo",
            });
            await service.sendTemplateMessage({
              to: celular,
              message: "",
              templateId: "confirmacao_agendamento",
              templateParams: [
                consulta.paciente.nome,
                dataFormatada,
                horaFormatada,
                consulta.clinica.nome,
                consulta.medico.usuario.nome,
              ],
            });
          }
        } catch (waError) {
          console.error("Erro ao enviar WhatsApp de confirmação:", waError);
        }
      }
    }

    // Processar anexos se houver
    if (anexosFiles.length > 0) {
      if (!areAwsCredentialsConfigured()) {
        console.warn("[Agendamento Secretaria] Credenciais AWS não configuradas. Anexos não serão enviados para S3.");
      } else {
        try {
          const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
          const allowedDocTypes = ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

          const uploadPromises = anexosFiles.map(async (arquivo) => {
            const arrayBuffer = await arquivo.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            let fileType = arquivo.type;
            if (!fileType || fileType === "application/octet-stream") {
              const extension = arquivo.name.toLowerCase().split('.').pop();
              if (['jpg', 'jpeg', 'png', 'webp'].includes(extension || '')) {
                fileType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
              } else if (extension === 'pdf') {
                fileType = "application/pdf";
              } else if (extension === 'doc') {
                fileType = "application/msword";
              } else if (extension === 'docx') {
                fileType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
              }
            }

            const isImage = allowedImageTypes.includes(fileType);
            const isDoc = allowedDocTypes.includes(fileType);
            let tipoDocumento: string;
            if (isImage) {
              tipoDocumento = "exame-imagem";
            } else if (isDoc) {
              tipoDocumento = "exame-documento";
            } else {
              tipoDocumento = "exame-pdf";
            }

            const s3Key = await uploadPDFToS3(
              buffer,
              arquivo.name,
              {
                clinicaId: auth.clinicaId!,
                medicoId: data.medicoId,
                consultaId: consulta.id,
                pacienteId: data.pacienteId,
                tipoDocumento,
                categoria: "Exames",
              },
              fileType
            );

            await prisma.documentoGerado.create({
              data: {
                clinicaId: auth.clinicaId!,
                consultaId: consulta.id,
                medicoId: data.medicoId,
                tipoDocumento,
                nomeDocumento: arquivo.name,
                s3Key,
                dados: {
                  originalFileName: arquivo.name,
                  fileSize: arquivo.size,
                  mimeType: fileType,
                  uploadedAt: new Date().toISOString(),
                  uploadedBy: "SECRETARIA",
                },
              },
            });

            console.log(`[Agendamento Secretaria] Anexo enviado para S3: ${arquivo.name} -> ${s3Key}`);
          });

          await Promise.all(uploadPromises);
          console.log(`[Agendamento Secretaria] ${anexosFiles.length} anexo(s) processado(s) com sucesso`);
        } catch (anexoError) {
          console.error("[Agendamento Secretaria] Erro ao processar anexos:", anexoError);
        }
      }
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

