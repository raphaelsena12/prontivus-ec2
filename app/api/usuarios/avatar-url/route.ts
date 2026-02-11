import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { getSignedUrlFromS3 } from "@/lib/s3-service";

// GET /api/usuarios/avatar-url?key=usuarios/xxx.jpg - Obter URL assinada do avatar
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { error: "Key do arquivo é obrigatória" },
        { status: 400 }
      );
    }

    // Validar que a key é de um avatar (segurança)
    if (!key.startsWith("usuarios/")) {
      return NextResponse.json(
        { error: "Key inválida" },
        { status: 400 }
      );
    }

    // Gerar URL assinada (válida por 1 hora)
    const url = await getSignedUrlFromS3(key, 3600);

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Erro ao obter URL do avatar:", error);
    return NextResponse.json(
      { error: "Erro ao obter URL do avatar" },
      { status: 500 }
    );
  }
}
