import { NextRequest, NextResponse } from "next/server";
import { stripe, PLANOS_STRIPE, PlanoKey } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plano } = body as { plano: PlanoKey };

    console.log("Criando checkout para plano:", plano);

    if (!plano || !PLANOS_STRIPE[plano]) {
      return NextResponse.json({ error: "Plano inválido" }, { status: 400 });
    }

    const planoInfo = PLANOS_STRIPE[plano];
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    console.log("Plano info:", planoInfo);
    console.log("Base URL:", baseUrl);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: `Prontivus - Plano ${planoInfo.nome}`,
              description: planoInfo.descricao,
            },
            unit_amount: planoInfo.preco,
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${baseUrl}/pagamento/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}?canceled=true`,
      metadata: {
        plano: plano,
      },
      billing_address_collection: "required",
    });

    console.log("Sessão criada:", session.id);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Erro ao criar sessão de checkout:", error);

    // Retornar detalhes do erro para debug
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido";

    return NextResponse.json(
      { error: "Erro ao criar sessão de pagamento", details: errorMessage },
      { status: 500 }
    );
  }
}
