import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { TipoPlano, TipoUsuario, StatusClinica } from "@/lib/generated/prisma";
import bcrypt from "bcryptjs";
import { sendEmail } from "@/lib/email";
import {
  gerarEmailBoasVindas,
  gerarEmailBoasVindasTexto,
} from "@/lib/email/templates/boas-vindas";

// Mapeamento de planos
const PLANO_MAPPING: Record<string, TipoPlano> = {
  BASICO: TipoPlano.BASICO,
  INTERMEDIARIO: TipoPlano.INTERMEDIARIO,
  PROFISSIONAL: TipoPlano.PROFISSIONAL,
};

const PLANO_NOMES: Record<string, string> = {
  BASICO: "Básico",
  INTERMEDIARIO: "Intermediário",
  PROFISSIONAL: "Profissional",
};

/**
 * API para processar uma sessão de checkout manualmente (desenvolvimento)
 * GET /api/stripe/process-session?session_id=cs_xxx
 */
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json(
        { error: "session_id é obrigatório" },
        { status: 400 }
      );
    }

    console.log("Processando sessão:", sessionId);

    // Buscar sessão no Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: "Sessão não encontrada" },
        { status: 404 }
      );
    }

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Pagamento não confirmado", status: session.payment_status },
        { status: 400 }
      );
    }

    // Extrair dados
    const planoKey = session.metadata?.plano as keyof typeof PLANO_MAPPING;
    const customerEmail =
      session.customer_details?.email || session.customer_email;
    const customerName = session.customer_details?.name || "Clínica Nova";

    if (!customerEmail) {
      return NextResponse.json(
        { error: "Email do cliente não encontrado" },
        { status: 400 }
      );
    }

    if (!planoKey || !PLANO_MAPPING[planoKey]) {
      return NextResponse.json(
        { error: "Plano não encontrado nos metadados" },
        { status: 400 }
      );
    }

    // Verificar se já foi processado
    const existingUser = await prisma.usuario.findUnique({
      where: { email: customerEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: "Este email já está cadastrado",
          message: "A sessão já foi processada anteriormente",
        },
        { status: 409 }
      );
    }

    // Buscar plano no banco
    const plano = await prisma.plano.findUnique({
      where: { nome: PLANO_MAPPING[planoKey] },
    });

    if (!plano) {
      return NextResponse.json(
        { error: "Plano não encontrado no banco de dados" },
        { status: 404 }
      );
    }

    // Gerar dados
    const finalCnpj = generateTempCnpj();
    const senhaGerada = generateRandomPassword();
    const senhaHash = await bcrypt.hash(senhaGerada, 10);
    const cpfTemp = `000${finalCnpj.slice(-9)}`;

    // Criar clínica
    const clinica = await prisma.tenant.create({
      data: {
        nome: customerName,
        cnpj: finalCnpj,
        email: customerEmail,
        telefone: session.customer_details?.phone || "",
        planoId: plano.id,
        tokensMensaisDisponiveis: plano.tokensMensais,
        tokensConsumidos: 0,
        telemedicineHabilitada: plano.telemedicineHabilitada,
        status: StatusClinica.ATIVA,
        dataContratacao: new Date(),
        dataExpiracao: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        stripeCustomerId: session.customer as string || null,
        stripeSubscriptionId: session.subscription as string || null,
      },
    });

    console.log("Clínica criada:", clinica.id);

    // Criar usuário
    const usuario = await prisma.usuario.create({
      data: {
        email: customerEmail,
        senha: senhaHash,
        nome: `Admin ${customerName}`,
        cpf: cpfTemp,
        tipo: TipoUsuario.ADMIN_CLINICA,
        clinicaId: clinica.id,
        ativo: true,
        primeiroAcesso: true,
      },
    });

    console.log("Usuário criado:", usuario.id);

    // Criar pagamento
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

    // Enviar email
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const planoNome = PLANO_NOMES[planoKey] || planoKey;

    let emailEnviado = false;
    try {
      const emailHtml = gerarEmailBoasVindas({
        nomeClinica: customerName,
        email: customerEmail,
        senha: senhaGerada,
        plano: planoNome,
        loginUrl: `${baseUrl}/login`,
      });

      const emailTexto = gerarEmailBoasVindasTexto({
        nomeClinica: customerName,
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

      emailEnviado = true;
      console.log("Email enviado para:", customerEmail);
    } catch (emailError) {
      console.error("Erro ao enviar email:", emailError);
    }

    return NextResponse.json({
      success: true,
      message: "Conta criada com sucesso!",
      data: {
        clinica: customerName,
        email: customerEmail,
        senha: senhaGerada,
        plano: planoNome,
        emailEnviado,
      },
    });
  } catch (error) {
    console.error("Erro ao processar sessão:", error);
    return NextResponse.json(
      {
        error: "Erro ao processar sessão",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

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

function generateTempCnpj(): string {
  const timestamp = Date.now().toString().slice(-10);
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, "0");
  return timestamp + random;
}
