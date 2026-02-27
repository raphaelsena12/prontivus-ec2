import { NextResponse } from "next/server";
import { getSession, getUserClinicaId, getUserMedicoId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { deleteObjectFromS3 } from "@/lib/s3-service";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.user.tipo !== TipoUsuario.MEDICO) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const clinicaId = await getUserClinicaId();
    const medicoId = await getUserMedicoId();
    if (!clinicaId || !medicoId) {
      return NextResponse.json(
        { error: "Clínica ou médico não encontrado" },
        { status: 403 }
      );
    }

    const certificado = await prisma.medicoCertificadoDigital.findFirst({
      where: { clinicaId, medicoId },
      select: {
        id: true,
        pfxMimeType: true,
        pfxTamanho: true,
        validTo: true,
        subject: true,
        issuer: true,
        serialNumber: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      configured: !!certificado,
      certificado,
    });
  } catch (error: any) {
    console.error("[Certificado] GET erro:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao buscar certificado" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await getSession();
    if (!session || session.user.tipo !== TipoUsuario.MEDICO) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const clinicaId = await getUserClinicaId();
    const medicoId = await getUserMedicoId();
    if (!clinicaId || !medicoId) {
      return NextResponse.json(
        { error: "Clínica ou médico não encontrado" },
        { status: 403 }
      );
    }

    const cert = await prisma.medicoCertificadoDigital.findFirst({
      where: { clinicaId, medicoId },
      select: { id: true, pfxS3Key: true },
    });

    if (!cert) {
      return NextResponse.json({ ok: true, deleted: false });
    }

    await prisma.medicoCertificadoDigital.delete({ where: { id: cert.id } });

    // Tenta deletar do S3 (se falhar, não quebra o fluxo)
    try {
      await deleteObjectFromS3(cert.pfxS3Key);
    } catch (e) {
      console.warn("[Certificado] Não foi possível deletar do S3:", e);
    }

    return NextResponse.json({ ok: true, deleted: true });
  } catch (error: any) {
    console.error("[Certificado] DELETE erro:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao remover certificado" },
      { status: 500 }
    );
  }
}

