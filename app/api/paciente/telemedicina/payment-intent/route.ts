import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { stripe } from "@/lib/stripe";
import { z } from "zod";

const schema = z.object({
  medicoTelemedicinaId: z.string().uuid(),
  medicoId: z.string().uuid(),
  valor: z.number().positive(),
  medicoNome: z.string(),
  especialidade: z.string().optional(),
});

// POST /api/paciente/telemedicina/payment-intent
// Cria um Stripe PaymentIntent para consulta de telemedicina imediata
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (session.user.tipo !== TipoUsuario.PACIENTE) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // Busca o paciente pelo usuarioId (sem filtrar por clinicaId — pacientes
    // podem ter sido cadastrados manualmente antes de criar conta de usuário,
    // ou em ambiente multi-clínica o usuário pode estar em outra clínica)
    const paciente = await prisma.paciente.findFirst({
      where: { usuarioId: session.user.id },
      select: {
        id: true,
        nome: true,
        clinicaId: true,
        usuario: { select: { email: true } },
      },
      orderBy: { id: "asc" },
    });

    // Fallback: busca pelo email do usuário no campo email do paciente
    let pacienteId: string;
    let pacienteNome: string;
    let pacienteClinicaId: string;
    let pacienteEmail: string | null | undefined;

    if (paciente) {
      pacienteId = paciente.id;
      pacienteNome = paciente.nome;
      pacienteClinicaId = paciente.clinicaId;
      pacienteEmail = paciente.usuario?.email;
    } else if (session.user.email) {
      const pacientePorEmail = await prisma.paciente.findFirst({
        where: { email: session.user.email, ativo: true },
        select: { id: true, nome: true, clinicaId: true },
      });
      if (!pacientePorEmail) {
        return NextResponse.json(
          { error: "Paciente não encontrado. Verifique se seu cadastro está completo na clínica." },
          { status: 404 }
        );
      }
      pacienteId = pacientePorEmail.id;
      pacienteNome = pacientePorEmail.nome;
      pacienteClinicaId = pacientePorEmail.clinicaId;
      pacienteEmail = session.user.email;
    } else {
      return NextResponse.json(
        { error: "Paciente não encontrado. Verifique se seu cadastro está completo na clínica." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = schema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const { medicoTelemedicinaId, medicoId, valor, medicoNome, especialidade } = validation.data;

    // Verificar se o médico está realmente online
    const medicoTele = await prisma.medicoTelemedicina.findFirst({
      where: { id: medicoTelemedicinaId, medicoId, status: "ONLINE" },
    });
    if (!medicoTele) {
      return NextResponse.json(
        { error: "Médico não está disponível no momento" },
        { status: 400 }
      );
    }

    // Criar PagamentoConsulta pendente usando a clínica do paciente
    const pagamento = await prisma.pagamentoConsulta.create({
      data: {
        clinicaId: pacienteClinicaId,
        pacienteId,
        valor,
        status: "PENDENTE",
        metodoPagamento: "STRIPE",
        dataVencimento: new Date(Date.now() + 30 * 60 * 1000),
        observacoes: `Telemedicina imediata com ${medicoNome} - ${new Date().toLocaleString("pt-BR")}`,
      },
    });

    // Criar PaymentIntent no Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(valor * 100),
      currency: "brl",
      automatic_payment_methods: { enabled: true },
      description: `Consulta Telemedicina - ${medicoNome}${especialidade ? ` (${especialidade})` : ""}`,
      receipt_email: pacienteEmail || undefined,
      metadata: {
        tipo: "TELEMEDICINA_IMEDIATA",
        pacienteId,
        medicoId,
        medicoTelemedicinaId,
        pagamentoId: pagamento.id,
        clinicaId: pacienteClinicaId,
      },
    });

    // Salvar stripePaymentId no pagamento
    await prisma.pagamentoConsulta.update({
      where: { id: pagamento.id },
      data: { stripePaymentId: paymentIntent.id },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      pagamentoId: pagamento.id,
    });
  } catch (error) {
    console.error("Erro ao criar payment intent:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
