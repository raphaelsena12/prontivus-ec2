import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { uploadMedicoDocumentoToS3 } from "@/lib/s3-service";

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

// POST /api/admin-clinica/medicos/[id]/documentos
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id: medicoId } = await params;

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

    // Obter dados do FormData
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const tipoDocumento = formData.get("tipoDocumento") as string;

    if (!file) {
      return NextResponse.json(
        { error: "Arquivo não fornecido" },
        { status: 400 }
      );
    }

    if (!tipoDocumento) {
      return NextResponse.json(
        { error: "Tipo de documento não fornecido" },
        { status: 400 }
      );
    }

    // Validar tipo de arquivo (imagem ou PDF)
    const fileType = file.type;
    const isImage = fileType.startsWith("image/");
    const isPDF = fileType === "application/pdf";

    if (!isImage && !isPDF) {
      return NextResponse.json(
        { error: "Tipo de arquivo não suportado. Apenas imagens e PDFs são permitidos." },
        { status: 400 }
      );
    }

    // Converter File para Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Fazer upload no S3
    let s3Key: string;
    try {
      s3Key = await uploadMedicoDocumentoToS3(
        buffer,
        file.name,
        {
          clinicaId: auth.clinicaId!,
          medicoId: medicoId,
          tipoDocumento: tipoDocumento,
        },
        fileType
      );
    } catch (s3Error: any) {
      console.error("Erro ao fazer upload no S3:", s3Error);
      return NextResponse.json(
        { error: `Erro ao fazer upload do arquivo: ${s3Error.message}` },
        { status: 500 }
      );
    }

    // Salvar referência no banco de dados
    const documento = await prisma.medicoDocumento.create({
      data: {
        clinicaId: auth.clinicaId!,
        medicoId: medicoId,
        tipoDocumento: tipoDocumento,
        nomeDocumento: file.name,
        s3Key: s3Key,
        mimeType: fileType,
        tamanho: file.size,
      },
    });

    console.log(`[Medico Documento] Documento criado:`, {
      id: documento.id,
      medicoId: documento.medicoId,
      tipoDocumento: documento.tipoDocumento,
      nomeDocumento: documento.nomeDocumento,
      clinicaId: documento.clinicaId,
    });

    return NextResponse.json({
      success: true,
      documento: {
        id: documento.id,
        nomeDocumento: documento.nomeDocumento,
        tipoDocumento: documento.tipoDocumento,
        s3Key: documento.s3Key,
        mimeType: documento.mimeType,
        tamanho: documento.tamanho,
        createdAt: documento.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Erro ao fazer upload de documento do médico:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao fazer upload do documento" },
      { status: 500 }
    );
  }
}

// GET /api/admin-clinica/medicos/[id]/documentos
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id: medicoId } = await params;

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

    // Buscar documentos do médico
    const documentos = await prisma.medicoDocumento.findMany({
      where: {
        medicoId: medicoId,
        clinicaId: auth.clinicaId!,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ documentos });
  } catch (error: any) {
    console.error("Erro ao buscar documentos do médico:", error);
    return NextResponse.json(
      { error: "Erro ao buscar documentos" },
      { status: 500 }
    );
  }
}

