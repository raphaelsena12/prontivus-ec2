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

async function getPacienteDoUsuario() {
  const session = await getSession();
  if (!session) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }),
    };
  }

  if (session.user.tipo !== TipoUsuario.PACIENTE) {
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

  const paciente = await prisma.paciente.findFirst({
    where: {
      clinicaId,
      usuarioId: session.user.id,
      ativo: true,
    },
  });

  if (!paciente) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 }),
    };
  }

  return { ok: true as const, paciente };
}

export async function GET() {
  try {
    const result = await getPacienteDoUsuario();
    if (!result.ok) return result.response;

    const { paciente } = result;
    return NextResponse.json({
      alergias: paciente.alergias ?? null,
      medicamentosEmUso: paciente.medicamentosEmUso ?? null,
    });
  } catch (error) {
    console.error("Erro ao buscar dados do paciente:", error);
    return NextResponse.json({ error: "Erro ao buscar dados" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const result = await getPacienteDoUsuario();
    if (!result.ok) return result.response;

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

    const paciente = await prisma.paciente.update({
      where: { id: result.paciente.id },
      data: updateData,
      select: { id: true, alergias: true, medicamentosEmUso: true },
    });

    auditLogFromRequest(request, {
      action: "UPDATE",
      resource: "Paciente",
      resourceId: paciente.id,
      details: {
        campo: "dados-saude-self-service",
        camposAlterados: Object.keys(updateData),
      },
    });

    return NextResponse.json({
      alergias: paciente.alergias,
      medicamentosEmUso: paciente.medicamentosEmUso,
    });
  } catch (error) {
    console.error("Erro ao atualizar dados do paciente:", error);
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}
