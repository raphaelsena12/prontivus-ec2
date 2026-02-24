import { NextRequest, NextResponse } from "next/server";
import { checkSecretariaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

// DELETE /api/secretaria/lista-espera/[id] - Remover da lista de espera
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkSecretariaAuth();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    // Verificar se a entrada existe e pertence à clínica
    const listaEspera = await prisma.listaEspera.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId,
      },
    });

    if (!listaEspera) {
      return NextResponse.json(
        { error: "Entrada não encontrada na lista de espera" },
        { status: 404 }
      );
    }

    await prisma.listaEspera.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Paciente removido da lista de espera com sucesso" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro ao remover da lista de espera:", error);
    return NextResponse.json(
      { error: "Erro ao remover da lista de espera" },
      { status: 500 }
    );
  }
}

