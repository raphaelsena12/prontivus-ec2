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
      response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }),
    };
  }
  if (session.user.tipo !== TipoUsuario.MEDICO) {
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

  const medico = await prisma.medico.findFirst({
    where: { usuarioId: session.user.id, clinicaId },
    select: { id: true },
  });
  if (!medico) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Registro de médico não encontrado" }, { status: 404 }),
    };
  }

  return { authorized: true as const, clinicaId, medicoId: medico.id };
}

// GET /api/medico/medico-documentos
export async function GET(_request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const clinicaId = auth.clinicaId as string;
    const medicoId = auth.medicoId as string;
    const documentos = await prisma.medicoDocumento.findMany({
      where: { clinicaId, medicoId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ documentos });
  } catch (error: any) {
    console.error("Erro ao listar documentos do médico (self):", error);
    return NextResponse.json({ error: "Erro ao listar documentos" }, { status: 500 });
  }
}

// POST /api/medico/medico-documentos
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const clinicaId = auth.clinicaId as string;
    const medicoId = auth.medicoId as string;
    const formData = (await request.formData()) as any;
    const file = formData.get("file") as File | null;
    const tipoDocumento = formData.get("tipoDocumento") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Arquivo não fornecido" }, { status: 400 });
    }
    if (!tipoDocumento) {
      return NextResponse.json({ error: "Tipo de documento não fornecido" }, { status: 400 });
    }

    const fileType = file.type;
    const isImage = fileType.startsWith("image/");
    const isPDF = fileType === "application/pdf";
    if (!isImage && !isPDF) {
      return NextResponse.json(
        { error: "Tipo de arquivo não suportado. Apenas imagens e PDFs são permitidos." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const s3Key = await uploadMedicoDocumentoToS3(
      buffer,
      file.name,
      {
        clinicaId,
        medicoId,
        tipoDocumento,
      },
      fileType
    );

    const documento = await prisma.medicoDocumento.create({
      data: {
        clinicaId,
        medicoId,
        tipoDocumento,
        nomeDocumento: file.name,
        s3Key,
        mimeType: fileType,
        tamanho: file.size,
      },
    });

    return NextResponse.json({ documento }, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao enviar documento do médico (self):", error);
    return NextResponse.json(
      { error: error.message || "Erro ao fazer upload do documento" },
      { status: 500 }
    );
  }
}

