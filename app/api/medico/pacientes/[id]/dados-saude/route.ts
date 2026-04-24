import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";
import { auditLogFromRequest } from "@/lib/audit-log";

const updateSchema = z.object({
  alergias: z.string().nullable().optional(),
  medicamentosEmUso: z.string().nullable().optional(),
});

async function checkMedico() {
  const session = await getSession();
  if (!session) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }),
    };
  }
  if (session.user.tipo !== TipoUsuario.MEDICO) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Acesso negado" }, { status: 403 }),
    };
  }
  const clinicaId = await getUserClinicaId();
  if (!clinicaId) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Clínica não encontrada" }, { status: 404 }),
    };
  }
  return { ok: true as const, clinicaId };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkMedico();
    if (!auth.ok) return auth.response;

    const { id } = await params;

    const paciente = await prisma.paciente.findFirst({
      where: { id, clinicaId: auth.clinicaId },
      select: { id: true, nome: true },
    });

    if (!paciente) {
      return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const validation = updateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;
    const updateData: Record<string, string | null> = {};
    if (data.alergias !== undefined) {
      const v = (data.alergias ?? "").trim();
      updateData.alergias = v === "" ? null : v;
    }
    if (data.medicamentosEmUso !== undefined) {
      const v = (data.medicamentosEmUso ?? "").trim();
      updateData.medicamentosEmUso = v === "" ? null : v;
    }

    const atualizado = await prisma.paciente.update({
      where: { id },
      data: updateData,
      select: { id: true, alergias: true, medicamentosEmUso: true },
    });

    auditLogFromRequest(request, {
      action: "UPDATE",
      resource: "Paciente",
      resourceId: id,
      details: {
        pacienteNome: paciente.nome,
        campo: "dados-saude-medico",
        camposAlterados: Object.keys(updateData),
      },
    });

    return NextResponse.json({
      alergias: atualizado.alergias,
      medicamentosEmUso: atualizado.medicamentosEmUso,
    });
  } catch (error) {
    console.error("Erro ao atualizar dados de saúde do paciente:", error);
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}
