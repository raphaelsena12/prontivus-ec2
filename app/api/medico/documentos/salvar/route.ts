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
    const tipoDocumento = formData.get("tipoDocumento") as string;
    const nomeDocumento = formData.get("nomeDocumento") as string;
    const pdfFile = formData.get("pdfFile") as File | null;

    if (!consultaId || !tipoDocumento || !nomeDocumento) {
      return NextResponse.json(
        { error: "Consulta ID, tipo de documento e nome são obrigatórios" },
        { status: 400 }
      );
    }

    if (!pdfFile) {
      return NextResponse.json(
        { error: "Arquivo PDF é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se a consulta pertence à clínica e ao médico
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

    // Converter File para Buffer
    const arrayBuffer = await pdfFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Verificar se as credenciais AWS estão configuradas
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.error("Credenciais AWS não configuradas");
      return NextResponse.json(
        { 
          error: "Credenciais AWS não configuradas. Configure AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY no .env",
          type: "MissingCredentials"
        },
        { status: 500 }
      );
    }

    // Fazer upload no S3 com estrutura organizada
    const fileName = `${tipoDocumento}.pdf`;
    let s3Key: string;
    try {
      console.log("=== Iniciando processo de upload S3 ===");
      console.log("ConsultaId:", consultaId);
      console.log("TipoDocumento:", tipoDocumento);
      console.log("Tamanho do buffer:", buffer.length, "bytes");
      console.log("ClinicaId:", clinicaId);
      console.log("MedicoId:", medicoId);
      console.log("Bucket configurado:", process.env.AWS_S3_BUCKET_NAME || "prontivus-documentos (padrão)");
      console.log("Região configurada:", process.env.AWS_REGION || "sa-east-1 (padrão)");
      
      // Determinar categoria baseada no tipo de documento
      // Exemplos: receita-medica -> Receita, atestado -> Atestado, etc.
      s3Key = await uploadPDFToS3(buffer, fileName, {
        clinicaId,
        medicoId,
        consultaId,
        pacienteId: consulta.pacienteId,
        tipoDocumento,
        // A categoria será determinada automaticamente pela função getCategoriaFromTipoDocumento
      });
      
      console.log("✅ Upload S3 bem-sucedido! Chave:", s3Key);
    } catch (s3Error: any) {
      console.error("=== ERRO NO UPLOAD S3 ===");
      console.error("Erro completo:", s3Error);
      console.error("Mensagem:", s3Error.message);
      console.error("Nome do erro:", s3Error.name);
      console.error("Código:", s3Error.code);
      console.error("Stack:", s3Error.stack);
      console.error("Bucket tentado:", process.env.AWS_S3_BUCKET_NAME || "prontivus-documentos");
      console.error("Região:", process.env.AWS_REGION || "sa-east-1");
      console.error("Credenciais configuradas:", {
        hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      });
      
      return NextResponse.json(
        { 
          error: s3Error.message || "Erro ao fazer upload no S3",
          type: "S3UploadError",
          details: s3Error.message,
          code: s3Error.code,
          name: s3Error.name,
          bucket: process.env.AWS_S3_BUCKET_NAME || "prontivus-documentos",
          region: process.env.AWS_REGION || "sa-east-1",
        },
        { status: 500 }
      );
    }

    // Salvar documento com a chave do S3
    console.log("Salvando documento no banco com s3Key:", s3Key);
    const documento = await prisma.documentoGerado.create({
      data: {
        clinicaId,
        consultaId,
        medicoId,
        tipoDocumento,
        nomeDocumento,
        s3Key,
      },
    });

    console.log("Documento salvo no banco com sucesso! ID:", documento.id);

    return NextResponse.json({
      success: true,
      documento: {
        id: documento.id,
        tipoDocumento: documento.tipoDocumento,
        nomeDocumento: documento.nomeDocumento,
        s3Key: documento.s3Key,
        createdAt: documento.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Erro completo ao salvar documento:", error);
    console.error("Stack:", error.stack);
    
    // Retornar erro detalhado
    const errorMessage = error.message || "Erro ao salvar documento";
    const errorDetails = {
      error: errorMessage,
      type: error.name || "UnknownError",
      ...(process.env.NODE_ENV === "development" && {
        stack: error.stack,
        details: error.toString(),
      }),
    };
    
    return NextResponse.json(errorDetails, { status: 500 });
  }
}


