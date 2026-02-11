import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sendEmail, gerarEmailRecuperacaoSenha, gerarEmailRecuperacaoSenhaTexto } from "@/lib/email";
import * as smtpService from "@/lib/email/smtp-service";
import { randomBytes } from "crypto";

// Schema de validação
const recuperarSenhaSchema = z.object({
  email: z.string().email("Email inválido"),
});

// POST /api/auth/recuperar-senha - Solicitar recuperação de senha
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = recuperarSenhaSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Email inválido", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    // Buscar usuário
    let usuario;
    try {
      usuario = await prisma.usuario.findUnique({
        where: { email },
        select: { id: true, nome: true, email: true, ativo: true },
      });
    } catch (dbError) {
      console.error("Erro ao buscar usuário:", dbError);
      // Se o erro for relacionado a campos não existentes, tentar sem os campos novos
      if (dbError instanceof Error && dbError.message.includes("Unknown column") || dbError instanceof Error && dbError.message.includes("resetToken")) {
        // Migration ainda não foi executada
        return NextResponse.json(
          { error: "Sistema em manutenção. Tente novamente em alguns instantes." },
          { status: 503 }
        );
      }
      throw dbError;
    }

    // Sempre retornar sucesso para não expor se o email existe ou não
    if (!usuario || !usuario.ativo) {
      return NextResponse.json({
        message: "Se o email estiver cadastrado, você receberá um link de recuperação.",
      });
    }

    // Gerar token de recuperação
    const resetToken = randomBytes(32).toString("hex");
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Salvar token no banco
    try {
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          resetToken,
          resetTokenExpires,
        },
      });
    } catch (updateError: any) {
      console.error("Erro ao atualizar usuário:", updateError);
      
      // Verificar se o erro é relacionado a campos não existentes
      const errorMessage = updateError?.message || String(updateError);
      if (
        errorMessage.includes("Unknown column") ||
        errorMessage.includes("resetToken") ||
        errorMessage.includes("column") ||
        errorMessage.includes("does not exist")
      ) {
        console.error("Migration não executada. Campos resetToken/resetTokenExpires não existem no banco.");
        return NextResponse.json(
          { 
            error: "Sistema em manutenção. Por favor, execute a migration do banco de dados.",
            migrationRequired: true
          },
          { status: 503 }
        );
      }
      throw updateError;
    }

    // Gerar URL de recuperação
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/login/resetar-senha?token=${resetToken}`;

    // Enviar email com fallback para SMTP se SES falhar
    const html = gerarEmailRecuperacaoSenha({
      nome: usuario.nome,
      resetUrl,
    });

    const texto = gerarEmailRecuperacaoSenhaTexto({
      nome: usuario.nome,
      resetUrl,
    });

    let emailEnviado = false;
    let emailError: any = null;

    // Tentar enviar via serviço configurado (SES ou SMTP)
    try {
      await sendEmail({
        to: usuario.email,
        subject: "Recuperação de Senha - Prontivus",
        html,
        text: texto,
        fromName: "Prontivus",
      });
      
      emailEnviado = true;
      console.log("✅ Email de recuperação de senha enviado com sucesso para:", usuario.email);
    } catch (error: any) {
      emailError = error;
      console.error("❌ Erro ao enviar email de recuperação de senha:", error);
      console.error("Tipo de erro:", error?.name || error?.code);
      console.error("Mensagem:", error?.message);

      // Se for erro de permissão do SES (AccessDenied), tentar usar SMTP como fallback
      const isAccessDenied = 
        error?.name === "AccessDenied" ||
        error?.code === "AccessDenied" ||
        error?.message?.includes("not authorized") ||
        error?.message?.includes("AccessDenied");

      if (isAccessDenied && process.env.USE_AWS_SES === "true") {
        console.warn("⚠️ SES sem permissão. Tentando usar SMTP como fallback...");
        
        try {
          await smtpService.sendEmail({
            to: usuario.email,
            subject: "Recuperação de Senha - Prontivus",
            html,
            text: texto,
            fromName: "Prontivus",
          });
          
          emailEnviado = true;
          console.log("✅ Email enviado com sucesso via SMTP (fallback) para:", usuario.email);
        } catch (smtpError: any) {
          console.error("❌ Erro ao enviar email via SMTP (fallback):", smtpError);
          emailError = smtpError;
        }
      }
    }

    // Se o email não foi enviado, retornar erro ao invés de sucesso
    if (!emailEnviado) {
      const errorMessage = emailError?.message || String(emailError);
      const errorCode = emailError?.code || emailError?.name;

      // Erros críticos que devem ser reportados
      if (
        errorCode === "AccessDenied" ||
        errorMessage.includes("not authorized") ||
        errorMessage.includes("AccessDenied") ||
        errorMessage.includes("credentials") ||
        errorMessage.includes("Credenciais") ||
        errorCode === "InvalidAccessKeyId" ||
        errorCode === "SignatureDoesNotMatch"
      ) {
        console.error("⚠️ Erro crítico de configuração de email. Retornando erro ao frontend.");
        return NextResponse.json(
          { 
            error: "Erro ao enviar email. O serviço de email não está configurado corretamente. Entre em contato com o suporte.",
            details: process.env.NODE_ENV === "development" ? {
              message: errorMessage,
              code: errorCode,
              hint: errorCode === "AccessDenied" 
                ? "O IAM user não tem permissão para SES. Configure as permissões ou use SMTP."
                : "Verifique as credenciais de email (SES ou SMTP)"
            } : undefined
          },
          { status: 503 }
        );
      }

      // Para outros erros, ainda retornar erro mas com mensagem genérica
      console.error("⚠️ Email não pôde ser enviado após todas as tentativas");
      return NextResponse.json(
        { 
          error: "Não foi possível enviar o email de recuperação. Tente novamente mais tarde ou entre em contato com o suporte.",
          details: process.env.NODE_ENV === "development" ? errorMessage : undefined
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      message: "Se o email estiver cadastrado, você receberá um link de recuperação.",
    });
  } catch (error) {
    console.error("Erro ao solicitar recuperação de senha:", error);
    
    // Log detalhado do erro
    if (error instanceof Error) {
      console.error("Mensagem de erro:", error.message);
      console.error("Stack trace:", error.stack);
    }
    
    // Verificar se é erro de banco de dados relacionado a campos não existentes
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes("Unknown column") ||
      errorMessage.includes("resetToken") ||
      errorMessage.includes("column") ||
      errorMessage.includes("does not exist")
    ) {
      return NextResponse.json(
        { 
          error: "Sistema em manutenção. Por favor, execute a migration do banco de dados.",
          migrationRequired: true
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: "Erro ao processar solicitação",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
