import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { getSignedUrlFromS3 } from "@/lib/s3-service";

// GET /api/medico/documentos/[documentoId]/url - Obter URL assinada de um DocumentoGerado
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentoId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const isAllowed =
      session.user.tipo === TipoUsuario.MEDICO ||
      session.user.tipo === TipoUsuario.SECRETARIA ||
      session.user.tipo === TipoUsuario.ADMIN_CLINICA;

    if (!isAllowed) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const clinicaId = await getUserClinicaId();
    if (!clinicaId) {
      return NextResponse.json({ error: "Clínica não encontrada" }, { status: 403 });
    }

    const { documentoId } = await params;

    const documento = await prisma.documentoGerado.findFirst({
      where: {
        id: documentoId,
        clinicaId,
      },
    });

    if (!documento) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
    }

    if (!documento.s3Key) {
      return NextResponse.json({ error: "Documento sem arquivo armazenado" }, { status: 404 });
    }

    const url = await getSignedUrlFromS3(documento.s3Key, 3600);

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error("Erro ao obter URL do documento:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao obter URL do documento" },
      { status: 500 }
    );
  }
}
