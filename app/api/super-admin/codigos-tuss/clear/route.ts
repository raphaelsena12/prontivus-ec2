import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";

async function checkAuthorization() {
  const session = await getSession();
  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }),
    };
  }
  if (session.user.tipo !== TipoUsuario.SUPER_ADMIN) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Acesso negado" }, { status: 403 }),
    };
  }
  return { authorized: true as const };
}

/**
 * POST /api/super-admin/codigos-tuss/clear
 * Exclui em massa o catálogo global de códigos TUSS.
 *
 * Segurança:
 * - Preserva histórico: mantém consultas/guias e apenas remove o vínculo (codigoTussId = NULL).
 * - Remove tabelas auxiliares do catálogo (valores/operadoras/especialidades) e então remove os códigos.
 */
export async function POST() {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const result = await prisma.$transaction(async (tx) => {
      // 1) Preservar histórico: remover vínculos em massa
      const updatedConsultas = await tx.consulta.updateMany({
        where: { codigoTussId: { not: null } },
        data: { codigoTussId: null },
      });

      const updatedGuiasProc = await tx.guiaTissProcedimento.updateMany({
        where: { codigoTussId: { not: null } },
        data: { codigoTussId: null },
      });

      // 2) Remover dependências do catálogo
      const deletedTussValores = await tx.tussValor.deleteMany({});
      const deletedTussEspecialidades = await tx.tussEspecialidade.deleteMany({});
      const deletedTussOperadoras = await tx.tussOperadora.deleteMany({});

      // 3) Remover códigos
      const deletedCodigosTuss = await tx.codigoTuss.deleteMany({});

      return {
        updated: {
          consultasCodigoTussNull: updatedConsultas.count,
          guiasTissProcedimentosCodigoTussNull: updatedGuiasProc.count,
        },
        deleted: {
          tussValores: deletedTussValores.count,
          tussEspecialidades: deletedTussEspecialidades.count,
          tussOperadoras: deletedTussOperadoras.count,
          codigosTuss: deletedCodigosTuss.count,
        },
      };
    }, { timeout: 600_000, maxWait: 10_000 });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Erro ao excluir catálogo TUSS em massa:", error);
    return NextResponse.json({ error: "Erro ao excluir catálogo TUSS" }, { status: 500 });
  }
}

