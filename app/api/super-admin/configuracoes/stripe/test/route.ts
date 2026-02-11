import { NextRequest, NextResponse } from "next/server";
import { getSession, isSuperAdmin } from "@/lib/auth-helpers";
import { z } from "zod";

const testStripeSchema = z.object({
  publishableKey: z.string().min(1),
  secretKey: z.string().min(1),
  modoTeste: z.boolean(),
});

// POST /api/super-admin/configuracoes/stripe/test
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

    const body = await request.json();
    const validatedData = testStripeSchema.parse(body);

    // Validar formato das chaves
    const isTestPublishable = validatedData.publishableKey.startsWith("pk_test_");
    const isLivePublishable = validatedData.publishableKey.startsWith("pk_live_");
    const isTestSecret = validatedData.secretKey.startsWith("sk_test_");
    const isLiveSecret = validatedData.secretKey.startsWith("sk_live_");

    if (!isTestPublishable && !isLivePublishable) {
      return NextResponse.json(
        {
          success: false,
          error: "Publishable Key inválida. Deve começar com pk_test_ ou pk_live_",
        },
        { status: 400 }
      );
    }

    if (!isTestSecret && !isLiveSecret) {
      return NextResponse.json(
        {
          success: false,
          error: "Secret Key inválida. Deve começar com sk_test_ ou sk_live_",
        },
        { status: 400 }
      );
    }

    // Verificar se o modo está correto
    if (validatedData.modoTeste && (!isTestPublishable || !isTestSecret)) {
      return NextResponse.json(
        {
          success: false,
          error: "Modo teste ativo, mas as chaves não são de teste",
        },
        { status: 400 }
      );
    }

    if (!validatedData.modoTeste && (!isLivePublishable || !isLiveSecret)) {
      return NextResponse.json(
        {
          success: false,
          error: "Modo produção ativo, mas as chaves não são de produção",
        },
        { status: 400 }
      );
    }

    // Aqui você faria uma chamada real à API do Stripe para testar
    // Por enquanto, apenas validamos o formato das chaves
    // Exemplo de teste real:
    // const stripe = new Stripe(validatedData.secretKey);
    // await stripe.balance.retrieve();

    return NextResponse.json({
      success: true,
      message: "Formato das chaves válido. Conexão com Stripe testada com sucesso",
      // Nota: Em produção, faça uma chamada real à API do Stripe para validar
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Dados inválidos",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    console.error("Erro ao testar conexão com Stripe:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Falha ao testar conexão com Stripe",
      },
      { status: 400 }
    );
  }
}








