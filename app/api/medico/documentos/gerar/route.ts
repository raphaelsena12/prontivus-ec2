import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId, getUserMedicoId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import {
  generateAtestadoAfastamentoPDF,
  generateAtestadoAfastamentoSemCidPDF,
  generateAtestadoAfastamentoComCidPDF,
  generateAtestadoAfastamentoHistoricoCidPDF,
  generateAtestadoAfastamentoIndeterminadoPDF,
} from "@/lib/pdf/atestado-afastamento";
import {
  generateAtestadoAptidaoFisicaMentalPDF,
  generateAtestadoAptidaoFisicaPiscinasPDF,
  generateAtestadoAptidaoFisicaPDF,
} from "@/lib/pdf/atestado-aptidao";
import {
  generateDeclaracaoComparecimentoPDF,
  generateDeclaracaoComparecimentoAcompanhantePDF,
  generateDeclaracaoComparecimentoHorarioCidPDF,
} from "@/lib/pdf/declaracao-comparecimento";
import { generateReceitaSimplesPDF } from "@/lib/pdf/receita-simples";
import { generateReceitaControleEspecialPDF } from "@/lib/pdf/receita-controle-especial";
import { generateGuiaEncaminhamentoPDF } from "@/lib/pdf/guia-encaminhamento";
import { generateRiscoCirurgicoPDF } from "@/lib/pdf/risco-cirurgico";
import { generateJustificativaPedidosExamesPDF } from "@/lib/pdf/justificativa-exames";
import { generateControleDiabetesPDF, generateControleDiabetesAnaliticoPDF } from "@/lib/pdf/controle-diabetes";
import { generateControlePressaoPDF, generateControlePressaoAnaliticoPDF } from "@/lib/pdf/controle-pressao";
import { generateFichaAtendimentoPDF } from "@/lib/pdf/ficha-atendimento";
import sharp from "sharp";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

