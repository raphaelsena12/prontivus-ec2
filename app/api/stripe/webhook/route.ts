import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { TipoPlano, TipoUsuario, StatusClinica } from "@/lib/generated/prisma";
import bcrypt from "bcryptjs";
import Stripe from "stripe";
import { sendEmail } from "@/lib/email";
import {
  gerarEmailBoasVindas,
  gerarEmailBoasVindasTexto,
} from "@/lib/email/templates/boas-vindas";
import {
  gerarEmailPagamentoFalha,
  gerarEmailPagamentoFalhaTexto,
} from "@/lib/email/templates/pagamento-falha";
import {
  gerarEmailPagamentoSucesso,
  gerarEmailPagamentoSucessoTexto,
} from "@/lib/email/templates/pagamento-sucesso";

// Mapeamento de planos Stripe para TipoPlano do Prisma
const PLANO_MAPPING: Record<string, TipoPlano> = {
  BASICO: TipoPlano.BASICO,
  INTERMEDIARIO: TipoPlano.INTERMEDIARIO,
  PROFISSIONAL: TipoPlano.PROFISSIONAL,
};

// Nomes dos planos para exibição
const PLANO_NOMES: Record<string, string> = {
  BASICO: "Básico",
  INTERMEDIARIO: "Intermediário",
  PROFISSIONAL: "Profissional",
};

