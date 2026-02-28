import { NextRequest, NextResponse } from "next/server";
import { MedicamentoAnvisaRepository } from "@/lib/anvisa/medicamento-repository";

const repository = new MedicamentoAnvisaRepository();

/**
 * GET /api/anvisa/medicamentos/[numeroRegistro]
 * Busca um medicamento específico pelo número de registro da ANVISA
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ numeroRegistro: string }> }
) {
  try {
    const { numeroRegistro } = await params;

    if (!numeroRegistro || numeroRegistro.trim().length === 0) {
      return NextResponse.json(
        { error: "Número de registro é obrigatório" },
        { status: 400 }
      );
    }

    const medicamento = await repository.findByNumeroRegistro(
      numeroRegistro.trim()
    );

    if (!medicamento) {
      return NextResponse.json(
        { error: "Medicamento não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ medicamento });
  } catch (error) {
    console.error("Erro ao buscar medicamento ANVISA:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar medicamento",
        message:
          error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
