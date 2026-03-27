import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { getSignedUrlFromS3 } from "@/lib/s3-service";

const BUCKET = process.env.AWS_S3_BUCKET_NAME || "prontivus-documentos";
const REGION = process.env.AWS_REGION || "sa-east-1";

async function keyToUrl(key: string | null | undefined): Promise<string | null> {
  if (!key) return null;
  // Já é uma URL completa
  if (key.startsWith("https://")) return key;

  // Tentar URL assinada (ideal para buckets privados)
  try {
    return await getSignedUrlFromS3(key, 3600);
  } catch (err) {
    console.warn("[painel/clinica] presigned URL falhou para key:", key, err);
  }

  // Fallback: URL pública do S3 (funciona se o bucket/path for público)
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

export async function GET(req: NextRequest) {
  const clinicaId = req.nextUrl.searchParams.get("clinicaId");

  if (!clinicaId) {
    return NextResponse.json({ error: "clinicaId obrigatório" }, { status: 400 });
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: clinicaId },
      select: { nome: true, logoUrl: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Clínica não encontrada" }, { status: 404 });
    }

    // 1. Logo oficial da clínica
    let logoUrl = await keyToUrl(tenant.logoUrl);

    // 2. Fallback: avatar do Admin Clínica (campo legado usuario.clinicaId)
    if (!logoUrl) {
      const adminUser = await prisma.usuario.findFirst({
        where: {
          clinicaId,
          tipo: TipoUsuario.ADMIN_CLINICA,
          ativo: true,
          avatar: { not: null },
        },
        select: { avatar: true },
      });

      console.log("[painel/clinica] avatar do admin:", adminUser?.avatar);
      logoUrl = await keyToUrl(adminUser?.avatar);
    }

    console.log("[painel/clinica] logoUrl final:", logoUrl?.substring(0, 80));

    return NextResponse.json({ nome: tenant.nome, logoUrl });
  } catch (err) {
    console.error("[painel/clinica] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
