import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

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

    const searchFilter = search
      ? {
          OR: [
            { nome: { contains: search, mode: "insensitive" as const } },
            { principioAtivo: { contains: search, mode: "insensitive" as const } },
            { laboratorio: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [clinicaMeds, globalMeds] = await Promise.all([
      // Medicamentos criados pela própria clínica
      prisma.medicamento.findMany({
        where: {
          clinicaId: auth.clinicaId!,
          ...searchFilter,
        },
        orderBy: { nome: "asc" },
        take: 5000,
      }),
      // Catálogo global (gerenciado pelo Super Admin)
      prisma.medicamento.findMany({
        where: {
          clinicaId: null,
          ...searchFilter,
        },
        orderBy: { nome: "asc" },
        take: 12000,
      }),
    ]);

    function toRow(
      m: {
        id: string;
        nome: string;
        principioAtivo: string | null;
        laboratorio: string | null;
        concentracao: string | null;
        apresentacao: string | null;
        pharmaceuticalForm?: string | null;
        therapeuticClass?: string | null;
        ativo: boolean;
      },
      origem: "CLINICA" | "GLOBAL"
    ) {
      const partes = [m.principioAtivo, m.laboratorio].filter(Boolean);
      const descricao = partes.length
        ? `${m.nome} — ${partes.join(" | ")}`
        : m.nome;

      return {
        rowId: `${origem.toLowerCase()}:${m.id}`,
        origem,
        sourceId: m.id,
        codigo: "—",
        descricao,
        tipo: (m as any).pharmaceuticalForm ?? m.apresentacao ?? null,
        categoria: (m as any).therapeuticClass ?? null,
        ativo: m.ativo,
      };
    }

    const byDescricao = (a: { descricao: string }, b: { descricao: string }) =>
      a.descricao.localeCompare(b.descricao, "pt-BR", { sensitivity: "base" });

    // Clínica no topo; global depois. Dentro de cada grupo, ordem alfabética.
    const merged = [
      ...[...clinicaMeds.map((m) => toRow(m, "CLINICA"))].sort(byDescricao),
      ...[...globalMeds.map((m) => toRow(m, "GLOBAL"))].sort(byDescricao),
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
    console.error("Erro em GET medicamentos/lista-unificada:", error);
    return NextResponse.json(
      { error: "Erro ao listar medicamentos" },
      { status: 500 }
    );
  }
}
