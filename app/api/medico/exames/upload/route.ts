import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId, getUserMedicoId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { uploadPDFToS3 } from "@/lib/s3-service";

export async function POST(request: NextRequest) {
  try {
    // Autenticação
    const session = await getSession();
    if (!session || session.user.tipo !== TipoUsuario.MEDICO) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const clinicaId = await getUserClinicaId();
    const medicoId = await getUserMedicoId();
    if (!clinicaId || !medicoId) {
      return NextResponse.json({ error: "Clínica ou médico não encontrado" }, { status: 403 });
    }

    const formData = await request.formData();
    const consultaId = formData.get("consultaId") as string;
    const nomeExame = formData.get("nomeExame") as string;
    const file = formData.get("file") as File | null;

    if (!consultaId || !nomeExame || !file) {
      return NextResponse.json(
        { error: "Consulta ID, nome do exame e arquivo são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se a consulta pertence à clínica e ao médico
    // O exame será vinculado à consulta atual, mas será visível em todas as consultas do paciente
    const consulta = await prisma.consulta.findFirst({
      where: {
        id: consultaId,
        clinicaId,
        medicoId,
      },
      select: {
        id: true,
        pacienteId: true,
      },
    });

    if (!consulta) {
      return NextResponse.json({ error: "Consulta não encontrada" }, { status: 404 });
    }

    console.log(`[Exames Upload] Vinculando exame à consulta ${consultaId} do paciente ${consulta.pacienteId}`);

    // Validar tipo de arquivo (imagens ou PDF)
    const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const allowedPdfTypes = ["application/pdf"];
    let fileType = file.type;

    // Se o tipo não foi detectado, tentar inferir pela extensão
    if (!fileType || fileType === "application/octet-stream") {
      const extension = file.name.toLowerCase().split('.').pop();
      if (['jpg', 'jpeg', 'png', 'webp'].includes(extension || '')) {
        fileType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
      } else if (extension === 'pdf') {
        fileType = "application/pdf";
      }
    }

    console.log(`[Exames Upload] Arquivo recebido:`, {
      nome: file.name,
      tipo: fileType,
      tamanho: file.size,
    });

    if (!allowedImageTypes.includes(fileType) && !allowedPdfTypes.includes(fileType)) {
      return NextResponse.json(
        { error: "Tipo de arquivo não permitido. Use imagens (JPEG, PNG, WebP) ou PDF" },
        { status: 400 }
      );
    }

    // Converter File para Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determinar tipo de documento e content type
    const isImage = allowedImageTypes.includes(fileType);
    const tipoDocumento = isImage ? "exame-imagem" : "exame-pdf";
    const contentType = fileType;

    console.log(`[Exames Upload] Tipo determinado:`, {
      isImage,
      tipoDocumento,
      contentType,
    });

    // Upload para S3 com estrutura: clinicas/{clinicaId}/pacientes/{pacienteId}/Exames/
    let s3Key: string;
    try {
      s3Key = await uploadPDFToS3(
        buffer,
        file.name,
        {
          clinicaId,
          medicoId,
          consultaId,
          pacienteId: consulta.pacienteId,
          tipoDocumento,
          categoria: 'Exames',
        },
        contentType
      );
    } catch (s3Error: any) {
      console.error("Erro ao fazer upload no S3:", s3Error);
      return NextResponse.json(
        { error: `Erro ao fazer upload do arquivo: ${s3Error.message}` },
        { status: 500 }
      );
    }

    // Salvar no banco de dados usando DocumentoGerado
    const documento = await prisma.documentoGerado.create({
      data: {
        clinicaId,
        consultaId,
        medicoId,
        tipoDocumento,
        nomeDocumento: nomeExame,
        s3Key,
        dados: {
          originalFileName: file.name,
          fileSize: file.size,
          mimeType: fileType,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    console.log(`[Exames Upload] Documento criado:`, {
      id: documento.id,
      consultaId: documento.consultaId,
      tipoDocumento: documento.tipoDocumento,
      nomeDocumento: documento.nomeDocumento,
      clinicaId: documento.clinicaId,
      medicoId: documento.medicoId,
    });

    return NextResponse.json({
      success: true,
      documento: {
        id: documento.id,
        nomeDocumento: documento.nomeDocumento,
        tipoDocumento: documento.tipoDocumento,
        s3Key: documento.s3Key,
        createdAt: documento.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Erro ao fazer upload de exame:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao fazer upload do exame" },
      { status: 500 }
    );
  }
}
