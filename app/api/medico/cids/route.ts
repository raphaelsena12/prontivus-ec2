import { NextRequest, NextResponse } from "next/server";
import { checkClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await checkClinicaAuth();
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim();
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);

    const cids = await prisma.cid.findMany({
      where: {
        clinicaId: auth.clinicaId,
        ativo: true,
        ...(search && {
          OR: [
            { codigo: { contains: search, mode: "insensitive" } },
            { descricao: { contains: search, mode: "insensitive" } },
            { categoria: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
      orderBy: [{ codigo: "asc" }],
      take: limit,
      select: {
        id: true,
        codigo: true,
        descricao: true,
        categoria: true,
      },
    });

    return NextResponse.json({ cids });
  } catch (error) {
    console.error("Erro ao listar CIDs para atendimento:", error);
    return NextResponse.json(
      { error: "Erro ao listar CIDs" },
      { status: 500 }
    );
  }
}
