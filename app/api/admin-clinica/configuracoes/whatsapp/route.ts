import { NextResponse } from "next/server";
import { checkClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await checkClinicaAuth();
  if (!auth.authorized) return auth.response!;

  const clinica = await prisma.tenant.findUnique({
    where: { id: auth.clinicaId },
    select: {
      whatsappPhoneNumberId: true,
      whatsappAccessToken: true,
    },
  });

  if (!clinica) {
    return NextResponse.json({ error: "Clínica não encontrada" }, { status: 404 });
  }

  return NextResponse.json({
    whatsappPhoneNumberId: clinica.whatsappPhoneNumberId ?? "",
    whatsappConfigurado: !!clinica.whatsappAccessToken,
  });
}

export async function PUT(request: Request) {
  const auth = await checkClinicaAuth();
  if (!auth.authorized) return auth.response!;

  const body = await request.json();
  const { whatsappPhoneNumberId, whatsappAccessToken } = body;

  if (!whatsappPhoneNumberId?.trim() || !whatsappAccessToken?.trim()) {
    return NextResponse.json(
      { error: "Phone Number ID e Access Token são obrigatórios" },
      { status: 400 }
    );
  }

  await prisma.tenant.update({
    where: { id: auth.clinicaId },
    data: {
      whatsappPhoneNumberId: whatsappPhoneNumberId.trim(),
      whatsappAccessToken: whatsappAccessToken.trim(),
    },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const auth = await checkClinicaAuth();
  if (!auth.authorized) return auth.response!;

  await prisma.tenant.update({
    where: { id: auth.clinicaId },
    data: {
      whatsappPhoneNumberId: null,
      whatsappAccessToken: null,
    },
  });

  return NextResponse.json({ success: true });
}
