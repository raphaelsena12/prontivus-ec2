import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { gerarRelatorioPdf } from "@/lib/pdf/gerar-relatorio";
import { TipoRelatorio } from "@/lib/pdf/relatorios";

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "prontivus-documentos";

const TIPOS_VALIDOS: TipoRelatorio[] = [
  "faturamento",
  "vendas",
  "faturamento-medico",
  "estoque",
  "contas-pagar",
  "contas-receber",
];

export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response!;

    const clinicaId = auth.clinicaId!;

    const body = await request.json();
    const { tipo, dataInicio, dataFim } = body as {
      tipo: string;
      dataInicio: string;
      dataFim: string;
    };

    if (!tipo || !TIPOS_VALIDOS.includes(tipo as TipoRelatorio)) {
      return NextResponse.json({ error: "Tipo de relatório inválido" }, { status: 400 });
    }
    if (!dataInicio || !dataFim) {
      return NextResponse.json({ error: "Período obrigatório" }, { status: 400 });
    }

    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      return NextResponse.json({ error: "Credenciais AWS não configuradas" }, { status: 500 });
    }

    const pdfBuffer = await gerarRelatorioPdf(tipo as TipoRelatorio, clinicaId, dataInicio, dataFim);

    const timestamp = Date.now();
    const key = `clinicas/${clinicaId}/relatorios/${tipo}/relatorio-${tipo}-${dataInicio}-${dataFim}-${timestamp}.pdf`;

    const s3Client = new S3Client({
      region: process.env.AWS_REGION || "sa-east-1",
      credentials: { accessKeyId, secretAccessKey },
    });

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: new Uint8Array(pdfBuffer),
        ContentType: "application/pdf",
        Metadata: {
          clinicaId,
          tipo,
          dataInicio,
          dataFim,
          uploadedAt: new Date().toISOString(),
        },
      })
    );

    const presignedUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }),
      { expiresIn: 3600 }
    );

    return NextResponse.json({ key, url: presignedUrl });
  } catch (error: any) {
    console.error("Erro ao enviar relatório para S3:", error);
    return NextResponse.json({ error: error.message || "Erro ao enviar para S3" }, { status: 500 });
  }
}
