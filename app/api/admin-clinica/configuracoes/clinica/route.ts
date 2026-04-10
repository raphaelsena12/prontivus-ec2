import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const updateClinicaSchema = z.object({
  codigoCnes: z.string().regex(/^\d{7}$/, "Código CNES deve ter exatamente 7 dígitos numéricos").optional(),
});

async function checkAdminAuth() {
  const session = await getSession();
  if (!session) {
    return { authorized: false as const, response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  }
  if (session.user.tipo !== TipoUsuario.ADMIN_CLINICA) {
    return { authorized: false as const, response: NextResponse.json({ error: "Acesso negado" }, { status: 403 }) };
  }
  const clinicaId = await getUserClinicaId();
  if (!clinicaId) {
    return { authorized: false as const, response: NextResponse.json({ error: "Clínica não encontrada" }, { status: 403 }) };
  }
  return { authorized: true as const, clinicaId };
}

export async function GET() {
  const auth = await checkAdminAuth();
  if (!auth.authorized) return auth.response;

  const clinica = await prisma.tenant.findUnique({
    where: { id: auth.clinicaId },
    select: { id: true, nome: true, cnpj: true, codigoCnes: true },
  });

  return NextResponse.json(clinica);
}

export async function PUT(req: NextRequest) {
  const auth = await checkAdminAuth();
  if (!auth.authorized) return auth.response;

  const body = await req.json();
  const parsed = updateClinicaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const clinica = await prisma.tenant.update({
    where: { id: auth.clinicaId },
    data: parsed.data,
    select: { id: true, nome: true, cnpj: true, codigoCnes: true },
  });

  return NextResponse.json(clinica);
}
