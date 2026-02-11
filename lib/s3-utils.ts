import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "sa-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "prontivus-documentos";

export interface UploadFileParams {
  file: Buffer;
  fileName: string;
  contentType: string;
  folder?: string;
}

export async function uploadFileToS3({
  file,
  fileName,
  contentType,
  folder = "logos",
}: UploadFileParams): Promise<string> {
  const key = folder ? `${folder}/${fileName}` : fileName;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType,
    // ACL removido - buckets modernos não permitem ACLs, acesso público deve ser configurado via bucket policy
  });

  await s3Client.send(command);

  // Retorna apenas a key (não a URL completa) para usar com URLs assinadas
  return key;
}

export async function deleteFileFromS3(fileUrl: string): Promise<void> {
  try {
    // Extrair a chave do arquivo da URL
    const url = new URL(fileUrl);
    const key = url.pathname.substring(1); // Remove a barra inicial

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error("Erro ao deletar arquivo do S3:", error);
    // Não lança erro para não quebrar o fluxo se o arquivo não existir
  }
}







