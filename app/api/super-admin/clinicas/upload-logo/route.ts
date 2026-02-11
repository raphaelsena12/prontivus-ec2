import { NextRequest, NextResponse } from "next/server";
import { getSession, isSuperAdmin } from "@/lib/auth-helpers";
import { uploadFileToS3 } from "@/lib/s3-utils";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const admin = await isSuperAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const clinicaId = formData.get("clinicaId") as string;

    if (!file) {
      return NextResponse.json(
        { error: "Arquivo não fornecido" },
        { status: 400 }
      );
    }

    // Validar tipo de arquivo (apenas imagens)
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de arquivo não permitido. Use JPEG, PNG ou WEBP" },
        { status: 400 }
      );
    }

    // Validar tamanho (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Arquivo muito grande. Tamanho máximo: 5MB" },
        { status: 400 }
      );
    }

    // Converter File para Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const extension = file.name.split(".").pop();
    const fileName = `${clinicaId}-${timestamp}.${extension}`;

    // Upload para S3
    const fileUrl = await uploadFileToS3({
      file: buffer,
      fileName,
      contentType: file.type,
      folder: "clinicas/logos",
    });

    return NextResponse.json({
      success: true,
      url: fileUrl,
    });
  } catch (error: any) {
    console.error("Erro ao fazer upload da logo:", error);
    return NextResponse.json(
      { error: "Erro ao fazer upload da logo" },
      { status: 500 }
    );
  }
}







