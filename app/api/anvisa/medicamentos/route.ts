import { NextRequest, NextResponse } from "next/server";
import { MedicamentoAnvisaRepository } from "@/lib/anvisa/medicamento-repository";

const repository = new MedicamentoAnvisaRepository();

/**
 * GET /api/anvisa/medicamentos
 * Busca medicamentos da base ANVISA
 *
 * Query params:
 * - search: termo de busca (nome, princípio ativo ou empresa)
 * - limit: limite de resultados (padrão: 50, máximo: 100)
 * - page: página para paginação (padrão: 1)
 * - tipo: tipo de busca - "nome" | "principio-ativo" | "all" (padrão: "all")
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const limitParam = searchParams.get("limit");
    const pageParam = searchParams.get("page");
    const tipo = searchParams.get("tipo") || "all";

    // Validar e limitar o limite de resultados
    let limit = 50;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limit = Math.min(parsedLimit, 100); // Máximo 100
      }
    }

    let page = 1;
    if (pageParam) {
      const parsedPage = parseInt(pageParam, 10);
      if (!isNaN(parsedPage) && parsedPage > 0) {
        page = parsedPage;
      }
    }

    // Se não há termo de busca, retornar lista paginada
    if (!search || search.trim().length === 0) {
      const result = await repository.findAll(page, limit);
      return NextResponse.json(result);
    }

    // Buscar por tipo específico
    let medicamentos;
    if (tipo === "nome") {
      medicamentos = await repository.searchByNome(search, limit);
    } else if (tipo === "principio-ativo") {
      medicamentos = await repository.searchByPrincipioAtivo(search, limit);
    } else {
      // Busca geral (all)
      medicamentos = await repository.search(search, limit);
    }

    return NextResponse.json({
      medicamentos,
      pagination: {
        page: 1,
        limit: medicamentos.length,
        total: medicamentos.length,
        totalPages: 1,
      },
      search: {
        term: search,
        tipo,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar medicamentos ANVISA:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar medicamentos",
        message:
          error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
