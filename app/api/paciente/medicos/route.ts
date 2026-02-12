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

  return { authorized: true, clinicaId };
}

// GET /api/paciente/medicos
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const medicos = await prisma.medico.findMany({
      where: {
        clinicaId: auth.clinicaId,
        ativo: true,
      },
      select: {
        id: true,
        crm: true,
        especialidade: true,
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        usuario: {
          nome: "asc",
        },
      },
    });

    return NextResponse.json({ medicos });
  } catch (error) {
    console.error("Erro ao listar médicos:", error);
    return NextResponse.json(
      { error: "Erro ao listar médicos" },
      { status: 500 }
    );
  }
}
