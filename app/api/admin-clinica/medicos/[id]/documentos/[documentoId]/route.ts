import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { getSignedUrlFromS3 } from "@/lib/s3-service";

async function checkAuthorization() {
  const session = await getSession();

  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      ),
    };
  }

  if (session.user.tipo !== TipoUsuario.ADMIN_CLINICA && session.user.tipo !== TipoUsuario.SECRETARIA) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      ),
    };
  }

  const clinicaId = await getUserClinicaId();

  if (!clinicaId) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, clinicaId };
}

// GET /api/admin-clinica/medicos/[id]/documentos/[documentoId] - Obter URL assinada do documento
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentoId: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id: medicoId, documentoId } = await params;

    // Verificar se o médico existe e pertence à clínica
    const medico = await prisma.medico.findFirst({
      where: {
        id: medicoId,
        clinicaId: auth.clinicaId!,
      },
    });

    if (!medico) {
      return NextResponse.json(
        { error: "Médico não encontrado" },
        { status: 404 }
      );
    }

    // Buscar documento
    const documento = await prisma.medicoDocumento.findFirst({
      where: {
        id: documentoId,
        medicoId: medicoId,
        clinicaId: auth.clinicaId!,
      },
    });

    if (!documento || !documento.s3Key) {
      return NextResponse.json(
        { error: "Documento não encontrado" },
        { status: 404 }
      );
    }

    // Gerar URL assinada (válida por 1 hora)
    const url = await getSignedUrlFromS3(documento.s3Key, 3600);

    return NextResponse.json({
      success: true,
      url,
      documento: {
        id: documento.id,
        nomeDocumento: documento.nomeDocumento,
        tipoDocumento: documento.tipoDocumento,
        mimeType: documento.mimeType,
      },
    });
  } catch (error: any) {
    console.error("Erro ao obter URL do documento:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao obter URL do documento" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin-clinica/medicos/[id]/documentos/[documentoId] - Deletar documento
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentoId: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id: medicoId, documentoId } = await params;

    // Verificar se o médico existe e pertence à clínica
    const medico = await prisma.medico.findFirst({
      where: {
        id: medicoId,
        clinicaId: auth.clinicaId!,
      },
    });

    if (!medico) {
      return NextResponse.json(
        { error: "Médico não encontrado" },
        { status: 404 }
      );
    }

    // Buscar e deletar documento
    const documento = await prisma.medicoDocumento.findFirst({
      where: {
        id: documentoId,
        medicoId: medicoId,
        clinicaId: auth.clinicaId!,
      },
    });

    if (!documento) {
      return NextResponse.json(
        { error: "Documento não encontrado" },
        { status: 404 }
      );
    }

    await prisma.medicoDocumento.delete({
      where: { id: documentoId },
    });

    return NextResponse.json({
      success: true,
      message: "Documento excluído com sucesso",
    });
  } catch (error: any) {
    console.error("Erro ao deletar documento:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao deletar documento" },
      { status: 500 }
    );
  }
}

