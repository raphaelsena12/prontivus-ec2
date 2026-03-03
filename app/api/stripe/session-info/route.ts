import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

// Endpoint público de leitura — retorna apenas info de exibição da session.
// Não cria nada. Usado pela página /pagamento/sucesso para mostrar o plano adquirido.
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");

  if (!sessionId || !sessionId.startsWith("cs_")) {
    return NextResponse.json(
      { error: "session_id inválido" },
      { status: 400 }
    );
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: [],
    });

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Pagamento não confirmado" },
        { status: 400 }
      );
    }

    const PLANO_NOMES: Record<string, string> = {
      BASICO: "Básico",
      INTERMEDIARIO: "Intermediário",
      PROFISSIONAL: "Profissional",
    };

    const planoKey = session.metadata?.plano ?? null;

    return NextResponse.json({
      plano: planoKey ? (PLANO_NOMES[planoKey] ?? planoKey) : null,
      status: session.payment_status,
    });
  } catch (err) {
    console.error("Erro ao buscar session-info:", err);
    return NextResponse.json(
      { error: "Sessão não encontrada" },
      { status: 404 }
    );
  }
}
