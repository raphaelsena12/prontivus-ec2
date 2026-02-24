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

  return { authorized: true, clinicaId };
}

// GET /api/medico/pacientes - Buscar pacientes da clínica
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
      ativo: true,
      ...(search && {
        OR: [
          { nome: { contains: search, mode: "insensitive" as const } },
          { cpf: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const pacientes = await prisma.paciente.findMany({
      where,
      select: {
        id: true,
        numeroProntuario: true,
        nome: true,
        cpf: true,
        email: true,
        telefone: true,
        celular: true,
        dataNascimento: true,
        ativo: true,
      },
      orderBy: {
        nome: "asc",
      },
    });

    return NextResponse.json({ pacientes }, { status: 200 });
  } catch (error) {
    console.error("Erro ao buscar pacientes:", error);
    return NextResponse.json(
      { error: "Erro ao buscar pacientes" },
      { status: 500 }
    );
  }
}
