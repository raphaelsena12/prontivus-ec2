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
      where: { id, clinicaId: null },
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

    return NextResponse.json(
      { error: "CIDs agora são gerenciados pelo Super Admin (catálogo global)." },
      { status: 403 }
    );
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

    return NextResponse.json(
      { error: "CIDs agora são gerenciados pelo Super Admin (catálogo global)." },
      { status: 403 }
    );
  } catch (error) {
    console.error("Erro ao excluir CID:", error);
    return NextResponse.json({ error: "Erro ao excluir CID" }, { status: 500 });
  }
}
