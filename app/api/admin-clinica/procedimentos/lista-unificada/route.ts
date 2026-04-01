import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import {
  buildCodigoTussCatalogoAndParts,
  whereFromAndParts,
} from "@/lib/codigo-tuss-catalogo-filter";

const TUSS_FETCH_CAP = 12_000;

export async function GET(request: NextRequest) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim();
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "50", 10) || 50, 1),
      100
    );

    const procWhere = {
      clinicaId: auth.clinicaId!,
      ...(search
        ? {
            OR: [
              { codigo: { contains: search, mode: "insensitive" as const } },
              { nome: { contains: search, mode: "insensitive" as const } },
              { descricao: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const tussAnd = buildCodigoTussCatalogoAndParts("PROCEDIMENTOS", search, true);
    const tussWhere = whereFromAndParts(tussAnd);

    const [procedimentos, codigosTuss] = await Promise.all([
      prisma.procedimento.findMany({
        where: procWhere,
        orderBy: { nome: "asc" },
        take: 5000,
      }),
      prisma.codigoTuss.findMany({
        where: tussWhere,
        select: {
          id: true,
          codigoTuss: true,
          descricao: true,
          sipGrupo: true,
          categoriaProntivus: true,
          ativo: true,
        },
        orderBy: { descricao: "asc" },
        take: TUSS_FETCH_CAP,
      }),
    ]);

    const clinicItems = procedimentos.map(
      (p) => ({
        rowId: `clinica:${p.id}`,
        origem: "CLINICA",
        sourceId: p.id,
        codigo: p.codigo,
        descricao: [p.nome, p.descricao].filter(Boolean).join(" — ") || p.nome,
        tipo: null,
        categoria: null,
        valor: String(p.valor),
        ativo: p.ativo,
      })
    );

    const tussItems = codigosTuss.map((c) => ({
      rowId: `tuss:${c.id}`,
      origem: "TUSS",
      sourceId: c.id,
      codigo: c.codigoTuss,
      descricao: c.descricao,
      tipo: c.sipGrupo,
      categoria: c.categoriaProntivus,
      valor: null,
      ativo: c.ativo,
    }));

    const byDescricao = (a: { descricao: string }, b: { descricao: string }) =>
      a.descricao.localeCompare(b.descricao, "pt-BR", { sensitivity: "base" });

    const merged = [
      ...[...clinicItems].sort(byDescricao),
      ...[...tussItems].sort(byDescricao),
    ];

    const total = merged.length;
    const skip = (page - 1) * limit;
    const items = merged.slice(skip, skip + limit);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json({
      items,
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    console.error("Erro em GET procedimentos/lista-unificada:", error);
    return NextResponse.json(
      { error: "Erro ao listar procedimentos" },
      { status: 500 }
    );
  }
}
