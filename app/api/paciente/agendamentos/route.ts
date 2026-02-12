import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";
import { uploadPDFToS3, areAwsCredentialsConfigured } from "@/lib/s3-service";
import { stripe } from "@/lib/stripe";

const agendamentoTelemedicinaSchema = z.object({
  medicoId: z.string().uuid(),
  dataHora: z.string().transform((str) => new Date(str)),
  sessionId: z.string().optional(), // Session ID do Stripe para verificar pagamento
});

async function checkAuthorization() {
  const session = await getSession();
  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Não autorizado" }, { status: 401 }),
    };
  }

  if (session.user.tipo !== TipoUsuario.PACIENTE) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso negado. Apenas pacientes podem acessar." },
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
        { status: 404 }
      ),
    };
  }

  // Buscar o paciente pelo usuarioId
  const paciente = await prisma.paciente.findFirst({
    where: {
      clinicaId: clinicaId,
      usuarioId: session.user.id,
    },
    select: { id: true },
  });

  if (!paciente) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Paciente não encontrado" },
        { status: 404 }
      ),
    };
  }

  return { authorized: true, clinicaId, pacienteId: paciente.id };
}

// POST /api/paciente/agendamentos
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    // Verificar se é FormData ou JSON
    const contentType = request.headers.get("content-type") || "";
    let body: any;
    let anexosFiles: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      body = {
        medicoId: formData.get("medicoId") as string,
        dataHora: formData.get("dataHora") as string,
        sessionId: formData.get("sessionId") as string | undefined,
      };
      // Coletar anexos
      const anexosFormData = formData.getAll("anexos");
      anexosFiles = anexosFormData.filter((item): item is File => item instanceof File);
    } else {
      body = await request.json();
    }

    const validation = agendamentoTelemedicinaSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verificar pagamento se sessionId foi fornecido
    let pagamentoId: string | null = null;
    if (data.sessionId) {
      try {
        // Verificar sessão no Stripe
        const session = await stripe.checkout.sessions.retrieve(data.sessionId);
        
        if (session.payment_status !== "paid") {
          return NextResponse.json(
            { error: "Pagamento não confirmado. Por favor, realize o pagamento antes de agendar." },
            { status: 402 }
          );
        }

        // Buscar pagamento pelo sessionId
        let pagamento = await prisma.pagamentoConsulta.findUnique({
          where: { stripeSessionId: data.sessionId },
        });

        if (!pagamento) {
          return NextResponse.json(
            { error: "Pagamento não encontrado" },
            { status: 404 }
          );
        }

        if (pagamento.pacienteId !== auth.pacienteId) {
          return NextResponse.json(
            { error: "Pagamento não pertence a este paciente" },
            { status: 403 }
          );
        }

        // Se o Stripe confirma que foi pago, mas o banco ainda não está atualizado,
        // atualizar o status do pagamento (pode acontecer se o webhook não foi processado ainda)
        if (session.payment_status === "paid" && pagamento.status !== "PAGO") {
          console.log(`[Agendamento] Atualizando status do pagamento ${pagamento.id} para PAGO (webhook pode não ter sido processado)`);
          pagamento = await prisma.pagamentoConsulta.update({
            where: { id: pagamento.id },
            data: {
              status: "PAGO",
              stripePaymentId: session.payment_intent as string | null,
              dataPagamento: new Date(),
              transacaoId: session.payment_intent as string | null,
              observacoes: `Pagamento confirmado via Stripe - Session ID: ${session.id} (atualizado durante criação do agendamento)`,
            },
          });
        }

        if (pagamento.status !== "PAGO") {
          return NextResponse.json(
            { error: "Pagamento não confirmado" },
            { status: 402 }
          );
        }

        // Verificar se já foi usado (consulta já criada)
        if (pagamento.consultaId) {
          return NextResponse.json(
            { error: "Este pagamento já foi utilizado para criar uma consulta" },
            { status: 400 }
          );
        }

        pagamentoId = pagamento.id;
      } catch (error) {
        console.error("Erro ao verificar pagamento:", error);
        return NextResponse.json(
          { error: "Erro ao verificar pagamento" },
          { status: 500 }
        );
      }
    } else {
      // Se não há sessionId, retornar erro - pagamento é obrigatório
      return NextResponse.json(
        { error: "Pagamento é obrigatório para agendamentos de telemedicina. Por favor, realize o pagamento primeiro." },
        { status: 402 }
      );
    }

    // Verificar se médico pertence à clínica e está ativo
    const medico = await prisma.medico.findFirst({
      where: {
        id: data.medicoId,
        clinicaId: auth.clinicaId,
        ativo: true,
      },
    });

    if (!medico) {
      return NextResponse.json(
        { error: "Médico não encontrado ou inativo" },
        { status: 404 }
      );
    }

    // Buscar código TUSS padrão para consulta
    let codigoTuss = await prisma.codigoTuss.findFirst({
      where: {
        ativo: true,
        descricao: {
          contains: "CONSULTA",
          mode: "insensitive",
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Se não encontrar com "CONSULTA", buscar qualquer código TUSS ativo
    if (!codigoTuss) {
      codigoTuss = await prisma.codigoTuss.findFirst({
        where: {
          ativo: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });
    }

    if (!codigoTuss) {
      return NextResponse.json(
        { error: "Código TUSS não encontrado. Entre em contato com a clínica." },
        { status: 500 }
      );
    }

    // Buscar tipo de consulta TELEMEDICINA
    const tipoConsulta = await prisma.tipoConsulta.findFirst({
      where: {
        codigo: "TELEMEDICINA",
        ativo: true,
      },
    });

    // Duração padrão da consulta (30 minutos)
    const DURACAO_CONSULTA_MINUTOS = 30;
    const dataHoraInicio = new Date(data.dataHora);
    const dataHoraFim = new Date(dataHoraInicio);
    dataHoraFim.setMinutes(dataHoraFim.getMinutes() + DURACAO_CONSULTA_MINUTOS);

    // Verificar se não é um horário passado
    if (dataHoraInicio < new Date()) {
      return NextResponse.json(
        { error: "Não é possível agendar em um horário passado" },
        { status: 400 }
      );
    }

    // Buscar agendamentos existentes do médico
    const agendamentosMedico = await prisma.consulta.findMany({
      where: {
        clinicaId: auth.clinicaId,
        medicoId: data.medicoId,
        status: {
          notIn: ["CANCELADA", "CANCELADO"],
        },
      },
    });

    // Verificar conflitos de horário
    for (const agendamentoExistente of agendamentosMedico) {
      const inicioExistente = new Date(agendamentoExistente.dataHora);
      const fimExistente = new Date(inicioExistente);
      fimExistente.setMinutes(fimExistente.getMinutes() + DURACAO_CONSULTA_MINUTOS);

      const haConflito = 
        (dataHoraInicio >= inicioExistente && dataHoraInicio < fimExistente) ||
        (dataHoraFim > inicioExistente && dataHoraFim <= fimExistente) ||
        (dataHoraInicio <= inicioExistente && dataHoraFim >= fimExistente);

      if (haConflito) {
        return NextResponse.json(
          {
            error: "Não é possível agendar neste horário. Já existe um agendamento para este médico neste período.",
          },
          { status: 400 }
        );
      }
    }

    // Verificar bloqueios de agenda
    const bloqueios = await prisma.bloqueioAgenda.findMany({
      where: {
        clinicaId: auth.clinicaId,
        medicoId: data.medicoId,
      },
    });

    for (const bloqueio of bloqueios) {
      const dataInicioBloqueio = new Date(
        `${bloqueio.dataInicio.toISOString().split("T")[0]}T${bloqueio.horaInicio}:00`
      );
      const dataFimBloqueio = new Date(
        `${bloqueio.dataFim.toISOString().split("T")[0]}T${bloqueio.horaFim}:00`
      );

      const haConflitoBloqueio = 
        (dataHoraInicio >= dataInicioBloqueio && dataHoraInicio < dataFimBloqueio) ||
        (dataHoraFim > dataInicioBloqueio && dataHoraFim <= dataFimBloqueio) ||
        (dataHoraInicio <= dataInicioBloqueio && dataHoraFim >= dataFimBloqueio);

      if (haConflitoBloqueio) {
        return NextResponse.json(
          {
            error: "Não é possível agendar neste horário. Existe um bloqueio de agenda neste período.",
          },
          { status: 400 }
        );
      }
    }

    // Criar agendamento
    const consulta = await prisma.consulta.create({
      data: {
        clinicaId: auth.clinicaId!,
        pacienteId: auth.pacienteId!,
        medicoId: data.medicoId,
        dataHora: dataHoraInicio,
        codigoTussId: codigoTuss.id,
        tipoConsultaId: tipoConsulta?.id || null,
        status: "AGENDADA",
      },
      include: {
        paciente: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        medico: {
          include: {
            usuario: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
        },
        tipoConsulta: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    // Associar pagamento à consulta
    if (pagamentoId) {
      await prisma.pagamentoConsulta.update({
        where: { id: pagamentoId },
        data: { consultaId: consulta.id },
      });
    }

    // Processar anexos se houver
    if (anexosFiles.length > 0) {
      // Verificar se as credenciais AWS estão configuradas
      if (!areAwsCredentialsConfigured()) {
        console.warn("[Agendamento] Credenciais AWS não configuradas. Anexos não serão enviados para S3.");
        console.warn("[Agendamento] Configure AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY nas variáveis de ambiente.");
      } else {
        try {
          const uploadPromises = anexosFiles.map(async (arquivo) => {
            // Converter File para Buffer
            const arrayBuffer = await arquivo.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Determinar tipo de documento e content type
            const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
            const allowedPdfTypes = ["application/pdf"];
            const allowedDocTypes = ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
            let fileType = arquivo.type;

            // Se o tipo não foi detectado, tentar inferir pela extensão
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
            
            const contentType = fileType;

            // Fazer upload para S3 na pasta Exames
            const s3Key = await uploadPDFToS3(
              buffer,
              arquivo.name,
              {
                clinicaId: auth.clinicaId!,
                medicoId: data.medicoId,
                consultaId: consulta.id,
                pacienteId: auth.pacienteId!,
                tipoDocumento,
                categoria: "Exames",
              },
              contentType
            );

            // Salvar referência no banco de dados
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
                  uploadedBy: "PACIENTE",
                },
              },
            });

            console.log(`[Agendamento] Anexo enviado para S3: ${arquivo.name} -> ${s3Key}`);
          });

          await Promise.all(uploadPromises);
          console.log(`[Agendamento] ${anexosFiles.length} anexo(s) processado(s) com sucesso`);
        } catch (anexoError) {
          console.error("[Agendamento] Erro ao processar anexos:", anexoError);
          // Não falhar o agendamento se houver erro nos anexos, apenas logar
          if (anexoError instanceof Error) {
            console.error("[Agendamento] Mensagem de erro:", anexoError.message);
          }
        }
      }
    }

    return NextResponse.json({ consulta }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar agendamento de telemedicina:", error);
    return NextResponse.json(
      { error: "Erro ao criar agendamento" },
      { status: 500 }
    );
  }
}
