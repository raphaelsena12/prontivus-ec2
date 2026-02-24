import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId, getUserMedicoId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { generateAtestadoPDF } from "@/lib/pdf/atestado-medico";
import { generateAtestadoAptidaoPDF } from "@/lib/pdf/atestado-aptidao";
import { generateDeclaracaoComparecimentoPDF } from "@/lib/pdf/declaracao-comparecimento";
import { generateReceitaSimplesPDF } from "@/lib/pdf/receita-simples";
import { generateReceitaControleEspecialPDF } from "@/lib/pdf/receita-controle-especial";
import { generateGuiaEncaminhamentoPDF } from "@/lib/pdf/guia-encaminhamento";
import { generateRiscoCirurgicoPDF } from "@/lib/pdf/risco-cirurgico";
import { generateJustificativaExamesPDF } from "@/lib/pdf/justificativa-exames";
import { generateControleDiabetesPDF } from "@/lib/pdf/controle-diabetes";
import { generateControlePressaoPDF } from "@/lib/pdf/controle-pressao";
import { generateFichaAtendimentoPDF } from "@/lib/pdf/ficha-atendimento";
import sharp from "sharp";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

export async function POST(request: NextRequest) {
  try {
    // Autenticação
    const session = await getSession();
    if (!session || session.user.tipo !== TipoUsuario.MEDICO) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const clinicaId = await getUserClinicaId();
    const medicoId = await getUserMedicoId();
    if (!clinicaId || !medicoId) {
      return NextResponse.json({ error: "Clínica ou médico não encontrado" }, { status: 403 });
    }

    const body = await request.json();
    const { tipoDocumento, consultaId, dados } = body;

    if (!tipoDocumento || !consultaId) {
      return NextResponse.json({ error: "Tipo de documento e ID da consulta são obrigatórios" }, { status: 400 });
    }

    // Buscar dados completos
    const consulta = await prisma.consulta.findFirst({
      where: { id: consultaId, clinicaId },
      include: {
        paciente: true,
        medico: {
          include: {
            usuario: { select: { nome: true, email: true } },
          },
        },
        clinica: true,
      },
    });

    if (!consulta) {
      return NextResponse.json({ error: "Consulta não encontrada" }, { status: 404 });
    }

    // Tentar carregar foto de perfil do usuário admin-clínica (converte para PNG para preservar transparência no PDF)
    let logoBase64: string | undefined;
    try {
      // Buscar usuário admin-clínica da clínica
      const adminClinica = await prisma.usuario.findFirst({
        where: {
          clinicaId,
          tipo: TipoUsuario.ADMIN_CLINICA,
          ativo: true,
        },
        select: {
          avatar: true,
        },
        orderBy: {
          createdAt: "asc", // Pegar o primeiro admin criado (mais antigo)
        },
      });

      if (adminClinica?.avatar) {
        let imageBuffer: Buffer;

        // Se for uma key do S3 (formato: usuarios/xxx)
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
            // Se falhar ao baixar do S3, não é possível continuar
            throw s3Error;
          }
        } else if (adminClinica.avatar.startsWith("data:image")) {
          // Se for base64, extrair o buffer
          const base64Data = adminClinica.avatar.split(",")[1];
          imageBuffer = Buffer.from(base64Data, "base64");
        } else if (adminClinica.avatar.startsWith("https://")) {
          // Se for URL, baixar
          const response = await fetch(adminClinica.avatar);
          if (!response.ok) {
            throw new Error(`Erro ao baixar imagem: ${response.statusText}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          imageBuffer = Buffer.from(arrayBuffer);
        } else {
          // Formato não reconhecido
          throw new Error("Formato de avatar não reconhecido");
        }

        // Converter para PNG usando sharp
        const pngBuffer = await sharp(imageBuffer).png().toBuffer();
        logoBase64 = `data:image/png;base64,${pngBuffer.toString("base64")}`;
        console.log("Logo do admin-clínica carregado com sucesso");
      } else {
        console.warn("Admin-clínica não possui avatar configurado");
      }
    } catch (error) {
      console.error("Erro ao carregar foto de perfil do admin-clínica:", error);
      // Logo não disponível, segue sem - não usar logo do Prontivus
      logoBase64 = undefined;
    }

    // Formatar data de nascimento
    const dataNasc = new Date(consulta.paciente.dataNascimento);
    const dataNascFormatada = `${String(dataNasc.getDate()).padStart(2, "0")}/${String(dataNasc.getMonth() + 1).padStart(2, "0")}/${dataNasc.getFullYear()}`;

    // Data de emissão
    const hoje = new Date();
    const dataEmissao = `${String(hoje.getDate()).padStart(2, "0")}/${String(hoje.getMonth() + 1).padStart(2, "0")}/${hoje.getFullYear()}`;

    // Hora atual
    const horaAtual = `${String(hoje.getHours()).padStart(2, "0")}:${String(hoje.getMinutes()).padStart(2, "0")}`;

    // Calcular idade
    let idade = hoje.getFullYear() - dataNasc.getFullYear();
    const mesCheck = hoje.getMonth() - dataNasc.getMonth();
    if (mesCheck < 0 || (mesCheck === 0 && hoje.getDate() < dataNasc.getDate())) {
      idade--;
    }

    // Dados base compartilhados
    const baseData = {
      clinicaNome: consulta.clinica.nome,
      clinicaCnpj: consulta.clinica.cnpj,
      clinicaTelefone: consulta.clinica.telefone || undefined,
      clinicaEmail: consulta.clinica.email || undefined,
      clinicaEndereco: consulta.clinica.endereco || undefined,
      clinicaNumero: consulta.clinica.numero || undefined,
      clinicaBairro: consulta.clinica.bairro || undefined,
      clinicaCidade: consulta.clinica.cidade || undefined,
      clinicaEstado: consulta.clinica.estado || undefined,
      clinicaCep: consulta.clinica.cep || undefined,
      clinicaSite: consulta.clinica.site || undefined,
      logoBase64,
      medicoNome: consulta.medico.usuario.nome,
      medicoCrm: consulta.medico.crm,
      medicoEspecialidade: consulta.medico.especialidade,
      pacienteNome: consulta.paciente.nome,
      pacienteCpf: consulta.paciente.cpf,
      pacienteDataNascimento: dataNascFormatada,
      dataEmissao,
      cidade: dados?.cidade || undefined,
    };

    let pdfBuffer: ArrayBuffer;

    switch (tipoDocumento) {
      // =====================================================
      // ATESTADOS DE AFASTAMENTO
      // =====================================================
      case "atestado-afastamento":
      case "atestado-afastamento-cid":
      case "atestado-afastamento-sem-cid":
      case "atestado-afastamento-historico-cid":
      case "atestado-afastamento-indeterminado": {
        const tipoMap: Record<string, string> = {
          "atestado-afastamento": "afastamento",
          "atestado-afastamento-cid": "afastamento-cid",
          "atestado-afastamento-sem-cid": "afastamento-sem-cid",
          "atestado-afastamento-historico-cid": "afastamento-historico-cid",
          "atestado-afastamento-indeterminado": "afastamento-indeterminado",
        };

        pdfBuffer = generateAtestadoPDF({
          ...baseData,
          diasAfastamento: dados?.diasAfastamento || 1,
          cidCodigo: dados?.cidCodigo || undefined,
          cidDescricao: dados?.cidDescricao || undefined,
          incluirCid: tipoDocumento === "atestado-afastamento-cid",
          observacoes: dados?.observacoes || undefined,
          tipo: tipoMap[tipoDocumento] as any,
          historicoCids: dados?.historicoCids || undefined,
        });
        break;
      }

      // =====================================================
      // ATESTADOS DE APTIDÃO
      // =====================================================
      case "atestado-aptidao-fisica-mental": {
        pdfBuffer = generateAtestadoAptidaoPDF({
          ...baseData,
          tipo: "fisica-mental",
          observacoes: dados?.observacoes || undefined,
          mesesValidade: dados?.mesesValidade || undefined,
        });
        break;
      }

      case "atestado-aptidao-piscinas": {
        pdfBuffer = generateAtestadoAptidaoPDF({
          ...baseData,
          tipo: "piscinas",
          observacoes: dados?.observacoes || undefined,
          mesesValidade: dados?.mesesValidade || undefined,
        });
        break;
      }

      case "atestado-aptidao-fisica": {
        pdfBuffer = generateAtestadoAptidaoPDF({
          ...baseData,
          tipo: "fisica",
          observacoes: dados?.observacoes || undefined,
          mesesValidade: dados?.mesesValidade || undefined,
        });
        break;
      }

      // =====================================================
      // DECLARAÇÕES DE COMPARECIMENTO
      // =====================================================
      case "declaracao-comparecimento": {
        pdfBuffer = generateDeclaracaoComparecimentoPDF({
          ...baseData,
          tipo: "simples",
          horaInicio: dados?.horaInicio || horaAtual,
          horaFim: dados?.horaFim || undefined,
        });
        break;
      }

      case "declaracao-comparecimento-acompanhante": {
        pdfBuffer = generateDeclaracaoComparecimentoPDF({
          ...baseData,
          tipo: "acompanhante",
          horaInicio: dados?.horaInicio || horaAtual,
          horaFim: dados?.horaFim || undefined,
          nomeAcompanhante: dados?.nomeAcompanhante || undefined,
          cidCodigo: dados?.cidCodigo || undefined,
          cidDescricao: dados?.cidDescricao || undefined,
        });
        break;
      }

      case "declaracao-comparecimento-horario-cid": {
        pdfBuffer = generateDeclaracaoComparecimentoPDF({
          ...baseData,
          tipo: "horario-cid",
          horaInicio: dados?.horaInicio || horaAtual,
          horaFim: dados?.horaFim || undefined,
          cidCodigo: dados?.cidCodigo || undefined,
          cidDescricao: dados?.cidDescricao || undefined,
        });
        break;
      }

      // =====================================================
      // RECEITAS
      // =====================================================
      case "receita-medica": {
        // O frontend envia "prescricoes" com {medicamento, dosagem, posologia, duracao}
        // O PDF espera "medicamentos" com {nome, quantidade, posologia}
        const medicamentosReceita = (dados?.prescricoes || dados?.medicamentos || []).map((p: any) => ({
          nome: p.medicamento || p.nome || "",
          dosagem: p.dosagem || undefined,
          posologia: [p.posologia, p.duracao ? `por ${p.duracao}` : ""].filter(Boolean).join(" — "),
        }));
        pdfBuffer = generateReceitaSimplesPDF({
          ...baseData,
          pacienteEndereco: (consulta.paciente as any).endereco || dados?.pacienteEndereco || undefined,
          pacienteNumero: (consulta.paciente as any).numero || undefined,
          pacienteBairro: (consulta.paciente as any).bairro || undefined,
          pacienteCidade: (consulta.paciente as any).cidade || undefined,
          pacienteSexo: (consulta.paciente as any).sexo || dados?.pacienteSexo || undefined,
          pacienteIdade: idade,
          medicamentos: medicamentosReceita,
        });
        break;
      }

      case "receita-controle-especial": {
        pdfBuffer = generateReceitaControleEspecialPDF({
          ...baseData,
          pacienteEndereco: dados?.pacienteEndereco || undefined,
          pacienteSexo: dados?.pacienteSexo || undefined,
          pacienteIdade: idade,
          uf: dados?.uf || undefined,
          dataValidade: dados?.dataValidade || undefined,
          medicamentos: dados?.medicamentos || [],
        });
        break;
      }

      // =====================================================
      // GUIA DE ENCAMINHAMENTO
      // =====================================================
      case "guia-encaminhamento": {
        pdfBuffer = generateGuiaEncaminhamentoPDF({
          ...baseData,
          pacienteEndereco: dados?.pacienteEndereco || undefined,
          pacienteCelular: (consulta.paciente as any).celular || undefined,
          pacienteSexo: dados?.pacienteSexo || undefined,
          pacienteIdade: idade,
          encaminharPara: dados?.encaminharPara || undefined,
          procedimentosSolicitados: dados?.procedimentosSolicitados || undefined,
          resumoHistoriaClinica: dados?.resumoHistoriaClinica || undefined,
          hipoteseDiagnostica: dados?.hipoteseDiagnostica || undefined,
          cidCodigo: dados?.cidCodigo || undefined,
          cidDescricao: dados?.cidDescricao || undefined,
          tipoVaga: dados?.tipoVaga || "ELETIVO",
        });
        break;
      }

      // =====================================================
      // RISCO CIRÚRGICO
      // =====================================================
      case "risco-cirurgico-cardiaco": {
        pdfBuffer = generateRiscoCirurgicoPDF({
          ...baseData,
          goldman: dados?.goldman || undefined,
          asa: dados?.asa || undefined,
          ecg: dados?.ecg || undefined,
          alergias: dados?.alergias || undefined,
          cirurgiasAnteriores: dados?.cirurgiasAnteriores || undefined,
          intercorrencias: dados?.intercorrencias || undefined,
          medicacoesEmUso: dados?.medicacoesEmUso || undefined,
          antecedentesPessoais: dados?.antecedentesPessoais || undefined,
          riscoCirurgicoCardiaco: dados?.riscoCirurgicoCardiaco || undefined,
          ecocardiograma: dados?.ecocardiograma || undefined,
          ergometria: dados?.ergometria || undefined,
          rxTorax: dados?.rxTorax || undefined,
          observacoes: dados?.observacoes || undefined,
        });
        break;
      }

      // =====================================================
      // JUSTIFICATIVA DE EXAMES
      // =====================================================
      case "justificativa-exames-plano": {
        pdfBuffer = generateJustificativaExamesPDF({
          ...baseData,
          convenio: dados?.convenio || undefined,
          justificativa: dados?.justificativa || undefined,
        });
        break;
      }

      // =====================================================
      // CONTROLE DE DIABETES
      // =====================================================
      case "controle-diabetes": {
        pdfBuffer = generateControleDiabetesPDF({
          ...baseData,
          analitico: false,
        });
        break;
      }

      case "controle-diabetes-analitico": {
        pdfBuffer = generateControleDiabetesPDF({
          ...baseData,
          analitico: true,
        });
        break;
      }

      // =====================================================
      // CONTROLE DE PRESSÃO ARTERIAL
      // =====================================================
      case "controle-pressao-arterial": {
        pdfBuffer = generateControlePressaoPDF({
          ...baseData,
          analitico: false,
        });
        break;
      }

      case "controle-pressao-arterial-analitico": {
        pdfBuffer = generateControlePressaoPDF({
          ...baseData,
          analitico: true,
        });
        break;
      }

      // =====================================================
      // FICHA DE ATENDIMENTO
      // =====================================================
      case "ficha-atendimento": {
        // Buscar prontuário da consulta
        const prontuario = await prisma.prontuario.findFirst({
          where: {
            consultaId,
            clinicaId,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        // Buscar CIDs selecionados
        const cidCodes = dados?.cidCodes || [];

        // Buscar exames selecionados
        const exames = dados?.exames || [];

        // Buscar prescrições
        const prescricoes = dados?.prescricoes || [];

        // Formatar data da consulta
        const dataConsulta = new Date(consulta.dataHora);
        const dataConsultaFormatada = `${String(dataConsulta.getDate()).padStart(2, "0")}/${String(dataConsulta.getMonth() + 1).padStart(2, "0")}/${dataConsulta.getFullYear()}`;

        pdfBuffer = generateFichaAtendimentoPDF({
          ...baseData,
          dataConsulta: dataConsultaFormatada,
          anamnese: prontuario?.anamnese || dados?.anamnese || "",
          cidCodes,
          exames,
          prescricoes,
        });
        break;
      }

      default:
        return NextResponse.json(
          { error: `Tipo de documento '${tipoDocumento}' ainda não implementado` },
          { status: 400 }
        );
    }

    // Retornar PDF como download
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${tipoDocumento}-${consulta.paciente.nome.replace(/\s+/g, "_")}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Erro ao gerar documento:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao gerar documento" },
      { status: 500 }
    );
  }
}
