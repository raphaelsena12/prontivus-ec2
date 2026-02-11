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
import fs from "fs";
import path from "path";

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

    // Tentar carregar logo da clínica
    let logoBase64: string | undefined;
    try {
      const logoPath = path.join(process.cwd(), "public", "LogotipoemFundoTransparente.webp");
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        logoBase64 = `data:image/webp;base64,${logoBuffer.toString("base64")}`;
      }
    } catch {
      // Logo não disponível, segue sem
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
        pdfBuffer = generateReceitaSimplesPDF({
          ...baseData,
          pacienteEndereco: dados?.pacienteEndereco || undefined,
          pacienteSexo: dados?.pacienteSexo || undefined,
          pacienteIdade: idade,
          medicamentos: dados?.medicamentos || [],
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
