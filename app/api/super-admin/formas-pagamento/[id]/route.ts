import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const updateFormaPagamentoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").optional(),
  descricao: z.string().optional().nullable(),
  tipo: z
    .enum([
      "DINHEIRO",
      "CARTAO_CREDITO",
      "CARTAO_DEBITO",
      "PIX",
      "BOLETO",
      "TRANSFERENCIA",
    ])
    .optional(),
  bandeiraCartao: z.string().optional().nullable(),
  ativo: z.boolean().optional(),
});

async function checkAuthorization() {
  const session = await getSession();
  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }),
    };
  }
  if (session.user.tipo !== TipoUsuario.SUPER_ADMIN) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Acesso negado" }, { status: 403 }),
    };
  }
  return { authorized: true };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const formaPagamento = await prisma.formaPagamento.findFirst({
      where: { id, clinicaId: null },
    });
    if (!formaPagamento) {
      return NextResponse.json({ error: "Forma de pagamento não encontrada" }, { status: 404 });
    }
    return NextResponse.json({ formaPagamento });
  } catch (error) {
    console.error("Erro ao buscar forma de pagamento (super-admin):", error);
    return NextResponse.json(
      { error: "Erro ao buscar forma de pagamento" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const existente = await prisma.formaPagamento.findFirst({
      where: { id, clinicaId: null },
      select: { id: true },
    });
    if (!existente) {
      return NextResponse.json({ error: "Forma de pagamento não encontrada" }, { status: 404 });
    }

    const body = await request.json();
    const validation = updateFormaPagamentoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const formaPagamento = await prisma.formaPagamento.update({
      where: { id },
      data: validation.data,
    });
    return NextResponse.json({ formaPagamento });
  } catch (error) {
    console.error("Erro ao atualizar forma de pagamento (super-admin):", error);
    return NextResponse.json(
      { error: "Erro ao atualizar forma de pagamento" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const existente = await prisma.formaPagamento.findFirst({
      where: { id, clinicaId: null },
      select: { id: true },
    });
    if (!existente) {
      return NextResponse.json({ error: "Forma de pagamento não encontrada" }, { status: 404 });
    }

    await prisma.formaPagamento.delete({ where: { id } });
    return NextResponse.json({ message: "Forma de pagamento excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar forma de pagamento (super-admin):", error);
    return NextResponse.json(
      { error: "Erro ao deletar forma de pagamento" },
      { status: 500 }
    );
  }
}

