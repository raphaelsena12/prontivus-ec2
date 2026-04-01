import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { getSignedUrlFromS3 } from "@/lib/s3-service";

// GET /api/medico/medico-documentos/[documentoId]/url
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ documentoId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    if (session.user.tipo !== TipoUsuario.MEDICO) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const clinicaId = await getUserClinicaId();
    if (!clinicaId) return NextResponse.json({ error: "Clínica não encontrada" }, { status: 403 });

    const medico = await prisma.medico.findFirst({
      where: { usuarioId: session.user.id, clinicaId },
      select: { id: true },
    });
    if (!medico) return NextResponse.json({ error: "Registro de médico não encontrado" }, { status: 404 });

    const { documentoId } = await params;
    const documento = await prisma.medicoDocumento.findFirst({
      where: { id: documentoId, clinicaId, medicoId: medico.id },
    });
    if (!documento?.s3Key) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });

    const url = await getSignedUrlFromS3(documento.s3Key, 3600);
    return NextResponse.json({ url });
  } catch (error: any) {
    console.error("Erro ao obter URL assinada do documento do médico:", error);
    return NextResponse.json({ error: error.message || "Erro ao obter URL" }, { status: 500 });
  }
}

