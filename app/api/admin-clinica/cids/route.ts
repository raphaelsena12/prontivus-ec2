import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const cidSchema = z.object({
  codigo: z.string().min(1, "Codigo e obrigatorio"),
  descricao: z.string().min(3, "Descricao deve ter no minimo 3 caracteres"),
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

export async function GET(request: NextRequest) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const ativo = searchParams.get("ativo");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);

    const where = {
      // Catálogo global (gerenciado pelo SUPER_ADMIN)
      clinicaId: null,
      ...(ativo !== null && { ativo: ativo === "true" }),
      ...(search && {
        OR: [
          { codigo: { contains: search, mode: "insensitive" as const } },
          { descricao: { contains: search, mode: "insensitive" as const } },
          { grupoNome: { contains: search, mode: "insensitive" as const } },
          { categoriaCod: { contains: search, mode: "insensitive" as const } },
          { categoriaNome: { contains: search, mode: "insensitive" as const } },
          { subcategoriaCod: { contains: search, mode: "insensitive" as const } },
          { subcategoriaNome: { contains: search, mode: "insensitive" as const } },
          { categoria: { contains: search, mode: "insensitive" as const } },
          { subcategoria: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const cids = await prisma.cid.findMany({
      where,
      orderBy: [{ codigo: "asc" }],
      take: limit,
    });

    return NextResponse.json({ cids });
  } catch (error) {
    console.error("Erro ao listar CIDs:", error);
    return NextResponse.json({ error: "Erro ao listar CIDs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;

    return NextResponse.json(
      { error: "CIDs agora são gerenciados pelo Super Admin (catálogo global)." },
      { status: 403 }
    );
  } catch (error) {
    console.error("Erro ao criar CID:", error);
    return NextResponse.json({ error: "Erro ao criar CID" }, { status: 500 });
  }
}
