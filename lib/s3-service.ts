import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "prontivus-documentos";

function getS3Client(): S3Client {
  const region = process.env.AWS_REGION || "sa-east-1";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("Credenciais AWS não configuradas. Configure AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY.");
  }

  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/**
 * Mapeia tipos de documentos para nomes de pastas no S3
 */
function getCategoriaFromTipoDocumento(tipoDocumento: string): string {
  const mapping: Record<string, string> = {
    'exame-imagem': 'Exames',
    'exame-pdf': 'Exames',
    'exame-documento': 'Exames',
    'prontuario': 'Prontuários',
    'ficha-atendimento': 'Prontuários',
    'receita-medica': 'Receita',
    'receita': 'Receita',
    'atestado': 'Atestado',
    'declaracao': 'Declaração',
    'solicitacao-exame': 'Solicitação de Exames',
    'encaminhamento': 'Encaminhamento',
    'relatorio': 'Relatório',
  };
  
  // Retorna o mapeamento ou usa o tipo de documento capitalizado como fallback
  return mapping[tipoDocumento.toLowerCase()] || tipoDocumento.charAt(0).toUpperCase() + tipoDocumento.slice(1);
}

/**
 * Verifica se as credenciais AWS estão configuradas
 */
export function areAwsCredentialsConfigured(): boolean {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  return !!(accessKeyId && secretAccessKey);
}

