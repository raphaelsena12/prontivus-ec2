import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { getSignedUrlFromS3 } from "@/lib/s3-service";

// GET /api/paciente/consultas/[consultaId]/documentos/[documentoId]/url
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ consultaId: string; documentoId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (session.user.tipo !== TipoUsuario.PACIENTE) {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      );
    }

    const clinicaId = await getUserClinicaId();
    if (!clinicaId) {
      return NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 404 }
      );
    }

    const paciente = await prisma.paciente.findFirst({
      where: {
        clinicaId,
        usuarioId: session.user.id,
      },
      select: { id: true },
    });

    if (!paciente) {
      return NextResponse.json(
        { error: "Paciente não encontrado" },
        { status: 404 }
      );
    }

    const { consultaId, documentoId } = await params;

    // Verificar se a consulta pertence ao paciente
    const consulta = await prisma.consulta.findFirst({
      where: {
        id: consultaId,
        clinicaId,
        pacienteId: paciente.id,
      },
      select: { id: true },
    });

    if (!consulta) {
      return NextResponse.json(
        { error: "Consulta não encontrada" },
        { status: 404 }
      );
    }

    // Buscar documento verificando que pertence à consulta
    const documento = await prisma.documentoGerado.findFirst({
      where: {
        id: documentoId,
        consultaId,
        clinicaId,
      },
    });

    if (!documento || !documento.s3Key) {
      return NextResponse.json(
        { error: "Documento não encontrado" },
        { status: 404 }
      );
    }

    const url = await getSignedUrlFromS3(documento.s3Key, 3600);

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error("Erro ao obter URL do documento:", error);
    return NextResponse.json(
      { error: "Erro ao obter URL do documento" },
      { status: 500 }
    );
  }
}
