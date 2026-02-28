import { NextRequest, NextResponse } from "next/server";
import { checkMedicoAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateGrupoExameSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").optional(),
  descricao: z.string().optional(),
  ativo: z.boolean().optional(),
  examesIds: z.array(z.string()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkMedicoAuth();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    const grupoExame = await prisma.grupoExame.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId!,
        medicoId: auth.medicoId!,
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

    if (!grupoExame) {
      return NextResponse.json(
        { error: "Grupo de exames não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ grupoExame });
  } catch (error) {
    console.error("Erro ao buscar grupo de exames:", error);
    return NextResponse.json(
      { error: "Erro ao buscar grupo de exames" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkMedicoAuth();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    const grupoExameExistente = await prisma.grupoExame.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId!,
        medicoId: auth.medicoId!,
      },
    });

    if (!grupoExameExistente) {
      return NextResponse.json(
        { error: "Grupo de exames não encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = updateGrupoExameSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { examesIds, ...dataGrupo } = validation.data;

    // Se examesIds foi fornecido, atualizar a lista de exames
    if (examesIds !== undefined) {
      // Deletar todos os itens existentes
      await prisma.grupoExameItem.deleteMany({
        where: { grupoExameId: id },
      });

      // Criar novos itens
      if (examesIds.length > 0) {
        await prisma.grupoExameItem.createMany({
          data: examesIds.map((exameId, index) => ({
            grupoExameId: id,
            exameId,
            ordem: index,
          })),
        });
      }
    }

    const grupoExame = await prisma.grupoExame.update({
      where: { id },
      data: dataGrupo,
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

    return NextResponse.json({ grupoExame });
  } catch (error) {
    console.error("Erro ao atualizar grupo de exames:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar grupo de exames" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkMedicoAuth();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    const grupoExame = await prisma.grupoExame.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId!,
        medicoId: auth.medicoId!,
      },
    });

    if (!grupoExame) {
      return NextResponse.json(
        { error: "Grupo de exames não encontrado" },
        { status: 404 }
      );
    }

    await prisma.grupoExame.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Grupo de exames excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar grupo de exames:", error);
    return NextResponse.json(
      { error: "Erro ao deletar grupo de exames" },
      { status: 500 }
    );
  }
}