export async function uploadPDFToS3(
  fileBuffer: Buffer,
  fileName: string,
  options: {
    clinicaId: string;
    medicoId: string;
    consultaId: string;
    pacienteId?: string; // Opcional para compatibilidade
    tipoDocumento: string;
    categoria?: string; // Categoria específica (Exames, Prontuários, Receita, etc.)
  },
  contentType: string = "application/pdf"
): Promise<string> {
  try {
    // Verificar credenciais antes de tentar upload
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || "sa-east-1";

    if (!accessKeyId || !secretAccessKey) {
      throw new Error("Credenciais AWS não configuradas. Configure AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY nas variáveis de ambiente.");
    }

    console.log("=== Iniciando upload S3 ===");
    console.log("Bucket:", BUCKET_NAME);
    console.log("Region:", region);
    console.log("Tamanho do buffer:", fileBuffer.length, "bytes");

    // Determinar categoria (pasta)
    const categoria = options.categoria || getCategoriaFromTipoDocumento(options.tipoDocumento);
    
    // Se pacienteId não foi fornecido, buscar da consulta
    let pacienteId = options.pacienteId;
    if (!pacienteId && options.consultaId) {
      try {
        const { prisma } = await import('@/lib/prisma');
        const consulta = await prisma.consulta.findUnique({
          where: { id: options.consultaId },
          select: { pacienteId: true },
        });
        pacienteId = consulta?.pacienteId || undefined;
      } catch (error) {
        console.warn("Não foi possível buscar pacienteId da consulta:", error);
      }
    }

    if (!pacienteId) {
      throw new Error("pacienteId é obrigatório para organizar arquivos no S3");
    }

    // Nova estrutura: clinicas/{clinicaId}/pacientes/{pacienteId}/{Categoria}/{tipoDocumento}-{timestamp}-{fileName}
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `clinicas/${options.clinicaId}/pacientes/${pacienteId}/${categoria}/${options.tipoDocumento}-${timestamp}-${sanitizedFileName}`;

    console.log("Chave S3 (key):", key);
    console.log("Categoria:", categoria);
    console.log("PacienteId:", pacienteId);

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      Metadata: {
        clinicaId: options.clinicaId,
        medicoId: options.medicoId,
        consultaId: options.consultaId,
        tipoDocumento: options.tipoDocumento,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Criar cliente S3 com validação de credenciais
    const s3Client = getS3Client();
    
    console.log("Enviando comando para S3...");
    const result = await s3Client.send(command);
    console.log("Upload S3 concluído com sucesso!");
    console.log("Resultado:", {
      ETag: result.ETag,
      VersionId: result.VersionId,
      $metadata: result.$metadata,
    });

    return key;
  } catch (error: any) {
    console.error("Erro detalhado ao fazer upload no S3:", {
      message: error.message,
      name: error.name,
      code: error.code,
      $metadata: error.$metadata,
      stack: error.stack,
    });
    
    // Mensagem de erro mais específica
    if (error.name === "NoSuchBucket") {
      throw new Error(`Bucket S3 "${BUCKET_NAME}" não encontrado. Verifique se o bucket existe e se o nome está correto nas variáveis de ambiente.`);
    } else if (error.name === "InvalidAccessKeyId" || error.name === "SignatureDoesNotMatch") {
      throw new Error("Credenciais AWS inválidas. Verifique AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY.");
    } else if (error.name === "AccessDenied") {
      throw new Error(`Acesso negado ao bucket S3 "${BUCKET_NAME}". Verifique as permissões do IAM user.`);
    } else {
      throw new Error(`Erro ao fazer upload do PDF no S3: ${error.message || "Erro desconhecido"}`);
    }
  }
}

/**
 * Faz upload de documentos do médico (certificados, diplomas, etc) para o S3
 * Estrutura: clinicas/{clinicaId}/medicos/{medicoId}/Documentos/{tipoDocumento}-{timestamp}-{fileName}
 */
export async function uploadMedicoDocumentoToS3(
  fileBuffer: Buffer,
  fileName: string,
  options: {
    clinicaId: string;
    medicoId: string;
    tipoDocumento: string; // "certificado", "diploma", "registro-profissional", etc
  },
  contentType: string
): Promise<string> {
  try {
    // Verificar credenciais antes de tentar upload
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || "sa-east-1";

    if (!accessKeyId || !secretAccessKey) {
      throw new Error("Credenciais AWS não configuradas. Configure AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY nas variáveis de ambiente.");
    }

    console.log("=== Iniciando upload S3 - Documento Médico ===");
    console.log("Bucket:", BUCKET_NAME);
    console.log("Region:", region);
    console.log("Tamanho do buffer:", fileBuffer.length, "bytes");
    console.log("Tipo de documento:", options.tipoDocumento);

    // Estrutura: clinicas/{clinicaId}/medicos/{medicoId}/Documentos/{tipoDocumento}-{timestamp}-{fileName}
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `clinicas/${options.clinicaId}/medicos/${options.medicoId}/Documentos/${options.tipoDocumento}-${timestamp}-${sanitizedFileName}`;

    console.log("Chave S3 (key):", key);

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      Metadata: {
        clinicaId: options.clinicaId,
        medicoId: options.medicoId,
        tipoDocumento: options.tipoDocumento,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Criar cliente S3 com validação de credenciais
    const s3Client = getS3Client();
    
    console.log("Enviando comando para S3...");
    const result = await s3Client.send(command);
    console.log("Upload S3 concluído com sucesso!");
    console.log("Resultado:", {
      ETag: result.ETag,
      VersionId: result.VersionId,
      $metadata: result.$metadata,
    });

    return key;
  } catch (error: any) {
    console.error("Erro detalhado ao fazer upload no S3:", {
      message: error.message,
      name: error.name,
      code: error.code,
      $metadata: error.$metadata,
      stack: error.stack,
    });
    
    // Mensagem de erro mais específica
    if (error.name === "NoSuchBucket") {
      throw new Error(`Bucket S3 "${BUCKET_NAME}" não encontrado. Verifique se o bucket existe e se o nome está correto nas variáveis de ambiente.`);
    } else if (error.name === "InvalidAccessKeyId" || error.name === "SignatureDoesNotMatch") {
      throw new Error("Credenciais AWS inválidas. Verifique AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY.");
    } else if (error.name === "AccessDenied") {
      throw new Error(`Acesso negado ao bucket S3 "${BUCKET_NAME}". Verifique as permissões do IAM user.`);
    } else {
      throw new Error(`Erro ao fazer upload do documento no S3: ${error.message || "Erro desconhecido"}`);
    }
  }
}

export async function getSignedUrlFromS3(key: string, expiresIn: number = 3600): Promise<string> {
  try {
    const s3Client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error("Erro ao gerar URL assinada do S3:", error);
    throw new Error("Erro ao gerar URL do PDF");
  }
}

