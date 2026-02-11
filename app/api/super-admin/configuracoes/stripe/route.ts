import { NextRequest, NextResponse } from "next/server";
import { getSession, isSuperAdmin } from "@/lib/auth-helpers";
import { z } from "zod";

const stripeConfigSchema = z.object({
  publishableKey: z.string().min(1, "Publishable Key é obrigatória"),
  secretKey: z.string().optional(),
  webhookSecret: z.string().optional(),
  modoTeste: z.boolean(),
  habilitado: z.boolean(),
});

// PUT /api/super-admin/configuracoes/stripe
export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const validatedData = stripeConfigSchema.parse(body);

    // Validar formato das chaves
    if (validatedData.publishableKey) {
      const isTestKey = validatedData.publishableKey.startsWith("pk_test_");
      const isLiveKey = validatedData.publishableKey.startsWith("pk_live_");

      if (!isTestKey && !isLiveKey) {
        return NextResponse.json(
          { error: "Publishable Key inválida. Deve começar com pk_test_ ou pk_live_" },
          { status: 400 }
        );
      }

      // Verificar se o modo está correto
      if (validatedData.modoTeste && !isTestKey) {
        return NextResponse.json(
          { error: "Modo teste ativo, mas a chave não é de teste" },
          { status: 400 }
        );
      }

      if (!validatedData.modoTeste && !isLiveKey) {
        return NextResponse.json(
          { error: "Modo produção ativo, mas a chave não é de produção" },
          { status: 400 }
        );
      }
    }

    if (validatedData.secretKey) {
      const isTestKey = validatedData.secretKey.startsWith("sk_test_");
      const isLiveKey = validatedData.secretKey.startsWith("sk_live_");

      if (!isTestKey && !isLiveKey) {
        return NextResponse.json(
          { error: "Secret Key inválida. Deve começar com sk_test_ ou sk_live_" },
          { status: 400 }
        );
      }

      // Verificar se o modo está correto
      if (validatedData.modoTeste && !isTestKey) {
        return NextResponse.json(
          { error: "Modo teste ativo, mas a chave secreta não é de teste" },
          { status: 400 }
        );
      }

      if (!validatedData.modoTeste && !isLiveKey) {
        return NextResponse.json(
          { error: "Modo produção ativo, mas a chave secreta não é de produção" },
          { status: 400 }
        );
      }
    }

    if (validatedData.webhookSecret && !validatedData.webhookSecret.startsWith("whsec_")) {
      return NextResponse.json(
        { error: "Webhook Secret inválido. Deve começar com whsec_" },
        { status: 400 }
      );
    }

    // Aqui você salvaria as configurações em um banco de dados
    // Por enquanto, apenas validamos e retornamos sucesso
    // IMPORTANTE: Criptografe as credenciais antes de salvar

    return NextResponse.json({
      message: "Configurações do Stripe salvas com sucesso",
      // Nota: Em produção, salve essas configurações de forma segura e criptografada
      // Não retorne as credenciais na resposta
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Erro ao salvar configurações do Stripe:", error);
    return NextResponse.json(
      { error: "Erro ao salvar configurações" },
      { status: 500 }
    );
  }
}








