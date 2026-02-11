import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { uploadPDFToS3 } from "@/lib/s3-service";

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
          select: {
            id: true,
            nome: true,
            cpf: true,
            dataNascimento: true,
            telefone: true,
            celular: true,
            email: true,
            observacoes: true,
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

    return NextResponse.json(
      {
        consulta,
        prontuario,
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
    const { consultaId, anamnese, exameFisico, diagnostico, conduta, evolucao } = body;

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
          evolucao: evolucao || null,
        },
      });
    }

    // Atualizar status da consulta para REALIZADA
    await prisma.consulta.update({
      where: {
        id: consultaId,
      },
      data: {
        status: "REALIZADA",
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

      if (consultaCompleta && prontuario) {
        const pdfBuffer = generateProntuarioPDF({
          clinicaNome: consultaCompleta.clinica.nome,
          clinicaCnpj: consultaCompleta.clinica.cnpj || "",
          clinicaEndereco: consultaCompleta.clinica.endereco || undefined,
          medicoNome: consultaCompleta.medico.usuario.nome,
          medicoCrm: consultaCompleta.medico.crm,
          medicoEspecialidade: consultaCompleta.medico.especialidade || "",
          pacienteNome: consultaCompleta.paciente.nome,
          pacienteCpf: consultaCompleta.paciente.cpf,
          pacienteDataNascimento: consultaCompleta.paciente.dataNascimento.toISOString().split('T')[0],
          dataConsulta: consultaCompleta.dataHora.toISOString().split('T')[0],
          anamnese: prontuario.anamnese || "",
          exameFisico: prontuario.exameFisico || "",
          diagnostico: prontuario.diagnostico || "",
          conduta: prontuario.conduta || "",
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
    } catch (error) {
      // Não falhar o processo se o upload do PDF falhar
      console.error("Erro ao gerar e fazer upload do PDF do prontuário:", error);
    }

    return NextResponse.json(
      {
        prontuario,
        message: "Prontuário salvo com sucesso",
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
