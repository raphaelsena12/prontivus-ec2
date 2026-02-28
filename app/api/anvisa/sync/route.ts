import { NextRequest, NextResponse } from "next/server";
import { AnvisaSyncService } from "@/lib/anvisa/sync-service";
import { MedicamentoAnvisaRepository } from "@/lib/anvisa/medicamento-repository";
import { getSession } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";

/**
 * POST /api/anvisa/sync
 * Inicia sincronização manual dos medicamentos da ANVISA
 * Requer autenticação de SUPER_ADMIN
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    // Verificar se é SUPER_ADMIN
    if (session.user.tipo !== TipoUsuario.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Acesso negado. Apenas super administradores podem executar sincronização." },
        { status: 403 }
      );
    }

    // Iniciar sincronização em background
    const syncService = new AnvisaSyncService();

    // Executar sincronização (pode demorar vários minutos)
    const result = await syncService.sync();

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? "Sincronização concluída com sucesso"
        : "Sincronização concluída com erros",
      result: {
        totalProcessed: result.totalProcessed,
        totalInserted: result.totalInserted,
        totalUpdated: result.totalUpdated,
        totalErrors: result.totalErrors,
        duration: result.duration,
        errors: result.errors.slice(0, 10), // Primeiros 10 erros
      },
    });
  } catch (error) {
    console.error("Erro ao sincronizar medicamentos ANVISA:", error);
    return NextResponse.json(
      {
        error: "Erro ao sincronizar medicamentos",
        message:
          error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/anvisa/sync/status
 * Retorna estatísticas da base de medicamentos
 */
export async function GET(request: NextRequest) {
  try {
    const repository = new MedicamentoAnvisaRepository();
    const total = await repository.count();

    return NextResponse.json({
      totalMedicamentos: total,
      lastSync: "Verificar logs do sistema", // TODO: Implementar tracking de última sincronização
    });
  } catch (error) {
    console.error("Erro ao buscar status da sincronização:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar status",
        message:
          error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
