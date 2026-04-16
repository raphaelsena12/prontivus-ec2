import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma, prismaRaw } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { uploadPDFToS3, areAwsCredentialsConfigured } from "@/lib/s3-service";
import sharp from "sharp";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { brazilTodayFormatted } from "@/lib/timezone-utils";
import { auditLogFromRequest } from "@/lib/audit-log";

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
        { error: "Acesso negado. Apenas médicos podem acessar esta rota." },
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

  // Buscar o médico pelo usuarioId
  const medico = await prisma.medico.findFirst({
    where: {
      usuarioId: session.user.id,
      clinicaId: clinicaId,
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

// GET /api/medico/atendimento - Buscar dados da consulta e prontuário
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const consultaId = searchParams.get("consultaId");

    if (!consultaId) {
      return NextResponse.json(
        { error: "ID da consulta é obrigatório" },
        { status: 400 }
      );
    }

    // Buscar a consulta
    const consulta = await prisma.consulta.findFirst({
      where: {
        id: consultaId,
        clinicaId: auth.clinicaId,
        medicoId: auth.medicoId,
      },
      include: {
        paciente: {
          include: {
            usuario: {
              select: {
                avatar: true,
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
        tipoConsulta: {
          select: {
            nome: true,
          },
        },
        operadora: {
          select: {
            id: true,
            nomeFantasia: true,
          },
        },
        planoSaude: {
          select: {
            id: true,
            nome: true,
          },
        },
        procedimento: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    if (!consulta) {
      return NextResponse.json(
        { error: "Consulta não encontrada" },
        { status: 404 }
      );
    }

    // Buscar o prontuário relacionado
    const prontuario = await prisma.prontuario.findFirst({
      where: {
        consultaId: consultaId,
        clinicaId: auth.clinicaId,
        medicoId: auth.medicoId,
      },
    });

    // Buscar CIDs, exames e prescrições já salvos para esta consulta
    const savedCids = await prisma.consultaCid.findMany({
      where: { consultaId },
      select: { code: true, description: true },
    });
    const savedExames = await prisma.consultaExame.findMany({
      where: { consultaId },
      select: { nome: true, tipo: true },
    });
    const savedPrescricoes = await prisma.consultaPrescricao.findMany({
      where: { consultaId },
      select: { medicamento: true, dosagem: true, posologia: true, duracao: true },
    });

    // Buscar avatar do paciente da mesma forma que o perfil faz
    // O perfil usa session.user.id, aqui tentamos pelo usuarioId primeiro
    // Se não encontrar, tentamos por CPF ou email (caso o avatar esteja em outro usuario)
    // Se ainda não encontrar, tentamos buscar diretamente no S3
    let avatarEncontrado: string | null = null;
    
    if (consulta.paciente.usuarioId) {
      // Buscar avatar do usuario vinculado ao paciente
      const usuarioCompleto = await prisma.usuario.findUnique({
        where: { id: consulta.paciente.usuarioId },
        select: {
          avatar: true,
        },
      });
      
      avatarEncontrado = usuarioCompleto?.avatar || null;
      
      // Se não encontrou no banco, tentar buscar no S3 diretamente
      if (!avatarEncontrado) {
        try {
          const { S3Client, ListObjectsV2Command } = await import("@aws-sdk/client-s3");
          const s3Client = new S3Client({
            region: process.env.AWS_REGION || "sa-east-1",
            credentials: {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
            },
          });
          
          const bucketName = process.env.AWS_S3_BUCKET_NAME || "prontivus-documentos";
          
          // Tentar diferentes formatos de busca
          const prefixes = [
            `usuarios/${consulta.paciente.usuarioId}-`, // Formato padrão: usuarios/{userId}-{timestamp}.ext
            `usuarios/${consulta.paciente.usuarioId}`,  // Sem hífen: usuarios/{userId}
          ];
          
          let arquivoEncontrado: string | null = null;
          
          for (const prefix of prefixes) {
            const listCommand = new ListObjectsV2Command({
              Bucket: bucketName,
              Prefix: prefix,
              MaxKeys: 100, // Buscar mais arquivos
            });
            
            const listResult = await s3Client.send(listCommand);
            
            if (listResult.Contents && listResult.Contents.length > 0) {
              // Filtrar apenas arquivos de imagem
              const imageFiles = listResult.Contents.filter(c => {
                const key = c.Key || '';
                return key.match(/\.(jpg|jpeg|png|gif|webp)$/i);
              });
              
              if (imageFiles.length > 0) {
                // Ordenar por data (mais recente primeiro) e pegar o primeiro
                const sortedContents = imageFiles.sort((a, b) => {
                  const timeA = a.LastModified?.getTime() || 0;
                  const timeB = b.LastModified?.getTime() || 0;
                  return timeB - timeA; // Mais recente primeiro
                });
                
                arquivoEncontrado = sortedContents[0].Key || null;
                break; // Parar na primeira busca que encontrar
              }
            }
          }
          
          // Se não encontrou com prefixos específicos, buscar todos na pasta usuarios/ e filtrar
          if (!arquivoEncontrado) {
            const listAllCommand = new ListObjectsV2Command({
              Bucket: bucketName,
              Prefix: 'usuarios/',
              MaxKeys: 1000,
            });
            
            const listAllResult = await s3Client.send(listAllCommand);
            
            if (listAllResult.Contents && listAllResult.Contents.length > 0) {
              // Filtrar arquivos que contenham o usuarioId no nome
              const arquivosDoUsuario = listAllResult.Contents.filter(c => {
                const key = c.Key || '';
                const usuarioId = consulta.paciente.usuarioId;
                return usuarioId && key.includes(usuarioId) && 
                       key.match(/\.(jpg|jpeg|png|gif|webp)$/i);
              });
              
              if (arquivosDoUsuario.length > 0) {
                // Ordenar por data (mais recente primeiro)
                const sorted = arquivosDoUsuario.sort((a, b) => {
                  const timeA = a.LastModified?.getTime() || 0;
                  const timeB = b.LastModified?.getTime() || 0;
                  return timeB - timeA;
                });
                
                arquivoEncontrado = sorted[0].Key || null;
              }
            }
          }
          
          // Atualizar o banco de dados com a key encontrada
          if (arquivoEncontrado) {
            avatarEncontrado = arquivoEncontrado;
            await prisma.usuario.update({
              where: { id: consulta.paciente.usuarioId },
              data: { avatar: arquivoEncontrado },
            });
          }
        } catch (s3Error) {
          console.error("Erro ao buscar avatar no S3:", s3Error);
          // Continua mesmo se falhar
        }
      }
    }
    
    // Se não encontrou pelo usuarioId, tentar por CPF (mesmo CPF pode ter avatar em outro usuario)
    if (!avatarEncontrado && consulta.paciente.cpf) {
      const cpfLimpo = consulta.paciente.cpf.replace(/\D/g, '');
      const usuarioPorCpf = await prisma.usuario.findUnique({
        where: { cpf: cpfLimpo },
        select: {
          avatar: true,
        },
      });
      if (usuarioPorCpf?.avatar) {
        avatarEncontrado = usuarioPorCpf.avatar;
      }
    }
    
    // Se ainda não encontrou, tentar por email
    if (!avatarEncontrado && consulta.paciente.email) {
      const usuarioPorEmail = await prisma.usuario.findUnique({
        where: { email: consulta.paciente.email },
        select: {
          avatar: true,
        },
      });
      if (usuarioPorEmail?.avatar) {
        avatarEncontrado = usuarioPorEmail.avatar;
      }
    }
    
    // Garantir que o objeto usuario existe e atualizar com o avatar encontrado
    if (!consulta.paciente.usuario) {
      consulta.paciente.usuario = { avatar: null };
    }
    consulta.paciente.usuario.avatar = avatarEncontrado;
    
    

    auditLogFromRequest(request, {
      action: "VIEW",
      resource: "Consulta",
      resourceId: consultaId,
      details: {
        pacienteNome: consulta.paciente?.nome,
        pacienteId: consulta.pacienteId,
        operacao: "Abriu atendimento",
      },
    });

    // Buscar campos Decimal diretamente pelo prismaRaw (sem extensão de criptografia),
    // pois o spread do prisma-encryption destrói o objeto Prisma Decimal.
    const consultaDecimal = await prismaRaw.consulta.findUnique({
      where: { id: consultaId as string },
      select: { saturacaoO2: true, temperatura: true, peso: true, altura: true },
    });
    const toNum = (v: unknown) => {
      if (v == null) return null;
      const n = typeof v === "object" ? parseFloat((v as any).toString()) : parseFloat(String(v));
      return isFinite(n) ? n : null;
    };
    const consultaSerializada = {
      ...consulta,
      saturacaoO2: toNum(consultaDecimal?.saturacaoO2),
      temperatura: toNum(consultaDecimal?.temperatura),
      peso: toNum(consultaDecimal?.peso),
      altura: toNum(consultaDecimal?.altura),
    };

    return NextResponse.json(
      {
        consulta: consultaSerializada,
        prontuario,
        savedCids,
        savedExames,
        savedPrescricoes,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro ao buscar dados do atendimento:", error);
    return NextResponse.json(
      { error: "Erro ao buscar dados do atendimento" },
      { status: 500 }
    );
  }
}

// POST /api/medico/atendimento - Salvar/atualizar prontuário
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await request.json();
    const { consultaId, anamnese, exameFisico, diagnostico, conduta, orientacoesConduta, orientacoes, evolucao, cids, exames, prescricoes, finalizar, retornoAgendado, retornoDias } = body;

    if (!consultaId) {
      return NextResponse.json(
        { error: "ID da consulta é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se a consulta pertence ao médico
    const consulta = await prisma.consulta.findFirst({
      where: {
        id: consultaId,
        clinicaId: auth.clinicaId,
        medicoId: auth.medicoId,
      },
    });

    if (!consulta) {
      return NextResponse.json(
        { error: "Consulta não encontrada" },
        { status: 404 }
      );
    }

    // Verificar se já existe prontuário
    const prontuarioExistente = await prisma.prontuario.findFirst({
      where: {
        consultaId: consultaId,
        clinicaId: auth.clinicaId,
        medicoId: auth.medicoId,
      },
    });

    let prontuario;

    if (prontuarioExistente) {
      // Atualizar prontuário existente
      prontuario = await prisma.prontuario.update({
        where: {
          id: prontuarioExistente.id,
        },
        data: {
          anamnese: anamnese || null,
          exameFisico: exameFisico || null,
          diagnostico: diagnostico || null,
          conduta: conduta || null,
          orientacoesConduta: orientacoesConduta || null,
          orientacoes: orientacoes || null,
          evolucao: evolucao || null,
        },
      });
    } else {
      // Criar novo prontuário
      if (!auth.clinicaId || !auth.medicoId) {
        return NextResponse.json(
          { error: "Clínica ou médico não encontrado" },
          { status: 404 }
        );
      }

      prontuario = await prisma.prontuario.create({
        data: {
          clinicaId: auth.clinicaId,
          pacienteId: consulta.pacienteId,
          medicoId: auth.medicoId,
          consultaId: consultaId,
          anamnese: anamnese || null,
          exameFisico: exameFisico || null,
          diagnostico: diagnostico || null,
          conduta: conduta || null,
          orientacoesConduta: orientacoesConduta || null,
          orientacoes: orientacoes || null,
          evolucao: evolucao || null,
        },
      });
    }

    // Salvar CIDs, exames e prescrições da consulta (tanto em save parcial quanto final)
    try {
      const clinicaId = auth.clinicaId!;

      if (Array.isArray(cids)) {
        await prisma.consultaCid.deleteMany({ where: { consultaId } });
        if (cids.length > 0) {
          await prisma.consultaCid.createMany({
            data: cids.map((c: { code: string; description: string }) => ({
              consultaId,
              clinicaId,
              code: c.code,
              description: c.description,
            })),
          });
        }
      }

      if (Array.isArray(exames)) {
        await prisma.consultaExame.deleteMany({ where: { consultaId } });
        if (exames.length > 0) {
          await prisma.consultaExame.createMany({
            data: exames.map((e: { nome: string; tipo?: string }) => ({
              consultaId,
              clinicaId,
              nome: e.nome,
              tipo: e.tipo || null,
            })),
          });
        }
      }

      if (Array.isArray(prescricoes)) {
        await prisma.consultaPrescricao.deleteMany({ where: { consultaId } });
        if (prescricoes.length > 0) {
          await prisma.consultaPrescricao.createMany({
            data: prescricoes.map((p: { medicamento: string; dosagem?: string; posologia: string; duracao?: string }) => ({
              consultaId,
              clinicaId,
              medicamento: p.medicamento,
              dosagem: p.dosagem || null,
              posologia: p.posologia,
              duracao: p.duracao || null,
            })),
          });
        }
      }
    } catch (err) {
      console.error("Erro ao salvar CIDs/exames/prescrições:", err);
    }

    // Só finalizar a consulta quando explicitamente solicitado
    if (finalizar) {
      // Atualizar status da consulta para REALIZADA e salvar momento do fim
      const agora = new Date();
      await prisma.consulta.update({
        where: {
          id: consultaId,
        },
        data: {
          status: "REALIZADA",
          fimAtendimento: agora,
          retornoAgendado: retornoAgendado === true,
          retornoDias: retornoAgendado === true && retornoDias ? Number(retornoDias) : null,
        },
      });

      // Gerar PDF do prontuário e fazer upload para S3
      try {
      const { generateProntuarioPDF } = await import("@/lib/pdf/prontuario");
      
      // Buscar dados completos para o PDF
      const consultaCompleta = await prisma.consulta.findUnique({
        where: { id: consultaId },
        include: {
          paciente: true,
          medico: {
            include: {
              usuario: true,
            },
          },
          clinica: true,
        },
      });

      // Tentar carregar foto de perfil do usuário admin-clínica
      let logoBase64: string | undefined;
      try {
        const adminClinica = await prisma.usuario.findFirst({
          where: {
            clinicaId: auth.clinicaId,
            tipo: TipoUsuario.ADMIN_CLINICA,
            ativo: true,
          },
          select: {
            avatar: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        });

        if (adminClinica?.avatar) {
          let imageBuffer: Buffer;

          if (adminClinica.avatar.startsWith("usuarios/")) {
            try {
              const s3Client = new S3Client({
                region: process.env.AWS_REGION || "sa-east-1",
                credentials: {
                  accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
                  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
                },
              });

              const bucketName = process.env.AWS_S3_BUCKET_NAME || "prontivus-documentos";
              const command = new GetObjectCommand({
                Bucket: bucketName,
                Key: adminClinica.avatar,
              });

              const response = await s3Client.send(command);
              const chunks: Uint8Array[] = [];

              if (response.Body) {
                // @ts-ignore - Body pode ser um stream
                for await (const chunk of response.Body) {
                  chunks.push(chunk);
                }
              }

              const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
              const combined = new Uint8Array(totalLength);
              let offset = 0;
              for (const chunk of chunks) {
                combined.set(chunk, offset);
                offset += chunk.length;
              }
              imageBuffer = Buffer.from(combined);
            } catch (s3Error) {
              console.error("Erro ao baixar avatar do S3:", s3Error);
              throw s3Error;
            }
          } else if (adminClinica.avatar.startsWith("data:image")) {
            const base64Data = adminClinica.avatar.split(",")[1];
            imageBuffer = Buffer.from(base64Data, "base64");
          } else if (adminClinica.avatar.startsWith("https://")) {
            const response = await fetch(adminClinica.avatar);
            if (!response.ok) {
              throw new Error(`Erro ao baixar imagem: ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            imageBuffer = Buffer.from(arrayBuffer);
          } else {
            throw new Error("Formato de avatar não reconhecido");
          }

          const pngBuffer = await sharp(imageBuffer).png().toBuffer();
          logoBase64 = `data:image/png;base64,${pngBuffer.toString("base64")}`;
          console.log("Logo do admin-clínica carregado com sucesso para o prontuário");
        } else {
          console.warn("Admin-clínica não possui avatar configurado");
        }
      } catch (error) {
        console.error("Erro ao carregar foto de perfil do admin-clínica:", error);
        logoBase64 = undefined;
      }

      if (consultaCompleta && prontuario) {
        const dataEmissao = brazilTodayFormatted();
        const pdfBuffer = generateProntuarioPDF({
          clinicaNome: consultaCompleta.clinica.nome,
          clinicaCnpj: consultaCompleta.clinica.cnpj || "",
          clinicaEndereco: consultaCompleta.clinica.endereco || undefined,
          logoBase64,
          medicoNome: consultaCompleta.medico.usuario.nome,
          medicoCrm: consultaCompleta.medico.crm,
          medicoEspecialidade: consultaCompleta.medico.especialidade || "",
          pacienteNome: consultaCompleta.paciente.nome,
          pacienteCpf: consultaCompleta.paciente.cpf,
          pacienteDataNascimento: consultaCompleta.paciente.dataNascimento.toISOString().split('T')[0],
          dataEmissao,
          dataConsulta: consultaCompleta.dataHora.toISOString().split('T')[0],
          anamnese: prontuario.anamnese || "",
          exameFisico: prontuario.exameFisico || "",
          diagnostico: prontuario.diagnostico || "",
          conduta: prontuario.conduta || "",
          orientacoesConduta: prontuario.orientacoesConduta || "",
          orientacoes: prontuario.orientacoes || "",
          evolucao: prontuario.evolucao || "",
        });

        // Converter ArrayBuffer para Buffer
        const buffer = Buffer.from(pdfBuffer);

        // Upload para S3 na pasta Prontuários
        const s3Key = await uploadPDFToS3(
          buffer,
          `prontuario-${consultaId}-${Date.now()}.pdf`,
          {
            clinicaId: auth.clinicaId!,
            medicoId: auth.medicoId!,
            consultaId: consultaId,
            pacienteId: consulta.pacienteId,
            tipoDocumento: "prontuario",
            categoria: "Prontuários",
          },
          "application/pdf"
        );

        console.log("✅ Prontuário salvo no S3:", s3Key);
      }

      // Gerar ficha de atendimento automaticamente ao finalizar
      if (consultaCompleta && prontuario) {
        try {
          const { generateFichaAtendimentoPDF } = await import("@/lib/pdf/ficha-atendimento");

          // Buscar CIDs salvos
          const cidsSalvos = await prisma.consultaCid.findMany({
            where: { consultaId, clinicaId: auth.clinicaId! },
          });
          const cidCodes = cidsSalvos.map((c) => ({
            code: c.code,
            description: c.description,
          }));

          // Buscar exames solicitados
          const solicitacoesExames = await prisma.solicitacaoExame.findMany({
            where: { consultaId, clinicaId: auth.clinicaId! },
            include: { exame: { select: { nome: true, tipo: true } } },
          });
          const exames = solicitacoesExames.map((se) => ({
            nome: se.exame.nome,
            tipo: se.exame.tipo || "Laboratorial",
          }));

          // Buscar prescrições
          const consultaPrescricoes = await prisma.consultaPrescricao.findMany({
            where: { consultaId, clinicaId: auth.clinicaId! },
            orderBy: { createdAt: "asc" },
          });
          const prescricoesFicha = consultaPrescricoes.map((cp) => ({
            medicamento: cp.medicamento,
            dosagem: cp.dosagem || "",
            posologia: cp.posologia,
            duracao: cp.duracao || "",
          }));

          // Criar DocumentoGerado para número sequencial
          const docFicha = await prisma.documentoGerado.create({
            data: {
              clinicaId: auth.clinicaId!,
              consultaId,
              medicoId: auth.medicoId!,
              tipoDocumento: "ficha-atendimento",
              nomeDocumento: "Ficha de Atendimento",
            },
            select: { id: true, numero: true },
          });
          const fichaNumero = String(docFicha.numero).padStart(6, "0");

          const dataConsultaObj = new Date(consultaCompleta.dataHora);
          const dataConsultaFmt = `${String(dataConsultaObj.getDate()).padStart(2, "0")}/${String(dataConsultaObj.getMonth() + 1).padStart(2, "0")}/${dataConsultaObj.getFullYear()}`;
          const horaConsultaFmt = `${String(dataConsultaObj.getHours()).padStart(2, "0")}:${String(dataConsultaObj.getMinutes()).padStart(2, "0")}`;
          const dataNascFicha = new Date(consultaCompleta.paciente.dataNascimento);
          const dataNascFmt = `${String(dataNascFicha.getDate()).padStart(2, "0")}/${String(dataNascFicha.getMonth() + 1).padStart(2, "0")}/${dataNascFicha.getFullYear()}`;

          const fichaPdfBuffer = generateFichaAtendimentoPDF({
            clinicaNome: consultaCompleta.clinica.nome,
            clinicaCnpj: consultaCompleta.clinica.cnpj || "",
            clinicaTelefone: consultaCompleta.clinica.telefone || undefined,
            clinicaEmail: consultaCompleta.clinica.email || undefined,
            clinicaEndereco: consultaCompleta.clinica.endereco || undefined,
            clinicaNumero: consultaCompleta.clinica.numero || undefined,
            clinicaBairro: consultaCompleta.clinica.bairro || undefined,
            clinicaCidade: consultaCompleta.clinica.cidade || undefined,
            clinicaEstado: consultaCompleta.clinica.estado || undefined,
            clinicaCep: consultaCompleta.clinica.cep || undefined,
            clinicaSite: consultaCompleta.clinica.site || undefined,
            logoBase64,
            medicoNome: consultaCompleta.medico.usuario.nome,
            medicoCrm: consultaCompleta.medico.crm,
            medicoEspecialidade: consultaCompleta.medico.especialidade || "",
            pacienteNome: consultaCompleta.paciente.nome,
            pacienteCpf: consultaCompleta.paciente.cpf,
            pacienteDataNascimento: dataNascFmt,
            dataEmissao: brazilTodayFormatted(),
            fichaNumero,
            dataConsulta: dataConsultaFmt,
            horaConsulta: horaConsultaFmt,
            anamnese: prontuario.anamnese || "",
            cidCodes,
            exames,
            prescricoes: prescricoesFicha,
            orientacoes: prontuario.orientacoes || "",
          });

          if (areAwsCredentialsConfigured()) {
            const fichaBuffer = Buffer.from(fichaPdfBuffer);
            const fichaS3Key = await uploadPDFToS3(
              fichaBuffer,
              `ficha-atendimento-${consultaId}-${Date.now()}.pdf`,
              {
                clinicaId: auth.clinicaId!,
                medicoId: auth.medicoId!,
                consultaId,
                pacienteId: consulta.pacienteId,
                tipoDocumento: "ficha-atendimento",
                categoria: "Fichas de Atendimento",
              },
              "application/pdf"
            );

            await prisma.documentoGerado.update({
              where: { id: docFicha.id },
              data: { s3Key: fichaS3Key },
            });

            console.log("✅ Ficha de atendimento salva no S3:", fichaS3Key);
          }
        } catch (fichaError) {
          console.error("Erro ao gerar ficha de atendimento (não bloqueante):", fichaError);
        }
      }
      } catch (error) {
        // Não falhar o processo se o upload do PDF falhar
        console.error("Erro ao gerar e fazer upload do PDF do prontuário:", error);
      }
    } // fim if (finalizar)

    auditLogFromRequest(request, {
      action: finalizar ? "UPDATE" : (prontuarioExistente ? "UPDATE" : "CREATE"),
      resource: "Prontuario",
      resourceId: prontuario.id,
      details: {
        pacienteId: consulta.pacienteId,
        consultaId,
        operacao: finalizar ? "Finalizou atendimento" : (prontuarioExistente ? "Atualizou prontuário" : "Criou prontuário"),
      },
    });

    return NextResponse.json(
      {
        prontuario,
        message: finalizar ? "Atendimento finalizado com sucesso" : "Prontuário salvo com sucesso",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro ao salvar prontuário:", error);
    return NextResponse.json(
      { error: "Erro ao salvar prontuário" },
      { status: 500 }
    );
  }
}
