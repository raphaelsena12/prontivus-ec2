import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

// Schema de validação para atualização de status
const updatePacienteStatusSchema = z.object({
  ativo: z.boolean(),
});

// Helper para verificar autorização
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

// PATCH /api/secretaria/pacientes/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    // Verificar se paciente existe e pertence à clínica
    const pacienteExistente = await prisma.paciente.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId,
      },
    });

    if (!pacienteExistente) {
      return NextResponse.json(
        { error: "Paciente não encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = updatePacienteStatusSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const paciente = await prisma.paciente.update({
      where: { id },
      data: { ativo: validation.data.ativo },
    });

    return NextResponse.json({ paciente });
  } catch (error) {
    console.error("Erro ao atualizar status do paciente:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar status do paciente" },
      { status: 500 }
    );
  }
}
