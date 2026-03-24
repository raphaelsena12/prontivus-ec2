import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateCidSchema = z.object({
  descricao: z.string().min(3, "Descricao deve ter no minimo 3 caracteres").optional(),
  categoria: z.string().optional().nullable(),
  subcategoria: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  ativo: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const cid = await prisma.cid.findFirst({
      where: { id, clinicaId: auth.clinicaId! },
    });

    if (!cid) {
      return NextResponse.json({ error: "CID nao encontrado" }, { status: 404 });
    }

    return NextResponse.json({ cid });
  } catch (error) {
    console.error("Erro ao buscar CID:", error);
    return NextResponse.json({ error: "Erro ao buscar CID" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const cidExistente = await prisma.cid.findFirst({
      where: { id, clinicaId: auth.clinicaId! },
    });

    if (!cidExistente) {
      return NextResponse.json({ error: "CID nao encontrado" }, { status: 404 });
    }

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
        categoria: validation.data.categoria?.trim() || null,
        subcategoria: validation.data.subcategoria?.trim() || null,
        observacoes: validation.data.observacoes?.trim() || null,
      },
    });

    return NextResponse.json({ cid });
  } catch (error) {
    console.error("Erro ao atualizar CID:", error);
    return NextResponse.json({ error: "Erro ao atualizar CID" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const cid = await prisma.cid.findFirst({
      where: { id, clinicaId: auth.clinicaId! },
    });

    if (!cid) {
      return NextResponse.json({ error: "CID nao encontrado" }, { status: 404 });
    }

    await prisma.cid.delete({ where: { id } });
    return NextResponse.json({ message: "CID excluido com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir CID:", error);
    return NextResponse.json({ error: "Erro ao excluir CID" }, { status: 500 });
  }
}
