import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { uploadFileToS3, deleteFileFromS3 } from "@/lib/s3-utils";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

// POST /api/perfil/avatar - Atualizar avatar
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    // Receber arquivo via FormData
    const formData = await request.formData();
    const file = formData.get("file") as File;

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

    // Buscar usuário atual para deletar avatar antigo se existir
    const usuarioAtual = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { avatar: true },
    });

    // Deletar avatar antigo do S3 se existir
    if (usuarioAtual?.avatar) {
      try {
        // Se for uma key do S3 (formato: usuarios/xxx)
        if (usuarioAtual.avatar.startsWith("usuarios/")) {
          const s3Client = new S3Client({
            region: process.env.AWS_REGION || "sa-east-1",
            credentials: {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
            },
          });
          const deleteCommand = new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME || "prontivus-documentos",
            Key: usuarioAtual.avatar,
          });
          await s3Client.send(deleteCommand);
        } else if (usuarioAtual.avatar.startsWith("https://")) {
          // Se for uma URL antiga (compatibilidade)
          await deleteFileFromS3(usuarioAtual.avatar);
        }
      } catch (error) {
        console.error("Erro ao deletar avatar antigo do S3:", error);
        // Continua mesmo se não conseguir deletar
      }
    }

    // Converter File para Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const extension = file.name.split(".").pop() || "jpg";
    const fileName = `${session.user.id}-${timestamp}.${extension}`;

    // Upload para S3 na pasta "usuarios"
    const avatarKey = await uploadFileToS3({
      file: buffer,
      fileName,
      contentType: file.type,
      folder: "usuarios",
    });

    console.log('=== UPLOAD AVATAR ===');
    console.log('UsuarioId da sessão:', session.user.id);
    console.log('Tipo de usuário:', session.user.tipo);
    console.log('AvatarKey retornada do S3:', avatarKey);
    console.log('Formato esperado: usuarios/{userId}-{timestamp}.{ext}');

    // Garantir que a key está no formato correto
    if (!avatarKey) {
      throw new Error("Erro ao fazer upload: key não retornada");
    }

    // Verificar se o usuarioId existe antes de atualizar
    const usuarioAntes = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { id: true, nome: true, avatar: true },
    });
    
    if (!usuarioAntes) {
      throw new Error("Usuário não encontrado no banco de dados");
    }
    
    console.log('Usuario antes do update:', {
      id: usuarioAntes.id,
      nome: usuarioAntes.nome,
      avatarAntes: usuarioAntes.avatar,
    });

    // Atualizar avatar no banco com a key do S3 (formato: usuarios/{userId}-{timestamp}.{ext})
    // Usar transação para garantir que o update seja bem-sucedido
    const usuario = await prisma.$transaction(async (tx) => {
      const updated = await tx.usuario.update({
        where: { id: session.user.id },
        data: { avatar: avatarKey },
        select: {
          id: true,
          nome: true,
          email: true,
          avatar: true,
        },
      });
      
      console.log('Usuario após update (dentro da transação):', updated);
      
      // Verificar imediatamente se foi salvo
      const verificado = await tx.usuario.findUnique({
        where: { id: session.user.id },
        select: { avatar: true },
      });
      
      console.log('Usuario verificado (dentro da transação):', verificado);
      
      if (verificado?.avatar !== avatarKey) {
        console.error('ERRO: Avatar não corresponde!', {
          esperado: avatarKey,
          encontrado: verificado?.avatar,
        });
        throw new Error("Avatar não foi salvo corretamente no banco de dados");
      }
      
      return updated;
    });

    // Verificar novamente após a transação
    const usuarioApos = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { avatar: true },
    });
    
    console.log('Avatar salvo no banco:', usuario.avatar);
    console.log('AvatarKey esperada:', avatarKey);
    console.log('Match:', usuario.avatar === avatarKey ? 'SIM ✓' : 'NÃO ✗');
    console.log('Usuario após transação (verificação externa):', usuarioApos);
    console.log('========================');

    return NextResponse.json({ usuario });
  } catch (error) {
    console.error("Erro ao atualizar avatar:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar avatar" },
      { status: 500 }
    );
  }
}














