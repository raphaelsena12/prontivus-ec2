import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { stripe, STRIPE_PRICE_IDS, PlanoKey, PLANOS_STRIPE } from "@/lib/stripe";
import { TipoPlano } from "@/lib/generated/prisma";

const PLANO_KEY_MAP: Record<string, PlanoKey> = {
  BASICO: "BASICO",
  INTERMEDIARIO: "INTERMEDIARIO",
  PROFISSIONAL: "PROFISSIONAL",
};

export async function POST(request: NextRequest) {
  const auth = await checkAdminClinicaAuth();
  if (!auth.authorized) return auth.response!;
  const { clinicaId } = auth;

  let novoPlanoKey: PlanoKey;
  try {
    const body = await request.json();
    const raw = (body.novoPlano as string)?.toUpperCase();
    if (!raw || !PLANO_KEY_MAP[raw]) {
      return NextResponse.json(
        { error: "novoPlano inválido. Use BASICO, INTERMEDIARIO ou PROFISSIONAL." },
        { status: 400 }
      );
    }
    novoPlanoKey = PLANO_KEY_MAP[raw];
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  // Verificar se os Price IDs estão configurados
  const novoPriceId = STRIPE_PRICE_IDS[novoPlanoKey];
  if (!novoPriceId) {
    return NextResponse.json(
      {
        error: `STRIPE_PRICE_ID_${novoPlanoKey} não configurado. Configure a variável de ambiente e tente novamente.`,
      },
      { status: 501 }
    );
  }

  // Buscar clínica com plano atual
  const clinica = await prisma.tenant.findUnique({
    where: { id: clinicaId },
    include: { plano: true },
  });

  if (!clinica) {
    return NextResponse.json({ error: "Clínica não encontrada" }, { status: 404 });
  }

  if (!clinica.stripeSubscriptionId) {
    return NextResponse.json(
      { error: "Nenhuma assinatura Stripe ativa encontrada para esta clínica." },
      { status: 400 }
    );
  }

  // Verificar se já está no plano solicitado
  if (clinica.plano.nome === (novoPlanoKey as unknown as TipoPlano)) {
    return NextResponse.json(
      { error: "A clínica já está neste plano." },
      { status: 400 }
    );
  }

  // Buscar a assinatura no Stripe para obter o item ID
  const subscription = await stripe.subscriptions.retrieve(
    clinica.stripeSubscriptionId
  );
  const itemId = subscription.items.data[0]?.id;

  if (!itemId) {
    return NextResponse.json(
      { error: "Item de assinatura não encontrado no Stripe." },
      { status: 500 }
    );
  }

  // Atualizar assinatura no Stripe com prorrateio imediato
  await stripe.subscriptions.update(clinica.stripeSubscriptionId, {
    items: [{ id: itemId, price: novoPriceId }],
    proration_behavior: "always_invoice",
  });

  // Atualizar banco local imediatamente (webhook subscription.updated também fará isso)
  const novoPlano = await prisma.plano.findUnique({
    where: { nome: novoPlanoKey as unknown as TipoPlano },
  });

  if (novoPlano) {
    await prisma.tenant.update({
      where: { id: clinicaId },
      data: {
        planoId: novoPlano.id,
        tokensMensaisDisponiveis: novoPlano.tokensMensais,
        telemedicineHabilitada: novoPlano.telemedicineHabilitada,
      },
    });
  }

  const planoInfo = PLANOS_STRIPE[novoPlanoKey];
  return NextResponse.json({
    success: true,
    novoPlano: novoPlanoKey,
    nome: planoInfo.nome,
    preco: planoInfo.precoFormatado,
    mensagem: `Plano atualizado para ${planoInfo.nome} com sucesso. O prorrateio será cobrado imediatamente.`,
  });
}
