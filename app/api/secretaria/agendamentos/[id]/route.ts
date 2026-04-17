import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma, prismaRaw } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";
import { decryptFields } from "@/lib/crypto/field-encryption";
import { uploadPDFToS3, areAwsCredentialsConfigured } from "@/lib/s3-service";
import {
  sendEmail,
  gerarEmailCancelamentoAgendamento,
  gerarEmailCancelamentoAgendamentoTexto,
  gerarEmailAlteracaoAgendamento,
  gerarEmailAlteracaoAgendamentoTexto,
} from "@/lib/email";
import { gerarEmailMedico } from "@/lib/utils";
import { getClinicaWhatsAppService } from "@/lib/whatsapp";
import { horarioEstaDentroDasFaixas, obterFaixasAgendaMedicoParaData } from "@/lib/medico-escala";

const atualizarAgendamentoSchema = z.object({
  pacienteId: z.string().uuid().optional(),
  medicoId: z.string().uuid().optional(),
  dataHora: z.string().transform((str) => new Date(str)).optional(),
  dataHoraFim: z.string().transform((str) => new Date(str)).optional(),
  codigoTussId: z.string().uuid().optional().nullable(),
  tipoConsultaId: z.string().uuid().optional().nullable(),
  procedimentoId: z.string().uuid().optional().nullable(),
  formaPagamentoId: z.string().uuid().optional().nullable(),
  operadoraId: z.string().uuid().optional().nullable(),
  planoSaudeId: z.string().uuid().optional().nullable(),
  numeroCarteirinha: z.string().optional().nullable(),
  valorCobrado: z.number().optional().nullable(),
  desconto: z.number().optional().nullable(),
  valorFinal: z.number().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  encaixe: z.boolean().optional(),
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

    // Usar prismaRaw para evitar que o middleware de criptografia destrua campos Decimal
    let agendamento;
    try {
      agendamento = await prismaRaw.consulta.findFirst({
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
              whatsappContatoNumero: true,
              telefone: true,
            },
          },
          documentos: {
            where: { tipoDocumento: { in: ["exame-imagem", "exame-pdf", "exame-documento"] } },
            select: { id: true, nomeDocumento: true, tipoDocumento: true, dados: true, createdAt: true },
            orderBy: { createdAt: "asc" },
          },
        },
      });
    } catch (includeError: any) {
      if (includeError?.message?.includes("procedimento") || includeError?.code === "P2021") {
        console.warn("Campo procedimento não encontrado, buscando sem include de procedimento");
        agendamento = await prismaRaw.consulta.findFirst({
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
            documentos: {
              where: { tipoDocumento: { in: ["exame-imagem", "exame-pdf", "exame-documento"] } },
              select: { id: true, nomeDocumento: true, tipoDocumento: true, dados: true, createdAt: true },
              orderBy: { createdAt: "asc" },
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

    const toNum = (v: any) => (v != null ? parseFloat(v.toString()) : null);

    // Descriptografar campos da Consulta (observacoes) e do Paciente (cpf, email, etc.)
    // usando prismaRaw os campos não são descriptografados automaticamente
    const consultaDecrypted = decryptFields("Consulta", agendamento as any) as any;
    if (consultaDecrypted.paciente) {
      consultaDecrypted.paciente = decryptFields("Paciente", consultaDecrypted.paciente);
    }

    const consultaSerializada = {
      ...consultaDecrypted,
      valorCobrado: toNum(agendamento.valorCobrado),
      desconto: toNum(agendamento.desconto),
      valorFinal: toNum(agendamento.valorFinal),
      valorRepassado: toNum(agendamento.valorRepassado),
    };
    return NextResponse.json({ consulta: consultaSerializada }, { status: 200 });
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
        desconto: fd("desconto") ? parseFloat(fd("desconto")!) : null,
        valorFinal: fd("valorFinal") ? parseFloat(fd("valorFinal")!) : null,
        observacoes: fd("observacoes") ?? undefined,
        encaixe: fd("encaixe") === "true" ? true : fd("encaixe") === "false" ? false : undefined,
      };
      const anexosFormData = formData.getAll("anexos");
      anexosFiles = anexosFormData.filter((item: any): item is File => item instanceof File);
    } else {
      body = await request.json();
    }

    const validation = atualizarAgendamentoSchema.safeParse(body);

    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      const field = firstIssue?.path?.join(".") || "campo desconhecido";
      const message = firstIssue?.message || "Valor inválido";
      return NextResponse.json(
        { error: `Campo inválido: ${field} — ${message}`, details: validation.error.issues },
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
              whatsappContatoNumero: true,
              telefone: true,
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
    if (data.dataHoraFim !== undefined) updateData.dataHoraFim = data.dataHoraFim;
    if (data.codigoTussId) updateData.codigoTussId = data.codigoTussId;
    if (data.tipoConsultaId !== undefined) updateData.tipoConsultaId = data.tipoConsultaId;
    if (data.procedimentoId !== undefined) updateData.procedimentoId = data.procedimentoId;
    if (data.formaPagamentoId !== undefined) updateData.formaPagamentoId = data.formaPagamentoId;
    if (data.operadoraId !== undefined) updateData.operadoraId = data.operadoraId;
    if (data.planoSaudeId !== undefined) updateData.planoSaudeId = data.planoSaudeId;
    if (data.numeroCarteirinha !== undefined) updateData.numeroCarteirinha = data.numeroCarteirinha;
    if (data.valorCobrado !== undefined) updateData.valorCobrado = data.valorCobrado;
    if (data.desconto !== undefined) updateData.desconto = data.desconto;
    if (data.valorFinal !== undefined) updateData.valorFinal = data.valorFinal;
    if (data.observacoes !== undefined) updateData.observacoes = data.observacoes;
    if (data.encaixe !== undefined) updateData.encaixe = data.encaixe;
    if (data.status) updateData.status = data.status;

    // Encaixe: usar o valor enviado ou, se não enviado, o valor atual do banco
    const isEncaixe = data.encaixe !== undefined ? data.encaixe : agendamentoAtual.encaixe;

    // Se a data/hora ou médico foi alterado, verificar conflitos e bloqueios
    // Encaixe pula validação de conflito (igual ao POST)
    if (!isEncaixe && (data.dataHora || data.medicoId)) {
      const medicoIdParaVerificar = data.medicoId || agendamentoAtual.medicoId;
      const dataHoraParaVerificar = data.dataHora ? new Date(data.dataHora) : agendamentoAtual.dataHora;

      const dataHoraInicio = new Date(dataHoraParaVerificar);
      const dataHoraFimParaVerificar = data.dataHoraFim
        ? new Date(data.dataHoraFim)
        : (() => { const f = new Date(dataHoraInicio); f.setMinutes(f.getMinutes() + 30); return f; })();
      const dataHoraFim = dataHoraFimParaVerificar;
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
        medicoIdParaVerificar,
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
        const fimExistente = agendamentoExistente.dataHoraFim
          ? new Date(agendamentoExistente.dataHoraFim)
          : (() => { const f = new Date(inicioExistente); f.setMinutes(f.getMinutes() + 30); return f; })();

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
            telefone: true,
            whatsappContatoNumero: true,
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
          codigoTuss: agendamentoAtualizado.codigoTuss?.codigoTuss,
          descricaoTuss: agendamentoAtualizado.codigoTuss?.descricao,
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
          codigoTuss: agendamentoAtualizado.codigoTuss?.codigoTuss,
          descricaoTuss: agendamentoAtualizado.codigoTuss?.descricao,
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

    // WhatsApp: avisar alteração de data/hora
    if (dataHoraAlterada) {
      const celular = agendamentoAtualizado.paciente.celular || agendamentoAtualizado.paciente.telefone;
      if (celular) {
        try {
          const service = await getClinicaWhatsAppService(auth.clinicaId!);
          if (service) {
            const dataFormatada = agendamentoAtualizado.dataHora.toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              timeZone: "America/Sao_Paulo",
            });
            const horaFormatada = agendamentoAtualizado.dataHora.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "America/Sao_Paulo",
            });
            const numeroContatoClinica = (agendamentoAtualizado.clinica.whatsappContatoNumero || agendamentoAtualizado.clinica.telefone || "").replace(/\D/g, "");
            await service.sendTemplateMessage({
              to: celular,
              message: "",
              templateId: "alteracao_agendamento",
              templateParams: [
                agendamentoAtualizado.paciente.nome,
                dataFormatada,
                horaFormatada,
                agendamentoAtualizado.clinica.nome,
                agendamentoAtualizado.medico.usuario.nome,
                numeroContatoClinica,
              ],
            });
          }
        } catch (waError) {
          console.error("Erro ao enviar WhatsApp de alteração:", waError);
        }
      }
    }

    // Processar anexos se houver
    if (anexosFiles.length > 0) {
      if (!areAwsCredentialsConfigured()) {
        console.warn("[Editar Agendamento] Credenciais AWS não configuradas. Anexos não serão enviados para S3.");
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
                medicoId: agendamentoAtualizado.medicoId,
                consultaId: id,
                pacienteId: agendamentoAtualizado.pacienteId,
                tipoDocumento,
                categoria: "Exames",
              },
              fileType
            );

            await prisma.documentoGerado.create({
              data: {
                clinicaId: auth.clinicaId!,
                consultaId: id,
                medicoId: agendamentoAtualizado.medicoId,
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

            console.log(`[Editar Agendamento] Anexo enviado para S3: ${arquivo.name} -> ${s3Key}`);
          });

          await Promise.all(uploadPromises);
          console.log(`[Editar Agendamento] ${anexosFiles.length} anexo(s) processado(s) com sucesso`);
        } catch (anexoError) {
          console.error("[Editar Agendamento] Erro ao processar anexos:", anexoError);
        }
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
            telefone: true,
            whatsappContatoNumero: true,
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
            telefone: true,
            whatsappContatoNumero: true,
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
          codigoTuss: agendamentoCancelado.codigoTuss?.codigoTuss,
          descricaoTuss: agendamentoCancelado.codigoTuss?.descricao,
          observacoes: agendamentoCancelado.observacoes || undefined,
          clinicaNome: agendamentoCancelado.clinica.nome,
          motivoCancelamento,
        });

        const emailTexto = gerarEmailCancelamentoAgendamentoTexto({
          pacienteNome: agendamentoCancelado.paciente.nome,
          medicoNome: agendamentoCancelado.medico.usuario.nome,
          dataHora: agendamentoCancelado.dataHora,
          tipoConsulta: agendamentoCancelado.tipoConsulta?.nome,
          codigoTuss: agendamentoCancelado.codigoTuss?.codigoTuss,
          descricaoTuss: agendamentoCancelado.codigoTuss?.descricao,
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

    // WhatsApp: avisar cancelamento
    const celularCanc = agendamentoCancelado.paciente.celular || agendamentoCancelado.paciente.telefone;
    if (celularCanc) {
      try {
        const service = await getClinicaWhatsAppService(auth.clinicaId!);
        if (service) {
          const dataFormatada = agendamentoCancelado.dataHora.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            timeZone: "America/Sao_Paulo",
          });
          const horaFormatada = agendamentoCancelado.dataHora.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "America/Sao_Paulo",
          });
          const numeroContatoClinica = (agendamentoCancelado.clinica.whatsappContatoNumero || agendamentoCancelado.clinica.telefone || "").replace(/\D/g, "");
          await service.sendTemplateMessage({
            to: celularCanc,
            message: "",
            templateId: "cancelamento_agendamento",
            templateParams: [
              agendamentoCancelado.paciente.nome,
              dataFormatada,
              horaFormatada,
              agendamentoCancelado.clinica.nome,
              agendamentoCancelado.medico.usuario.nome,
              numeroContatoClinica,
            ],
          });
        }
      } catch (waError) {
        console.error("Erro ao enviar WhatsApp de cancelamento:", waError);
      }
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

