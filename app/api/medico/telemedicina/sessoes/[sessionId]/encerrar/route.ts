import { NextRequest, NextResponse } from "next/server";
import { checkMedicoAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { deleteChimeMeeting } from "@/lib/chime-service";
import { generateFichaAtendimentoPDF } from "@/lib/pdf/ficha-atendimento";
import { generateProntuarioPDF } from "@/lib/pdf/prontuario";
import { uploadPDFToS3, areAwsCredentialsConfigured } from "@/lib/s3-service";
import { auditLogFromRequest } from "@/lib/audit-log";

// POST /api/medico/telemedicina/sessoes/[sessionId]/encerrar
// Encerra a sessão de telemedicina e finaliza a consulta
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const auth = await checkMedicoAuth();
    if (!auth.authorized) return auth.response;

    const { sessionId } = await params;
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

    const sessao = await prisma.telemedicineSession.findUnique({
      where: { id: sessionId },
      include: {
        consulta: {
          select: {
            id: true,
            clinicaId: true,
            medicoId: true,
            inicioAtendimento: true,
            dataHora: true,
            pacienteId: true,
            paciente: {
              select: { id: true, nome: true, cpf: true, dataNascimento: true, numeroProntuario: true },
            },
            medico: {
              select: {
                id: true, crm: true, especialidade: true,
                usuario: { select: { nome: true } },
              },
            },
            clinica: {
              select: {
                id: true, nome: true, cnpj: true, telefone: true, email: true,
                endereco: true, numero: true, bairro: true, cidade: true, estado: true,
                cep: true, site: true,
              },
            },
          },
        },
      },
    });

    if (!sessao) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
    }

    if (sessao.consulta.clinicaId !== auth.clinicaId) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    if (sessao.status === "finished" || sessao.status === "cancelled") {
      return NextResponse.json({ message: "Sessão já encerrada" });
    }

    const agora = new Date();

    // Encerra a reunião no AWS Chime
    if (sessao.meetingId) {
      try {
        await deleteChimeMeeting(sessao.meetingId);
      } catch (err) {
        // Loga mas não bloqueia (reunião pode já ter expirado)
        console.warn("Aviso ao deletar reunião Chime:", err);
      }
    }

    // Calcula duração em segundos
    const duracaoSegundos = sessao.startedAt
      ? Math.floor((agora.getTime() - sessao.startedAt.getTime()) / 1000)
      : 0;

    // Atualiza sessão para finished
    await prisma.telemedicineSession.update({
      where: { id: sessao.id },
      data: { status: "finished", finishedAt: agora },
    });

    // Atualiza leave time do médico
    await prisma.telemedicineParticipant.updateMany({
      where: { sessionId, medicoId: auth.medicoId, role: "DOCTOR" },
      data: { leaveTime: agora },
    });

    // Finaliza a consulta
    await prisma.consulta.update({
      where: { id: sessao.consultaId },
      data: {
        status: "REALIZADA",
        fimAtendimento: agora,
      },
    });

    // P0-4: Retorna status do médico para ONLINE após encerrar sessão
    await prisma.medicoTelemedicina.updateMany({
      where: { medicoId: sessao.consulta.medicoId },
      data: { status: "ONLINE" },
    });

    // Registra log de encerramento
    await prisma.telemedicineLog.create({
      data: {
        sessionId,
        medicoId: auth.medicoId,
        role: "DOCTOR",
        eventType: "SESSION_ENDED",
        ipAddress: ip,
        metadata: { duracaoSegundos, finishedAt: agora.toISOString() },
      },
    });

    // Gerar documentos automaticamente (mesmo fluxo do atendimento presencial)
    const consultaId = sessao.consultaId;
    const clinicaId = sessao.consulta.clinicaId;
    const consulta = sessao.consulta;

    // Gerar PDF do prontuário e upload para S3
    try {
      const prontuarioExistente = await prisma.prontuario.findFirst({
        where: { consultaId, clinicaId },
        orderBy: { createdAt: "desc" },
      });

      if (prontuarioExistente && areAwsCredentialsConfigured()) {
        const dataNascPron = new Date(consulta.paciente.dataNascimento);
        const dataNascPronFmt = `${String(dataNascPron.getDate()).padStart(2, "0")}/${String(dataNascPron.getMonth() + 1).padStart(2, "0")}/${dataNascPron.getFullYear()}`;
        const dataEmissaoPron = `${String(agora.getDate()).padStart(2, "0")}/${String(agora.getMonth() + 1).padStart(2, "0")}/${agora.getFullYear()}`;

        const pronPdfBuffer = generateProntuarioPDF({
          clinicaNome: consulta.clinica.nome,
          clinicaCnpj: consulta.clinica.cnpj,
          clinicaEndereco: consulta.clinica.endereco || undefined,
          medicoNome: consulta.medico.usuario.nome,
          medicoCrm: consulta.medico.crm,
          medicoEspecialidade: consulta.medico.especialidade || "",
          pacienteNome: consulta.paciente.nome,
          pacienteCpf: consulta.paciente.cpf,
          pacienteDataNascimento: dataNascPronFmt,
          pacienteMatricula: consulta.paciente.numeroProntuario
            ? String(consulta.paciente.numeroProntuario).padStart(6, "0")
            : undefined,
          dataEmissao: dataEmissaoPron,
          dataConsulta: consulta.dataHora.toISOString().split("T")[0],
          anamnese: prontuarioExistente.anamnese || "",
          exameFisico: prontuarioExistente.exameFisico || "",
          diagnostico: prontuarioExistente.diagnostico || "",
          conduta: prontuarioExistente.conduta || "",
          orientacoesConduta: prontuarioExistente.orientacoesConduta || "",
          orientacoes: prontuarioExistente.orientacoes || "",
          evolucao: prontuarioExistente.evolucao || "",
        });

        const pronBuffer = Buffer.from(pronPdfBuffer);
        const pronS3Key = await uploadPDFToS3(
          pronBuffer,
          `prontuario-${consultaId}-${Date.now()}.pdf`,
          {
            clinicaId,
            medicoId: consulta.medicoId,
            consultaId,
            pacienteId: consulta.pacienteId,
            tipoDocumento: "prontuario",
            categoria: "Prontuários",
          },
          "application/pdf"
        );
        console.log("✅ Prontuário telemedicina salvo no S3:", pronS3Key);
      }
    } catch (pronError) {
      console.error("Erro ao gerar prontuário PDF (não bloqueante):", pronError);
    }

    // Gerar ficha de atendimento automaticamente
    try {

      // Buscar prontuário da consulta
      const prontuario = await prisma.prontuario.findFirst({
        where: { consultaId, clinicaId },
        orderBy: { createdAt: "desc" },
      });

      // Buscar CIDs da consulta
      const cidsSalvos = await prisma.consultaCid.findMany({
        where: { consultaId, clinicaId },
      });
      const cidCodes = cidsSalvos.map((c) => ({
        code: c.code,
        description: c.description,
      }));

      // Buscar exames solicitados
      const solicitacoesExames = await prisma.solicitacaoExame.findMany({
        where: { consultaId, clinicaId },
        include: { exame: { select: { nome: true, tipo: true } } },
      });
      const exames = solicitacoesExames.map((se) => ({
        nome: se.exame.nome,
        tipo: se.exame.tipo || "Laboratorial",
      }));

      // Buscar prescrições
      const consultaPrescricoes = await prisma.consultaPrescricao.findMany({
        where: { consultaId, clinicaId },
        orderBy: { createdAt: "asc" },
      });
      const prescricoes = consultaPrescricoes.map((cp) => ({
        medicamento: cp.medicamento,
        dosagem: cp.dosagem || "",
        posologia: cp.posologia,
        duracao: cp.duracao || "",
      }));

      // Criar DocumentoGerado para obter número sequencial
      const docNovo = await prisma.documentoGerado.create({
        data: {
          clinicaId,
          consultaId,
          medicoId: consulta.medicoId,
          tipoDocumento: "ficha-atendimento",
          nomeDocumento: "Ficha de Atendimento",
        },
        select: { id: true, numero: true },
      });
      const fichaNumero = String(docNovo.numero).padStart(6, "0");

      // Formatar datas
      const dataConsulta = new Date(consulta.dataHora);
      const dataConsultaFormatada = `${String(dataConsulta.getDate()).padStart(2, "0")}/${String(dataConsulta.getMonth() + 1).padStart(2, "0")}/${dataConsulta.getFullYear()}`;
      const horaConsultaFormatada = `${String(dataConsulta.getHours()).padStart(2, "0")}:${String(dataConsulta.getMinutes()).padStart(2, "0")}`;
      const dataNasc = new Date(consulta.paciente.dataNascimento);
      const dataNascFormatada = `${String(dataNasc.getDate()).padStart(2, "0")}/${String(dataNasc.getMonth() + 1).padStart(2, "0")}/${dataNasc.getFullYear()}`;
      const dataEmissao = `${String(agora.getDate()).padStart(2, "0")}/${String(agora.getMonth() + 1).padStart(2, "0")}/${agora.getFullYear()}`;

      // Gerar PDF
      const pdfBuffer = generateFichaAtendimentoPDF({
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
        medicoNome: consulta.medico.usuario.nome,
        medicoCrm: consulta.medico.crm,
        medicoEspecialidade: consulta.medico.especialidade,
        pacienteNome: consulta.paciente.nome,
        pacienteCpf: consulta.paciente.cpf,
        pacienteDataNascimento: dataNascFormatada,
        pacienteMatricula: consulta.paciente.numeroProntuario
          ? String(consulta.paciente.numeroProntuario).padStart(6, "0")
          : undefined,
        dataEmissao,
        fichaNumero,
        dataConsulta: dataConsultaFormatada,
        horaConsulta: horaConsultaFormatada,
        anamnese: prontuario?.anamnese || "",
        cidCodes,
        exames,
        prescricoes,
        orientacoes: prontuario?.orientacoes || "",
      });

      // Upload para S3
      if (areAwsCredentialsConfigured()) {
        const buffer = Buffer.from(pdfBuffer);
        const s3Key = await uploadPDFToS3(
          buffer,
          `ficha-atendimento-${consultaId}-${Date.now()}.pdf`,
          {
            clinicaId,
            medicoId: consulta.medicoId,
            consultaId,
            pacienteId: consulta.pacienteId,
            tipoDocumento: "ficha-atendimento",
            categoria: "Fichas de Atendimento",
          },
          "application/pdf"
        );

        // Atualizar DocumentoGerado com a chave do S3
        await prisma.documentoGerado.update({
          where: { id: docNovo.id },
          data: { s3Key },
        });

        console.log("✅ Ficha de atendimento gerada e salva no S3:", s3Key);
      } else {
        console.log("✅ Ficha de atendimento gerada (S3 não configurado, sem upload)");
      }
    } catch (fichaError) {
      console.error("Erro ao gerar ficha de atendimento (não bloqueante):", fichaError);
    }

    // Audit log (mesmo padrão do atendimento presencial)
    auditLogFromRequest(request, {
      action: "UPDATE",
      resource: "Consulta",
      resourceId: consultaId,
      details: {
        pacienteId: consulta.pacienteId,
        consultaId,
        operacao: "Finalizou atendimento via telemedicina",
        duracaoSegundos,
      },
    });

    return NextResponse.json({
      success: true,
      duracaoSegundos,
      finishedAt: agora.toISOString(),
    });
  } catch (error) {
    console.error("Erro ao encerrar sessão de telemedicina:", error);
    return NextResponse.json({ error: "Erro ao encerrar sessão" }, { status: 500 });
  }
}
