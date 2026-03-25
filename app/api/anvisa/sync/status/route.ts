import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";
import { MedicamentoSyncRepository } from "@/lib/anvisa/medicamento-sync-repository";

/**
 * GET /api/anvisa/sync/status
 * Retorna estatísticas do catálogo global sincronizado da ANVISA
 * (medicamentos com clinicaId = null e numeroRegistro preenchido)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (session.user.tipo !== TipoUsuario.SUPER_ADMIN) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const repository = new MedicamentoSyncRepository();
    const total = await repository.countByClinica(null);

    return NextResponse.json({
      totalMedicamentos: total,
      lastSync: "Verificar logs do sistema", // TODO: tracking de última sincronização
    });
  } catch (error) {
    console.error("Erro ao buscar status da sincronização:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar status",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