// Configuração do Next.js para raw body
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  // Se não houver STRIPE_WEBHOOK_SECRET, processar sem validação (desenvolvimento)
  let event: Stripe.Event;

  if (process.env.STRIPE_WEBHOOK_SECRET && signature) {
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Erro na validação do webhook:", err);
      return NextResponse.json(
        { error: "Assinatura inválida" },
        { status: 400 }
      );
    }
  } else {
    // Modo de desenvolvimento - parse direto
    try {
      event = JSON.parse(body) as Stripe.Event;
    } catch (err) {
      console.error("Erro ao parsear evento:", err);
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }
  }

  // Processar eventos
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutComplete(session);
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      console.log("Assinatura atualizada:", subscription.id);
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionCanceled(subscription);
      break;
    }
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentSucceeded(invoice);
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentFailed(invoice);
      break;
    }
    default:
      console.log(`Evento não tratado: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  try {
    console.log("Processando checkout completo:", session.id);

    // Extrair dados do checkout
    const planoKey = session.metadata?.plano as keyof typeof PLANO_MAPPING;
    const customFields = session.custom_fields || [];

    // Buscar dados dos custom fields
    const nomeClinicaField = customFields.find((f) => f.key === "nome_clinica");
    const cnpjField = customFields.find((f) => f.key === "cnpj");

    const nomeClinica =
      nomeClinicaField?.text?.value ||
      session.customer_details?.name ||
      "Clínica Nova";
    const cnpjRaw = cnpjField?.text?.value || "";
    const cnpj = cnpjRaw.replace(/\D/g, "");

    // Buscar email do cliente
    const customerEmail =
      session.customer_details?.email || session.customer_email;

    if (!customerEmail) {
      console.error("Email do cliente não encontrado");
      return;
    }

    if (!planoKey || !PLANO_MAPPING[planoKey]) {
      console.error("Plano não encontrado nos metadados:", planoKey);
      return;
    }

    // Verificar se CNPJ já existe
    if (cnpj) {
      const existingTenant = await prisma.tenant.findUnique({
        where: { cnpj },
      });

      if (existingTenant) {
        console.log("CNPJ já cadastrado, atualizando assinatura");
        // Atualizar IDs do Stripe
        await prisma.tenant.update({
          where: { id: existingTenant.id },
          data: {
            stripeCustomerId: (session.customer as string) || null,
            stripeSubscriptionId: (session.subscription as string) || null,
            status: StatusClinica.ATIVA,
          },
        });
        return;
      }
    }

    // Buscar plano no banco
    const plano = await prisma.plano.findUnique({
      where: { nome: PLANO_MAPPING[planoKey] },
    });

    if (!plano) {
      console.error("Plano não encontrado no banco:", PLANO_MAPPING[planoKey]);
      return;
    }

    // Gerar CNPJ temporário se não fornecido
    const finalCnpj = cnpj || generateTempCnpj();

    // Verificar se email já está em uso
    const existingUser = await prisma.usuario.findUnique({
      where: { email: customerEmail },
    });

    if (existingUser) {
      console.log("Email já cadastrado:", customerEmail);
      return;
    }

    // Criar clínica (Tenant)
    const clinica = await prisma.tenant.create({
      data: {
        nome: nomeClinica,
        cnpj: finalCnpj,
        email: customerEmail,
        telefone: session.customer_details?.phone || "",
        planoId: plano.id,
        tokensMensaisDisponiveis: plano.tokensMensais,
        tokensConsumidos: 0,
        telemedicineHabilitada: plano.telemedicineHabilitada,
        status: StatusClinica.ATIVA,
        dataContratacao: new Date(),
        dataExpiracao: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 ano
        stripeCustomerId: (session.customer as string) || null,
        stripeSubscriptionId: (session.subscription as string) || null,
      },
    });

    console.log("Clínica criada:", clinica.id);

    // Gerar senha aleatória
    const senhaGerada = generateRandomPassword();
    const senhaHash = await bcrypt.hash(senhaGerada, 10);

    // Gerar CPF temporário baseado no CNPJ
    const cpfTemp = `000${finalCnpj.slice(-9)}`;

    // Criar usuário ADMIN_CLINICA
    const usuario = await prisma.usuario.create({
      data: {
        email: customerEmail,
        senha: senhaHash,
        nome: `Admin ${nomeClinica}`,
        cpf: cpfTemp,
        tipo: TipoUsuario.ADMIN_CLINICA,
        clinicaId: clinica.id,
        ativo: true,
        primeiroAcesso: true,
      },
    });

    console.log("Usuário Admin criado:", usuario.id);

    // Criar registro de pagamento
    await prisma.pagamento.create({
      data: {
        tenantId: clinica.id,
        valor: Number(plano.preco),
        mesReferencia: new Date(),
        status: "PAGO",
        metodoPagamento: "CARTAO",
        transacaoId:
          (session.payment_intent as string) ||
          (session.subscription as string),
        dataPagamento: new Date(),
        dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        observacoes: `Pagamento via Stripe - Session ID: ${session.id}`,
      },
    });

    console.log("Pagamento registrado");

    // Enviar email de boas-vindas
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const planoNome = PLANO_NOMES[planoKey] || planoKey;

    try {
      const emailHtml = gerarEmailBoasVindas({
        nomeClinica,
        email: customerEmail,
        senha: senhaGerada,
        plano: planoNome,
        loginUrl: `${baseUrl}/login`,
      });

      const emailTexto = gerarEmailBoasVindasTexto({
        nomeClinica,
        email: customerEmail,
        senha: senhaGerada,
        plano: planoNome,
        loginUrl: `${baseUrl}/login`,
      });

      await sendEmail({
        to: customerEmail,
        subject: `Bem-vindo ao Prontivus! Suas credenciais de acesso`,
        html: emailHtml,
        text: emailTexto,
        fromName: "Prontivus",
      });

      console.log("Email de boas-vindas enviado para:", customerEmail);
    } catch (emailError) {
      console.error("Erro ao enviar email de boas-vindas:", emailError);
      // Não falhar o webhook se o email não for enviado
    }

    // Log das credenciais
    console.log("============================================");
    console.log("NOVO CLIENTE CADASTRADO:");
    console.log("Clínica:", nomeClinica);
    console.log("Email:", customerEmail);
    console.log("Senha:", senhaGerada);
    console.log("Plano:", planoKey);
    console.log("============================================");
  } catch (error) {
    console.error("Erro ao processar checkout:", error);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  try {
    console.log("Processando falha de pagamento:", invoice.id);

    const customerId = invoice.customer as string;
    if (!customerId) {
      console.error("Customer ID não encontrado na fatura");
      return;
    }

    // Buscar clínica pelo stripeCustomerId
    const clinica = await prisma.tenant.findUnique({
      where: { stripeCustomerId: customerId },
    });

    if (!clinica) {
      console.log("Clínica não encontrada para customer:", customerId);
      return;
    }

    // Buscar plano separadamente
    const plano = await prisma.plano.findUnique({
      where: { id: clinica.planoId },
    });

    if (!plano) {
      console.log("Plano não encontrado para clínica:", clinica.id);
      return;
    }

    // Suspender a clínica
    await prisma.tenant.update({
      where: { id: clinica.id },
      data: { status: StatusClinica.SUSPENSA },
    });

    console.log("Clínica suspensa:", clinica.id);

    // Registrar falha no pagamento
    const dataVencimento = invoice.due_date
      ? new Date(invoice.due_date * 1000)
      : new Date();

    await prisma.pagamento.create({
      data: {
        tenantId: clinica.id,
        valor: (invoice.amount_due || 0) / 100,
        mesReferencia: new Date(),
        status: "PENDENTE",
        metodoPagamento: "CARTAO",
        transacaoId: invoice.id,
        dataVencimento,
        observacoes: `Falha no pagamento - Invoice ID: ${invoice.id}`,
      },
    });

    // Enviar email de falha
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const planoNome =
      PLANO_NOMES[plano.nome] || plano.nome;

    try {
      const emailHtml = gerarEmailPagamentoFalha({
        nomeClinica: clinica.nome,
        plano: planoNome,
        dataVencimento: dataVencimento.toLocaleDateString("pt-BR"),
        loginUrl: `${baseUrl}/login`,
      });

      const emailTexto = gerarEmailPagamentoFalhaTexto({
        nomeClinica: clinica.nome,
        plano: planoNome,
        dataVencimento: dataVencimento.toLocaleDateString("pt-BR"),
        loginUrl: `${baseUrl}/login`,
      });

      await sendEmail({
        to: clinica.email,
        subject: `Problema com seu pagamento - Prontivus`,
        html: emailHtml,
        text: emailTexto,
        fromName: "Prontivus",
      });

      console.log("Email de falha enviado para:", clinica.email);
    } catch (emailError) {
      console.error("Erro ao enviar email de falha:", emailError);
    }

    console.log("============================================");
    console.log("PAGAMENTO FALHOU:");
    console.log("Clínica:", clinica.nome);
    console.log("Email:", clinica.email);
    console.log("Invoice:", invoice.id);
    console.log("============================================");
  } catch (error) {
    console.error("Erro ao processar falha de pagamento:", error);
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    console.log("Processando pagamento bem-sucedido:", invoice.id);

    const customerId = invoice.customer as string;
    if (!customerId) {
      console.error("Customer ID não encontrado na fatura");
      return;
    }

    // Ignorar faturas de primeira cobrança (já tratado no checkout.session.completed)
    if (invoice.billing_reason === "subscription_create") {
      console.log("Primeira cobrança - ignorando (já tratado no checkout)");
      return;
    }

    // Buscar clínica pelo stripeCustomerId
    const clinica = await prisma.tenant.findUnique({
      where: { stripeCustomerId: customerId },
    });

    if (!clinica) {
      console.log("Clínica não encontrada para customer:", customerId);
      return;
    }

    // Buscar plano separadamente
    const plano = await prisma.plano.findUnique({
      where: { id: clinica.planoId },
    });

    if (!plano) {
      console.log("Plano não encontrado para clínica:", clinica.id);
      return;
    }

    // Verificar se a clínica estava suspensa
    const estavaSuspensa = clinica.status === StatusClinica.SUSPENSA;

    // Reativar a clínica se necessário
    if (estavaSuspensa) {
      await prisma.tenant.update({
        where: { id: clinica.id },
        data: { status: StatusClinica.ATIVA },
      });

      console.log("Clínica reativada:", clinica.id);
    }

    // Registrar pagamento
    await prisma.pagamento.create({
      data: {
        tenantId: clinica.id,
        valor: (invoice.amount_paid || 0) / 100,
        mesReferencia: new Date(),
        status: "PAGO",
        metodoPagamento: "CARTAO",
        transacaoId: invoice.id,
        dataPagamento: new Date(),
        dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        observacoes: `Pagamento recorrente - Invoice ID: ${invoice.id}`,
      },
    });

    // Renovar tokens mensais
    await prisma.tenant.update({
      where: { id: clinica.id },
      data: {
        tokensMensaisDisponiveis: plano.tokensMensais,
        tokensConsumidos: 0,
      },
    });

    console.log("Tokens renovados para clínica:", clinica.id);

    // Se a clínica estava suspensa, enviar email de reativação
    if (estavaSuspensa) {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const planoNome =
        PLANO_NOMES[plano.nome] || plano.nome;

      try {
        const emailHtml = gerarEmailPagamentoSucesso({
          nomeClinica: clinica.nome,
          plano: planoNome,
          dataRenovacao: new Date().toLocaleDateString("pt-BR"),
          loginUrl: `${baseUrl}/login`,
        });

        const emailTexto = gerarEmailPagamentoSucessoTexto({
          nomeClinica: clinica.nome,
          plano: planoNome,
          dataRenovacao: new Date().toLocaleDateString("pt-BR"),
          loginUrl: `${baseUrl}/login`,
        });

        await sendEmail({
          to: clinica.email,
          subject: `Pagamento confirmado - Sua conta foi reativada!`,
          html: emailHtml,
          text: emailTexto,
          fromName: "Prontivus",
        });

        console.log("Email de reativação enviado para:", clinica.email);
      } catch (emailError) {
        console.error("Erro ao enviar email de reativação:", emailError);
      }
    }

    console.log("============================================");
    console.log("PAGAMENTO RECEBIDO:");
    console.log("Clínica:", clinica.nome);
    console.log("Valor:", (invoice.amount_paid || 0) / 100);
    console.log("Reativada:", estavaSuspensa);
    console.log("============================================");
  } catch (error) {
    console.error("Erro ao processar pagamento:", error);
  }
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  try {
    console.log("Assinatura cancelada:", subscription.id);

    const customerId = subscription.customer as string;
    if (!customerId) {
      console.error("Customer ID não encontrado na assinatura");
      return;
    }

    // Buscar clínica pelo stripeCustomerId
    const clinica = await prisma.tenant.findUnique({
      where: { stripeCustomerId: customerId },
    });

    if (!clinica) {
      console.log("Clínica não encontrada para customer:", customerId);
      return;
    }

    // Inativar a clínica
    await prisma.tenant.update({
      where: { id: clinica.id },
      data: {
        status: StatusClinica.INATIVA,
        stripeSubscriptionId: null,
      },
    });

    console.log("============================================");
    console.log("ASSINATURA CANCELADA:");
    console.log("Clínica:", clinica.nome);
    console.log("Email:", clinica.email);
    console.log("============================================");
  } catch (error) {
    console.error("Erro ao processar cancelamento:", error);
  }
}

// Gerar senha aleatória
function generateRandomPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const specialChars = "@#$%&*";
  let password = "";

  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  password += specialChars.charAt(
    Math.floor(Math.random() * specialChars.length)
  );
  password += Math.floor(Math.random() * 10);

  return password;
}

// Gerar CNPJ temporário único
function generateTempCnpj(): string {
  const timestamp = Date.now().toString().slice(-10);
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, "0");
  return timestamp + random;
}