export async function POST(request: NextRequest) {
  try {
    // Autenticação
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { tipoDocumento, consultaId, dados } = body;

    if (!tipoDocumento || !consultaId) {
      return NextResponse.json({ error: "Tipo de documento e ID da consulta são obrigatórios" }, { status: 400 });
    }

    // Para ficha de atendimento, permitir médico, secretaria e admin-clinica
    // Para outros documentos, apenas médico
    const isFichaAtendimento = tipoDocumento === "ficha-atendimento";
    const userTipo = session.user.tipo;
    
    if (isFichaAtendimento) {
      // Permitir médico, secretaria e admin-clinica para ficha de atendimento
      if (userTipo !== TipoUsuario.MEDICO && 
          userTipo !== TipoUsuario.SECRETARIA && 
          userTipo !== TipoUsuario.ADMIN_CLINICA) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
      }
    } else {
      // Para outros documentos, apenas médico
      if (userTipo !== TipoUsuario.MEDICO) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
      }
    }

    const clinicaId = await getUserClinicaId();
    if (!clinicaId) {
      return NextResponse.json({ error: "Clínica não encontrada" }, { status: 403 });
    }

    // Para documentos que não são ficha de atendimento, ainda precisa de médico
    if (!isFichaAtendimento) {
      const medicoId = await getUserMedicoId();
      if (!medicoId) {
        return NextResponse.json({ error: "Médico não encontrado" }, { status: 403 });
      }
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
      case "atestado-afastamento": {
        const consultaDHAfast = new Date(consulta.dataHora);
        const dataConsultaAfast = `${String(consultaDHAfast.getDate()).padStart(2, "0")}/${String(consultaDHAfast.getMonth() + 1).padStart(2, "0")}/${consultaDHAfast.getFullYear()}`;
        const horaConsultaAfast = `${String(consultaDHAfast.getHours()).padStart(2, "0")}:${String(consultaDHAfast.getMinutes()).padStart(2, "0")}:${String(consultaDHAfast.getSeconds()).padStart(2, "0")}`;
        pdfBuffer = generateAtestadoAfastamentoPDF({
          ...baseData,
          diasAfastamento: dados?.diasAfastamento || 1,
          observacoes: dados?.observacoes || undefined,
          dataConsulta: dataConsultaAfast,
          horaConsulta: horaConsultaAfast,
          fichaNumero: consulta.paciente.numeroProntuario
            ? String(consulta.paciente.numeroProntuario).padStart(5, "0")
            : undefined,
        });
        break;
      }

      case "atestado-afastamento-sem-cid": {
        const consultaDHSemCid = new Date(consulta.dataHora);
        const dataConsultaSemCid = `${String(consultaDHSemCid.getDate()).padStart(2, "0")}/${String(consultaDHSemCid.getMonth() + 1).padStart(2, "0")}/${consultaDHSemCid.getFullYear()}`;
        const horaConsultaSemCid = `${String(consultaDHSemCid.getHours()).padStart(2, "0")}:${String(consultaDHSemCid.getMinutes()).padStart(2, "0")}:${String(consultaDHSemCid.getSeconds()).padStart(2, "0")}`;
        pdfBuffer = generateAtestadoAfastamentoSemCidPDF({
          ...baseData,
          diasAfastamento: dados?.diasAfastamento || 1,
          observacoes: dados?.observacoes || undefined,
          dataConsulta: dataConsultaSemCid,
          horaConsulta: horaConsultaSemCid,
          fichaNumero: consulta.paciente.numeroProntuario
            ? String(consulta.paciente.numeroProntuario).padStart(5, "0")
            : undefined,
        });
        break;
      }

      case "atestado-afastamento-cid": {
        const consultaDH = new Date(consulta.dataHora);
        const dataConsultaFmt = `${String(consultaDH.getDate()).padStart(2, "0")}/${String(consultaDH.getMonth() + 1).padStart(2, "0")}/${consultaDH.getFullYear()}`;
        const horaConsultaFmt = `${String(consultaDH.getHours()).padStart(2, "0")}:${String(consultaDH.getMinutes()).padStart(2, "0")}:${String(consultaDH.getSeconds()).padStart(2, "0")}`;
        pdfBuffer = generateAtestadoAfastamentoComCidPDF({
          ...baseData,
          diasAfastamento: dados?.diasAfastamento || 1,
          cidCodigo: dados?.cidCodigo || undefined,
          cidDescricao: dados?.cidDescricao || undefined,
          observacoes: dados?.observacoes || undefined,
          dataConsulta: dataConsultaFmt,
          horaConsulta: horaConsultaFmt,
          fichaNumero: consulta.paciente.numeroProntuario
            ? String(consulta.paciente.numeroProntuario).padStart(5, "0")
            : undefined,
        });
        break;
      }

      case "atestado-afastamento-historico-cid": {
        const consultaDHHist = new Date(consulta.dataHora);
        const dataConsultaHist = `${String(consultaDHHist.getDate()).padStart(2, "0")}/${String(consultaDHHist.getMonth() + 1).padStart(2, "0")}/${consultaDHHist.getFullYear()}`;
        const horaConsultaHist = `${String(consultaDHHist.getHours()).padStart(2, "0")}:${String(consultaDHHist.getMinutes()).padStart(2, "0")}:${String(consultaDHHist.getSeconds()).padStart(2, "0")}`;
        pdfBuffer = generateAtestadoAfastamentoHistoricoCidPDF({
          ...baseData,
          historicoCids: dados?.historicoCids || undefined,
          observacoes: dados?.observacoes || undefined,
          dataConsulta: dataConsultaHist,
          horaConsulta: horaConsultaHist,
          fichaNumero: consulta.paciente.numeroProntuario
            ? String(consulta.paciente.numeroProntuario).padStart(5, "0")
            : undefined,
        });
        break;
      }

      case "atestado-afastamento-indeterminado": {
        const consultaDHInd = new Date(consulta.dataHora);
        const dataConsultaInd = `${String(consultaDHInd.getDate()).padStart(2, "0")}/${String(consultaDHInd.getMonth() + 1).padStart(2, "0")}/${consultaDHInd.getFullYear()}`;
        const horaConsultaInd = `${String(consultaDHInd.getHours()).padStart(2, "0")}:${String(consultaDHInd.getMinutes()).padStart(2, "0")}:${String(consultaDHInd.getSeconds()).padStart(2, "0")}`;
        pdfBuffer = generateAtestadoAfastamentoIndeterminadoPDF({
          ...baseData,
          cidCodigo: dados?.cidCodigo || undefined,
          cidDescricao: dados?.cidDescricao || undefined,
          observacoes: dados?.observacoes || undefined,
          dataConsulta: dataConsultaInd,
          horaConsulta: horaConsultaInd,
          fichaNumero: consulta.paciente.numeroProntuario
            ? String(consulta.paciente.numeroProntuario).padStart(5, "0")
            : undefined,
        });
        break;
      }

      // =====================================================
      // ATESTADOS DE APTIDÃO
      // =====================================================
      case "atestado-aptidao-fisica-mental": {
        const consultaDHApt1 = new Date(consulta.dataHora);
        const dataConsultaApt1 = `${String(consultaDHApt1.getDate()).padStart(2, "0")}/${String(consultaDHApt1.getMonth() + 1).padStart(2, "0")}/${consultaDHApt1.getFullYear()}`;
        const horaConsultaApt1 = `${String(consultaDHApt1.getHours()).padStart(2, "0")}:${String(consultaDHApt1.getMinutes()).padStart(2, "0")}:${String(consultaDHApt1.getSeconds()).padStart(2, "0")}`;
        pdfBuffer = generateAtestadoAptidaoFisicaMentalPDF({
          ...baseData,
          observacoes: dados?.observacoes || undefined,
          mesesValidade: dados?.mesesValidade || undefined,
          dataConsulta: dataConsultaApt1,
          horaConsulta: horaConsultaApt1,
          fichaNumero: consulta.paciente.numeroProntuario
            ? String(consulta.paciente.numeroProntuario).padStart(5, "0")
            : undefined,
        });
        break;
      }

      case "atestado-aptidao-piscinas": {
        const consultaDHApt2 = new Date(consulta.dataHora);
        const dataConsultaApt2 = `${String(consultaDHApt2.getDate()).padStart(2, "0")}/${String(consultaDHApt2.getMonth() + 1).padStart(2, "0")}/${consultaDHApt2.getFullYear()}`;
        const horaConsultaApt2 = `${String(consultaDHApt2.getHours()).padStart(2, "0")}:${String(consultaDHApt2.getMinutes()).padStart(2, "0")}:${String(consultaDHApt2.getSeconds()).padStart(2, "0")}`;
        pdfBuffer = generateAtestadoAptidaoFisicaPiscinasPDF({
          ...baseData,
          observacoes: dados?.observacoes || undefined,
          dataConsulta: dataConsultaApt2,
          horaConsulta: horaConsultaApt2,
          fichaNumero: consulta.paciente.numeroProntuario
            ? String(consulta.paciente.numeroProntuario).padStart(5, "0")
            : undefined,
          mesesValidade: dados?.mesesValidade || undefined,
        });
        break;
      }

      case "atestado-aptidao-fisica": {
        pdfBuffer = generateAtestadoAptidaoFisicaPDF({
          ...baseData,
          observacoes: dados?.observacoes || undefined,
          mesesValidade: dados?.mesesValidade || undefined,
        });
        break;
      }

      // =====================================================
      // DECLARAÇÕES DE COMPARECIMENTO
      // =====================================================
      case "declaracao-comparecimento": {
        const consultaDHComp = new Date(consulta.dataHora);
        const dataConsultaComp = `${String(consultaDHComp.getDate()).padStart(2, "0")}/${String(consultaDHComp.getMonth() + 1).padStart(2, "0")}/${consultaDHComp.getFullYear()}`;
        const horaConsultaComp = `${String(consultaDHComp.getHours()).padStart(2, "0")}:${String(consultaDHComp.getMinutes()).padStart(2, "0")}:${String(consultaDHComp.getSeconds()).padStart(2, "0")}`;
        pdfBuffer = generateDeclaracaoComparecimentoPDF({
          ...baseData,
          dataConsulta: dataConsultaComp,
          horaConsulta: horaConsultaComp,
          fichaNumero: consulta.paciente.numeroProntuario
            ? String(consulta.paciente.numeroProntuario).padStart(5, "0")
            : undefined,
          horaInicio: dados?.horaInicio || horaConsultaComp,
          horaFim: dados?.horaFim || undefined,
        });
        break;
      }

      case "declaracao-comparecimento-acompanhante": {
        const consultaDHAcomp = new Date(consulta.dataHora);
        const dataConsultaAcomp = `${String(consultaDHAcomp.getDate()).padStart(2, "0")}/${String(consultaDHAcomp.getMonth() + 1).padStart(2, "0")}/${consultaDHAcomp.getFullYear()}`;
        const horaConsultaAcomp = `${String(consultaDHAcomp.getHours()).padStart(2, "0")}:${String(consultaDHAcomp.getMinutes()).padStart(2, "0")}:${String(consultaDHAcomp.getSeconds()).padStart(2, "0")}`;
        pdfBuffer = generateDeclaracaoComparecimentoAcompanhantePDF({
          ...baseData,
          dataConsulta: dataConsultaAcomp,
          horaConsulta: horaConsultaAcomp,
          fichaNumero: consulta.paciente.numeroProntuario
            ? String(consulta.paciente.numeroProntuario).padStart(5, "0")
            : undefined,
          horaInicio: dados?.horaInicio || horaConsultaAcomp,
          horaFim: dados?.horaFim || undefined,
          nomeAcompanhante: dados?.nomeAcompanhante || undefined,
          cidCodigo: dados?.cidCodigo || undefined,
          cidDescricao: dados?.cidDescricao || undefined,
        });
        break;
      }

      case "declaracao-comparecimento-horario-cid": {
        const consultaDHHorario = new Date(consulta.dataHora);
        const dataConsultaHorario = `${String(consultaDHHorario.getDate()).padStart(2, "0")}/${String(consultaDHHorario.getMonth() + 1).padStart(2, "0")}/${consultaDHHorario.getFullYear()}`;
        const horaConsultaHorario = `${String(consultaDHHorario.getHours()).padStart(2, "0")}:${String(consultaDHHorario.getMinutes()).padStart(2, "0")}:${String(consultaDHHorario.getSeconds()).padStart(2, "0")}`;
        pdfBuffer = generateDeclaracaoComparecimentoHorarioCidPDF({
          ...baseData,
          dataConsulta: dataConsultaHorario,
          horaConsulta: horaConsultaHorario,
          fichaNumero: consulta.paciente.numeroProntuario
            ? String(consulta.paciente.numeroProntuario).padStart(5, "0")
            : undefined,
          horaInicio: dados?.horaInicio || horaConsultaHorario,
          horaFim: dados?.horaFim || undefined,
          nomeAcompanhante: dados?.nomeAcompanhante || undefined,
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
          posologia: p.posologia || "",
          duracao: p.duracao || undefined,
          quantidade: p.quantidade || undefined,
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
        pdfBuffer = generateJustificativaPedidosExamesPDF({
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
        });
        break;
      }

      case "controle-diabetes-analitico": {
        pdfBuffer = generateControleDiabetesAnaliticoPDF({
          ...baseData,
        });
        break;
      }

      // =====================================================
      // CONTROLE DE PRESSÃO ARTERIAL
      // =====================================================
      case "controle-pressao-arterial": {
        pdfBuffer = generateControlePressaoPDF({
          ...baseData,
        });
        break;
      }

      case "controle-pressao-arterial-analitico": {
        pdfBuffer = generateControlePressaoAnaliticoPDF({
          ...baseData,
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

        // Buscar CIDs - primeiro dos dados fornecidos, senão buscar do documento salvo anteriormente
        let cidCodes = dados?.cidCodes || [];
        if (cidCodes.length === 0) {
          // Tentar buscar do documento gerado anteriormente
          const documentoAnterior = await prisma.documentoGerado.findFirst({
            where: {
              consultaId,
              tipoDocumento: "ficha-atendimento",
              clinicaId,
            },
            orderBy: {
              createdAt: "desc",
            },
          });
          if (documentoAnterior?.dados && typeof documentoAnterior.dados === 'object') {
            const dadosAnteriores = documentoAnterior.dados as any;
            cidCodes = dadosAnteriores.cidCodes || [];
          }
        }

        // Buscar exames - primeiro dos dados fornecidos, senão buscar do banco
        let exames = dados?.exames || [];
        if (exames.length === 0) {
          // Buscar exames solicitados da consulta
          const solicitacoesExames = await prisma.solicitacaoExame.findMany({
            where: {
              consultaId,
              clinicaId,
            },
            include: {
              exame: {
                select: {
                  nome: true,
                  tipo: true,
                },
              },
            },
          });
          exames = solicitacoesExames.map(se => ({
            nome: se.exame.nome,
            tipo: se.exame.tipo || "Laboratorial",
          }));
        }

        // Buscar protocolos - primeiro dos dados fornecidos, senão buscar do documento salvo
        let protocolos = dados?.protocolos || [];
        if (protocolos.length === 0) {
          const documentoAnterior = await prisma.documentoGerado.findFirst({
            where: {
              consultaId,
              tipoDocumento: "ficha-atendimento",
              clinicaId,
            },
            orderBy: {
              createdAt: "desc",
            },
          });
          if (documentoAnterior?.dados && typeof documentoAnterior.dados === 'object') {
            const dadosAnteriores = documentoAnterior.dados as any;
            protocolos = dadosAnteriores.protocolos || [];
          }
        }

        // Buscar prescrições - primeiro dos dados fornecidos, senão buscar do banco
        let prescricoes = dados?.prescricoes || [];
        if (prescricoes.length === 0) {
          // Buscar prescrições da consulta
          const prescricoesMedicamentos = await prisma.prescricaoMedicamento.findMany({
            where: {
              consultaId,
              clinicaId,
            },
            include: {
              medicamento: {
                select: {
                  nome: true,
                  apresentacao: true,
                  concentracao: true,
                  unidade: true,
                },
              },
            },
          });
          prescricoes = prescricoesMedicamentos.map(pm => {
            const dosagem = pm.medicamento.concentracao && pm.medicamento.unidade
              ? `${pm.medicamento.concentracao}${pm.medicamento.unidade}`
              : pm.medicamento.apresentacao || "";
            return {
              medicamento: pm.medicamento.nome,
              dosagem,
              posologia: pm.posologia,
              duracao: pm.observacoes || (pm.quantidade ? `${pm.quantidade} unidades` : ""),
            };
          });
        }

        // Formatar data e hora da consulta
        const dataConsulta = new Date(consulta.dataHora);
        const dataConsultaFormatada = `${String(dataConsulta.getDate()).padStart(2, "0")}/${String(dataConsulta.getMonth() + 1).padStart(2, "0")}/${dataConsulta.getFullYear()}`;
        const horaConsultaFormatada = `${String(dataConsulta.getHours()).padStart(2, "0")}:${String(dataConsulta.getMinutes()).padStart(2, "0")}`;

        pdfBuffer = generateFichaAtendimentoPDF({
          ...baseData,
          dataConsulta: dataConsultaFormatada,
          horaConsulta: horaConsultaFormatada,
          anamnese: prontuario?.anamnese || dados?.anamnese || "",
          cidCodes,
          exames,
          protocolos,
          prescricoes,
          atestados: dados?.atestados || [],
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
