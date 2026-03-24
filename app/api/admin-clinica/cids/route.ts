import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const cidSchema = z.object({
  codigo: z.string().min(1, "Codigo e obrigatorio"),
  descricao: z.string().min(3, "Descricao deve ter no minimo 3 caracteres"),
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
      clinicaId: auth.clinicaId!,
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
    console.error("Erro ao listar CIDs:", error);
    return NextResponse.json({ error: "Erro ao listar CIDs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminClinicaAuth();
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

    const existente = await prisma.cid.findUnique({
      where: {
        clinicaId_codigo: {
          clinicaId: auth.clinicaId!,
          codigo: codigoNormalizado,
        },
      },
    });

    if (existente) {
      return NextResponse.json({ error: "CID ja cadastrado para a clinica" }, { status: 409 });
    }

    const cid = await prisma.cid.create({
      data: {
        clinicaId: auth.clinicaId!,
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
    console.error("Erro ao criar CID:", error);
    return NextResponse.json({ error: "Erro ao criar CID" }, { status: 500 });
  }
}
