import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const updateCidSchema = z.object({
  descricao: z.string().min(3, "Descricao deve ter no minimo 3 caracteres").optional(),
  grupoNome: z.string().optional().nullable(),
  categoriaCod: z.string().optional().nullable(),
  categoriaNome: z.string().optional().nullable(),
  subcategoriaCod: z.string().optional().nullable(),
  subcategoriaNome: z.string().optional().nullable(),
  categoria: z.string().optional().nullable(),
  subcategoria: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
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
    const cid = await prisma.cid.findFirst({
      where: { id, clinicaId: null },
    });
    if (!cid) return NextResponse.json({ error: "CID nao encontrado" }, { status: 404 });
    return NextResponse.json({ cid });
  } catch (error) {
    console.error("Erro ao buscar CID (super-admin):", error);
    return NextResponse.json({ error: "Erro ao buscar CID" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const existente = await prisma.cid.findFirst({
      where: { id, clinicaId: null },
      select: { id: true },
    });
    if (!existente) return NextResponse.json({ error: "CID nao encontrado" }, { status: 404 });

    const body = await request.json();
    const validation = updateCidSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const cid = await prisma.cid.update({
      where: { id },
      data: {
        ...validation.data,
        descricao: validation.data.descricao?.trim(),
        grupoNome: validation.data.grupoNome?.trim() || null,
        categoriaCod: validation.data.categoriaCod?.trim() || null,
        categoriaNome: validation.data.categoriaNome?.trim() || null,
        subcategoriaCod: validation.data.subcategoriaCod?.trim() || null,
        subcategoriaNome: validation.data.subcategoriaNome?.trim() || null,
        categoria: validation.data.categoria?.trim() || null,
        subcategoria: validation.data.subcategoria?.trim() || null,
        observacoes: validation.data.observacoes?.trim() || null,
      },
    });

    return NextResponse.json({ cid });
  } catch (error) {
    console.error("Erro ao atualizar CID (super-admin):", error);
    return NextResponse.json({ error: "Erro ao atualizar CID" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const existente = await prisma.cid.findFirst({
      where: { id, clinicaId: null },
      select: { id: true },
    });
    if (!existente) return NextResponse.json({ error: "CID nao encontrado" }, { status: 404 });

    await prisma.cid.delete({ where: { id } });
    return NextResponse.json({ message: "CID excluido com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir CID (super-admin):", error);
    return NextResponse.json({ error: "Erro ao excluir CID" }, { status: 500 });
  }
}

