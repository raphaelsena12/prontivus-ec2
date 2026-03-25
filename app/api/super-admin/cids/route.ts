import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const cidSchema = z.object({
  codigo: z.string().min(1, "Codigo e obrigatorio"),
  descricao: z.string().min(3, "Descricao deve ter no minimo 3 caracteres"),
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

// GET /api/super-admin/cids (catálogo global)
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim();
    const ativo = searchParams.get("ativo");
    const limit = Math.min(parseInt(searchParams.get("limit") || "1000"), 5000);

    const where: any = {
      clinicaId: null,
      ...(ativo !== null && { ativo: ativo === "true" }),
      ...(search && {
        OR: [
          { codigo: { contains: search, mode: "insensitive" as const } },
          { descricao: { contains: search, mode: "insensitive" as const } },
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
    console.error("Erro ao listar CIDs (super-admin):", error);
    return NextResponse.json({ error: "Erro ao listar CIDs" }, { status: 500 });
  }
}

// POST /api/super-admin/cids (criar no catálogo global)
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const body = await request.json();
    const validation = cidSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;
    const codigoNormalizado = data.codigo.trim().toUpperCase();

    const existente = await prisma.cid.findFirst({
      where: { clinicaId: null, codigo: codigoNormalizado },
      select: { id: true },
    });

    if (existente) {
      return NextResponse.json({ error: "CID ja cadastrado no catalogo global" }, { status: 409 });
    }

    const cid = await prisma.cid.create({
      data: {
        clinicaId: null,
        codigo: codigoNormalizado,
        descricao: data.descricao.trim(),
        categoria: data.categoria?.trim() || null,
        subcategoria: data.subcategoria?.trim() || null,
        observacoes: data.observacoes?.trim() || null,
        ativo: data.ativo ?? true,
      },
    });

    return NextResponse.json({ cid }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar CID (super-admin):", error);
    return NextResponse.json({ error: "Erro ao criar CID" }, { status: 500 });
  }
}

