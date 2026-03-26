import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const schema = z.object({
  aceita: z.boolean(),
});

async function checkAuthorization(): Promise<
  | { authorized: false; response: NextResponse }
  | { authorized: true; clinicaId: string }
> {
  const session = await getSession();

  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }),
    };
  }

  if (session.user.tipo !== TipoUsuario.ADMIN_CLINICA && session.user.tipo !== TipoUsuario.SECRETARIA) {
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

  return { authorized: true, clinicaId };
}

// PATCH /api/admin-clinica/operadoras/[id]/aceitacao
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;
    const clinicaId = auth.clinicaId;

    const { id: operadoraId } = await params;
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", details: parsed.error.issues }, { status: 400 });
    }

    // Operadora precisa existir e ser acessível (global ou legada da própria clínica)
    const operadora = await prisma.operadora.findFirst({
      where: {
        id: operadoraId,
        OR: [{ clinicaId: null }, { clinicaId: auth.clinicaId }],
      },
      select: { id: true },
    });
    if (!operadora) return NextResponse.json({ error: "Operadora não encontrada" }, { status: 404 });

    const vinculo = await prisma.tenantOperadora.upsert({
      where: { tenantId_operadoraId: { tenantId: clinicaId, operadoraId } },
      create: { tenantId: clinicaId, operadoraId, aceita: parsed.data.aceita },
      update: { aceita: parsed.data.aceita },
      select: { tenantId: true, operadoraId: true, aceita: true },
    });

    return NextResponse.json({ aceitacao: vinculo });
  } catch (error) {
    console.error("Erro ao atualizar aceitação da operadora:", error);
    return NextResponse.json({ error: "Erro ao atualizar aceitação da operadora" }, { status: 500 });
  }
}

