import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

// POST /api/admin-clinica/assinatura/portal
// Cria uma sessão no Stripe Customer Portal e retorna a URL de redirecionamento.
// Pré-requisito: configurar o portal em https://dashboard.stripe.com/settings/billing/portal
export async function POST(request: NextRequest) {
  const auth = await checkAdminClinicaAuth();
  if (!auth.authorized) return auth.response!;
  const { clinicaId } = auth;

  const clinica = await prisma.tenant.findUnique({
    where: { id: clinicaId },
    select: { stripeCustomerId: true, nome: true },
  });

  if (!clinica?.stripeCustomerId) {
    return NextResponse.json(
      {
        error:
          "Assinatura Stripe não encontrada. Entre em contato com o suporte.",
      },
      { status: 400 }
    );
  }

  const returnUrl =
    `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL}/admin-clinica/pagamentos`;

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: clinica.stripeCustomerId,
    return_url: returnUrl,
  });

  return NextResponse.json({ url: portalSession.url });
}
