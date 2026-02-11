import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";

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

// GET /api/medico/fila-atendimento - Lista pacientes em fila de atendimento (check-in realizado)
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const consultas = await prisma.consulta.findMany({
      where: {
        clinicaId: auth.clinicaId,
        medicoId: auth.medicoId,
        dataHora: {
          gte: hoje,
          lt: amanha,
        },
        status: "CONFIRMADA", // Apenas pacientes que já fizeram check-in
      },
      include: {
        paciente: {
          select: {
            id: true,
            nome: true,
            cpf: true,
            telefone: true,
            celular: true,
            dataNascimento: true,
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
            nomeFantasia: true,
            razaoSocial: true,
          },
        },
        planoSaude: {
          select: {
            nome: true,
          },
        },
      },
      orderBy: {
        dataHora: "asc", // Ordenar por horário, mais antigo primeiro
      },
    });

    return NextResponse.json({ consultas }, { status: 200 });
  } catch (error) {
    console.error("Erro ao buscar fila de atendimento:", error);
    return NextResponse.json(
      { error: "Erro ao buscar fila de atendimento" },
      { status: 500 }
    );
  }
}

// POST /api/medico/fila-atendimento - Iniciar atendimento de uma consulta
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await request.json();
    const { consultaId } = body;

    if (!consultaId) {
      return NextResponse.json(
        { error: "ID da consulta é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se a consulta pertence ao médico e está confirmada
    const consulta = await prisma.consulta.findFirst({
      where: {
        id: consultaId,
        clinicaId: auth.clinicaId,
        medicoId: auth.medicoId,
        status: "CONFIRMADA",
      },
      include: {
        paciente: true,
        tipoConsulta: {
          select: {
            nome: true,
          },
        },
      },
    });

    if (!consulta) {
      return NextResponse.json(
        { error: "Consulta não encontrada ou não está disponível para atendimento" },
        { status: 404 }
      );
    }

    // Verificar se já existe prontuário para esta consulta
    let prontuario = await prisma.prontuario.findFirst({
      where: {
        consultaId: consultaId,
      },
    });

    // Se não existir, criar um prontuário vazio
    if (!prontuario) {
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
        },
      });
    }

    // Atualizar status da consulta para REALIZADA (opcional - pode deixar como CONFIRMADA até finalizar)
    // Por enquanto, vamos deixar como CONFIRMADA e só mudar para REALIZADA quando finalizar o prontuário

    return NextResponse.json(
      { 
        prontuario,
        consulta,
        message: "Atendimento iniciado com sucesso" 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro ao iniciar atendimento:", error);
    return NextResponse.json(
      { error: "Erro ao iniciar atendimento" },
      { status: 500 }
    );
  }
}

