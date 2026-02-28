import { NextRequest, NextResponse } from "next/server";
import { checkMedicoAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const grupoExameSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  examesIds: z.array(z.string()).optional(),
});

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

    const where = {
      clinicaId: auth.clinicaId!,
      medicoId: auth.medicoId!,
      ...(search && {
        OR: [
          { nome: { contains: search, mode: "insensitive" as const } },
          { descricao: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [gruposExames, total] = await Promise.all([
      prisma.grupoExame.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          exames: {
            include: {
              exame: {
                select: {
                  id: true,
                  nome: true,
                  tipo: true,
                  descricao: true,
                },
              },
            },
            orderBy: {
              ordem: "asc",
            },
          },
        },
      }),
      prisma.grupoExame.count({ where }),
    ]);

    return NextResponse.json({
      gruposExames,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erro ao listar grupos de exames:", error);
    return NextResponse.json(
      { error: "Erro ao listar grupos de exames" },
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
    const validation = grupoExameSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { examesIds, ...dataGrupo } = validation.data;

    const grupoExame = await prisma.grupoExame.create({
      data: {
        nome: dataGrupo.nome,
        descricao: dataGrupo.descricao || null,
        clinicaId: auth.clinicaId!,
        medicoId: auth.medicoId!,
        exames: {
          create: examesIds?.map((exameId, index) => ({
            exameId,
            ordem: index,
          })) || [],
        },
      },
      include: {
        exames: {
          include: {
            exame: {
              select: {
                id: true,
                nome: true,
                tipo: true,
                descricao: true,
              },
            },
          },
          orderBy: {
            ordem: "asc",
          },
        },
      },
    });

    return NextResponse.json({ grupoExame }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar grupo de exames:", error);
    return NextResponse.json(
      { error: "Erro ao criar grupo de exames" },
      { status: 500 }
    );
  }
}
