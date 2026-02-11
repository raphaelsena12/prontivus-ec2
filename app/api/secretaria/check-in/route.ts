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

// GET /api/secretaria/check-in - Lista pacientes de hoje
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
        dataHora: {
          gte: hoje,
          lt: amanha,
        },
        status: {
          in: ["AGENDADA", "CONFIRMADA"],
        },
      },
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
        dataHora: "asc",
      },
    });

    return NextResponse.json({ consultas }, { status: 200 });
  } catch (error) {
    console.error("Erro ao buscar consultas de hoje:", error);
    return NextResponse.json(
      { error: "Erro ao buscar consultas" },
      { status: 500 }
    );
  }
}

// PATCH /api/secretaria/check-in - Fazer check-in de uma consulta
export async function PATCH(request: NextRequest) {
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

    // Verificar se a consulta pertence à clínica
    const consulta = await prisma.consulta.findFirst({
      where: {
        id: consultaId,
        clinicaId: auth.clinicaId,
      },
    });

    if (!consulta) {
      return NextResponse.json(
        { error: "Consulta não encontrada" },
        { status: 404 }
      );
    }

    // Atualizar status para CONFIRMADA (check-in realizado)
    const consultaAtualizada = await prisma.consulta.update({
      where: {
        id: consultaId,
      },
      data: {
        status: "CONFIRMADA",
      },
      include: {
        paciente: {
          select: {
            id: true,
            nome: true,
            cpf: true,
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
      },
    });

    return NextResponse.json(
      { consulta: consultaAtualizada, message: "Check-in realizado com sucesso" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro ao fazer check-in:", error);
    return NextResponse.json(
      { error: "Erro ao realizar check-in" },
      { status: 500 }
    );
  }
}













