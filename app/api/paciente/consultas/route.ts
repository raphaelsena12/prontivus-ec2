import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";

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

export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const where: any = {
      clinicaId: auth.clinicaId,
      pacienteId: auth.pacienteId,
      ...(search && {
        OR: [
          { medico: { usuario: { nome: { contains: search, mode: "insensitive" as const } } } },
          { tipoConsulta: { nome: { contains: search, mode: "insensitive" as const } } },
        ],
      }),
    };

    const consultas = await prisma.consulta.findMany({
      where,
      include: {
        medico: {
          include: {
            usuario: {
              select: {
                nome: true,
              },
            },
          },
        },
        tipoConsulta: {
          select: {
            nome: true,
          },
        },
      },
      orderBy: { dataHora: "desc" },
    });

    return NextResponse.json({
      consultas,
    });
  } catch (error) {
    console.error("Erro ao listar consultas:", error);
    return NextResponse.json(
      { error: "Erro ao listar consultas" },
      { status: 500 }
    );
  }
}
