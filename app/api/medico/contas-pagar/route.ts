import { NextRequest, NextResponse } from "next/server";
import { checkMedicoAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await checkMedicoAuth();
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Para contas a pagar, vamos filtrar apenas pela clínica
    // Se no futuro houver relação direta com médico, adicionar aqui
    const where: any = {
      clinicaId: auth.clinicaId,
      ...(search && {
        OR: [
          { descricao: { contains: search, mode: "insensitive" as const } },
          { fornecedor: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(status && { status }),
    };

    const [contas, total] = await Promise.all([
      prisma.contaPagar.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dataVencimento: "asc" },
      }),
      prisma.contaPagar.count({ where }),
    ]);

    return NextResponse.json({
      contas,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Erro ao listar contas a pagar:", error);
    return NextResponse.json(
      { error: "Erro ao listar contas a pagar" },
      { status: 500 }
    );
  }
}

