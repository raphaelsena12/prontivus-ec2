import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const updateMedicamentoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").optional(),
  principioAtivo: z.string().optional().nullable(),
  laboratorio: z.string().optional().nullable(),
  apresentacao: z.string().optional().nullable(),
  concentracao: z.string().optional().nullable(),
  unidade: z.string().optional().nullable(),
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
    const medicamento = await prisma.medicamento.findFirst({
      where: { id, clinicaId: null },
    });
    if (!medicamento) {
      return NextResponse.json({ error: "Medicamento não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ medicamento });
  } catch (error) {
    console.error("Erro ao buscar medicamento (super-admin):", error);
    return NextResponse.json({ error: "Erro ao buscar medicamento" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const existente = await prisma.medicamento.findFirst({
      where: { id, clinicaId: null },
      select: { id: true },
    });
    if (!existente) {
      return NextResponse.json({ error: "Medicamento não encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const validation = updateMedicamentoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const medicamento = await prisma.medicamento.update({
      where: { id },
      data: validation.data,
    });
    return NextResponse.json({ medicamento });
  } catch (error) {
    console.error("Erro ao atualizar medicamento (super-admin):", error);
    return NextResponse.json({ error: "Erro ao atualizar medicamento" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const existente = await prisma.medicamento.findFirst({
      where: { id, clinicaId: null },
      select: { id: true },
    });
    if (!existente) {
      return NextResponse.json({ error: "Medicamento não encontrado" }, { status: 404 });
    }

    await prisma.medicamento.delete({ where: { id } });
    return NextResponse.json({ message: "Medicamento excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir medicamento (super-admin):", error);
    return NextResponse.json({ error: "Erro ao excluir medicamento" }, { status: 500 });
  }
}

