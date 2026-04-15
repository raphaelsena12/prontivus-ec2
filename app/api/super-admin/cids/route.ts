import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
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
    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "50"), 1), 100);

    const where: any = {
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

    const [cids, total] = await Promise.all([
      prisma.cid.findMany({
        where,
        orderBy: [{ codigo: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.cid.count({ where }),
    ]);

    return NextResponse.json({ cids, total, page, pageSize });
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
        grupoNome: data.grupoNome?.trim() || null,
        categoriaCod: data.categoriaCod?.trim() || null,
        categoriaNome: data.categoriaNome?.trim() || null,
        subcategoriaCod: data.subcategoriaCod?.trim() || null,
        subcategoriaNome: data.subcategoriaNome?.trim() || null,
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

