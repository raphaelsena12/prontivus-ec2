import { NextRequest, NextResponse } from "next/server";
import { checkMedicoAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const manipuladoSchema = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória"),
  informacoes: z.string().optional(),
});

function removeAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export async function GET(request: NextRequest) {
  try {
    const auth = await checkMedicoAuth();
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    if (search) {
      const normalized = removeAccents(search);
      const pattern = `%${normalized}%`;
      const accentFrom = "áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ";
      const accentTo   = "aaaaaeeeeiiiioooooouuuucAAAAAEEEEIIIIOOOOOUUUUC";

      const manipulados: any[] = await prisma.$queryRawUnsafe(`
        SELECT * FROM "manipulados"
        WHERE "clinicaId" = $1 AND "medicoId" = $2
          AND (
            translate(LOWER("descricao"), '${accentFrom}', '${accentTo}') ILIKE $3
            OR translate(LOWER(COALESCE("informacoes", '')), '${accentFrom}', '${accentTo}') ILIKE $3
          )
        ORDER BY "createdAt" DESC
        LIMIT $4 OFFSET $5
      `, auth.clinicaId!, auth.medicoId!, pattern, limit, skip);

      const countResult: any[] = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*)::int as total FROM "manipulados"
        WHERE "clinicaId" = $1 AND "medicoId" = $2
          AND (
            translate(LOWER("descricao"), '${accentFrom}', '${accentTo}') ILIKE $3
            OR translate(LOWER(COALESCE("informacoes", '')), '${accentFrom}', '${accentTo}') ILIKE $3
          )
      `, auth.clinicaId!, auth.medicoId!, pattern);

      const total = countResult[0]?.total || 0;

      return NextResponse.json({
        manipulados,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }

    const where = {
      clinicaId: auth.clinicaId!,
      medicoId: auth.medicoId!,
    };

    const [manipulados, total] = await Promise.all([
      prisma.manipulado.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.manipulado.count({ where }),
    ]);

    return NextResponse.json({
      manipulados,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erro ao listar manipulados:", error);
    return NextResponse.json(
      { error: "Erro ao listar manipulados" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await checkMedicoAuth();
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await request.json();
    const validation = manipuladoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const manipulado = await prisma.manipulado.create({
      data: {
        descricao: validation.data.descricao,
        informacoes: validation.data.informacoes || null,
        clinicaId: auth.clinicaId!,
        medicoId: auth.medicoId!,
      },
    });

    return NextResponse.json({ manipulado }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar manipulado:", error);
    return NextResponse.json(
      { error: "Erro ao criar manipulado" },
      { status: 500 }
    );
  }
}
