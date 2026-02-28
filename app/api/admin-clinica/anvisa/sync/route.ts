import { NextRequest, NextResponse } from "next/server";
import { AnvisaSyncService } from "@/lib/anvisa/sync-service";
import { getSession, hasUserType, getUserClinicaId } from "@/lib/auth-helpers";
import { TipoUsuario } from "@/lib/generated/prisma";
import { MedicamentoSyncRepository } from "@/lib/anvisa/medicamento-sync-repository";

/**
 * POST /api/admin-clinica/anvisa/sync
 * Inicia sincronização dos medicamentos da ANVISA
 * Requer autenticação de ADMIN_CLINICA
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

    // Verificar se é ADMIN_CLINICA
    const isAdminClinica = await hasUserType(TipoUsuario.ADMIN_CLINICA);
    if (!isAdminClinica) {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores de clínica podem executar sincronização." },
        { status: 403 }
      );
    }

    // Verificar se tem clínica associada
    const clinicaId = await getUserClinicaId();
    if (!clinicaId) {
      return NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 403 }
      );
    }

    // Iniciar sincronização
    const syncService = new AnvisaSyncService(clinicaId);

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
 * GET /api/admin-clinica/anvisa/sync
 * Retorna progresso da sincronização ou estatísticas da base
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    // Verificar se é ADMIN_CLINICA
    const isAdminClinica = await hasUserType(TipoUsuario.ADMIN_CLINICA);
    if (!isAdminClinica) {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      );
    }

    const clinicaId = await getUserClinicaId();
    if (!clinicaId) {
      return NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 403 }
      );
    }

    // Verificar se há progresso de sincronização em andamento
    const progress = AnvisaSyncService.getProgress(clinicaId);
    
    if (progress) {
      // Calcular porcentagem - se está completed, deve ser 100%
      const percentage = progress.status === "completed" || progress.status === "error"
        ? 100
        : progress.total > 0 
          ? Math.round((progress.processed / progress.total) * 100)
          : 0;
      
      // Retornar progresso da sincronização
      return NextResponse.json({
        inProgress: progress.status !== "completed" && progress.status !== "error",
        progress: {
          total: progress.total,
          processed: progress.status === "completed" || progress.status === "error" 
            ? progress.total 
            : progress.processed,
          inserted: progress.inserted,
          updated: progress.updated,
          errors: progress.errors,
          status: progress.status,
          message: progress.message,
          percentage,
        },
      });
    }

    // Se não há sincronização em andamento, retornar estatísticas
    const repository = new MedicamentoSyncRepository();
    const total = await repository.countByClinica(clinicaId);

    return NextResponse.json({
      inProgress: false,
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
