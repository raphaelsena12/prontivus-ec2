import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const updateMedicoSchema = z.object({
  crm: z.string().min(1, "CRM é obrigatório").optional(),
  especialidade: z.string().min(1, "Especialidade é obrigatória").optional(),
  limiteMaximoRetornosPorDia: z.number().int().min(0).nullable().optional(),
  ativo: z.boolean().optional(),
});

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
        { error: "Clínica não encontrada" },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, clinicaId };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    const medico = await prisma.medico.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            telefone: true,
          },
        },
      },
    });

    if (!medico) {
      return NextResponse.json(
        { error: "Médico não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ medico });
  } catch (error) {
    console.error("Erro ao buscar médico:", error);
    return NextResponse.json(
      { error: "Erro ao buscar médico" },
      { status: 500 }
    );
  }
}

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

    const medicoExistente = await prisma.medico.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId,
      },
    });

    if (!medicoExistente) {
      return NextResponse.json(
        { error: "Médico não encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = updateMedicoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Se CRM foi alterado, verificar duplicidade
    if (data.crm && data.crm !== medicoExistente.crm) {
      const medicoComCrm = await prisma.medico.findFirst({
        where: {
          crm: data.crm,
          clinicaId: auth.clinicaId,
          id: { not: id },
        },
      });

      if (medicoComCrm) {
        return NextResponse.json(
          { error: "CRM já cadastrado para outro médico" },
          { status: 409 }
        );
      }
    }

    const medico = await prisma.medico.update({
      where: { id },
      data,
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            telefone: true,
          },
        },
      },
    });

    return NextResponse.json({ medico });
  } catch (error) {
    console.error("Erro ao atualizar médico:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar médico" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    const medico = await prisma.medico.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId,
      },
    });

    if (!medico) {
      return NextResponse.json(
        { error: "Médico não encontrado" },
        { status: 404 }
      );
    }

    await prisma.medico.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Médico excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar médico:", error);
    return NextResponse.json(
      { error: "Erro ao deletar médico" },
      { status: 500 }
    );
  }
}















