import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const itemSchema = z.object({
  especialidadeId: z.string().uuid(),
  categoriaId: z.string().uuid().nullable().optional(),
  rqe: z.string().min(1),
});

const updateSchema = z.object({
  especialidades: z.array(itemSchema).min(1),
});

async function checkAuthorization() {
  const session = await getSession();
  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }),
    };
  }
  if (session.user.tipo !== TipoUsuario.MEDICO) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Acesso negado" }, { status: 403 }),
    };
  }

  const clinicaId = await getUserClinicaId();
  if (!clinicaId) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Clínica não encontrada" }, { status: 403 }),
    };
  }

  return { authorized: true as const, clinicaId, userId: session.user.id };
}

// GET /api/medico/perfil/especialidades
export async function GET(_request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const medico = await prisma.medico.findFirst({
      where: { usuarioId: auth.userId, clinicaId: auth.clinicaId },
      select: {
        id: true,
        medicoEspecialidades: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            rqe: true,
            especialidade: { select: { id: true, codigo: true, nome: true } },
            categoria: { select: { id: true, codigo: true, nome: true } },
          },
        },
      },
    });

    if (!medico) {
      return NextResponse.json({ error: "Registro de médico não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ medicoId: medico.id, medicoEspecialidades: medico.medicoEspecialidades });
  } catch (error) {
    console.error("Erro ao carregar especialidades do médico:", error);
    return NextResponse.json({ error: "Erro ao carregar especialidades" }, { status: 500 });
  }
}

// PATCH /api/medico/perfil/especialidades
export async function PATCH(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const medico = await prisma.medico.findFirst({
      where: { usuarioId: auth.userId, clinicaId: auth.clinicaId },
      select: { id: true, especialidade: true },
    });
    if (!medico) {
      return NextResponse.json({ error: "Registro de médico não encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const validation = updateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const especialidadePrincipal = await prisma.especialidadeMedica.findUnique({
      where: { id: validation.data.especialidades[0].especialidadeId },
      select: { nome: true },
    });

    const updated = await prisma.medico.update({
      where: { id: medico.id },
      data: {
        especialidade: especialidadePrincipal?.nome || medico.especialidade,
        medicoEspecialidades: {
          deleteMany: {},
          create: validation.data.especialidades.map((it) => ({
            especialidadeId: it.especialidadeId,
            categoriaId: it.categoriaId ?? null,
            rqe: it.rqe.trim(),
          })),
        },
      },
      select: {
        id: true,
        medicoEspecialidades: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            rqe: true,
            especialidade: { select: { id: true, codigo: true, nome: true } },
            categoria: { select: { id: true, codigo: true, nome: true } },
          },
        },
      },
    });

    return NextResponse.json({ medicoId: updated.id, medicoEspecialidades: updated.medicoEspecialidades });
  } catch (error) {
    console.error("Erro ao atualizar especialidades do médico:", error);
    return NextResponse.json({ error: "Erro ao atualizar especialidades" }, { status: 500 });
  }
}

