import { NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";
import { prisma } from "./prisma";

export async function checkAdminClinicaAuth() {
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

  if (session.user.tipo !== TipoUsuario.ADMIN_CLINICA) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso negado. Apenas Admin Clínica." },
        { status: 403 }
      ),
    };
  }

  const clinicaId = await getUserClinicaId();

  if (!clinicaId) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Clínica não selecionada" },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, clinicaId };
}

export async function checkMedicoAuth() {
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

  // Verificar papel no tenant atual
  if (session.user.tipo !== TipoUsuario.MEDICO) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso negado. Apenas Médico." },
        { status: 403 }
      ),
    };
  }

  // Verificar se tem clínica selecionada
  if (!session.user.clinicaId) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Clínica não selecionada" },
        { status: 403 }
      ),
    };
  }

  // Buscar o médico pelo usuarioId E clinicaId atual
  // Importante: Um usuário pode ser médico em múltiplas clínicas
  const medico = await prisma.medico.findFirst({
    where: {
      usuarioId: session.user.id,
      clinicaId: session.user.clinicaId,
      ativo: true,
    },
    select: { id: true, clinicaId: true },
  });

  if (!medico) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Médico não encontrado nesta clínica" },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    medicoId: medico.id,
    clinicaId: medico.clinicaId,
  };
}

export async function checkSecretariaAuth() {
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

  if (session.user.tipo !== TipoUsuario.SECRETARIA) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso negado. Apenas Secretária." },
        { status: 403 }
      ),
    };
  }

  const clinicaId = await getUserClinicaId();

  if (!clinicaId) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Clínica não selecionada" },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, clinicaId };
}

/**
 * Verifica se o usuário tem acesso à clínica (Admin, Médico ou Secretária)
 */
export async function checkClinicaAuth() {
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

  const allowedTypes = [
    TipoUsuario.ADMIN_CLINICA,
    TipoUsuario.MEDICO,
    TipoUsuario.SECRETARIA,
  ];

  if (!(allowedTypes as TipoUsuario[]).includes(session.user.tipo)) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso negado. Usuário não autorizado." },
        { status: 403 }
      ),
    };
  }

  const clinicaId = await getUserClinicaId();

  if (!clinicaId) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Clínica não selecionada" },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    clinicaId,
    userTipo: session.user.tipo,
    userId: session.user.id,
  };
}
