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
 * - Bloqueia se houver referências em consultas/guias/valores (para evitar quebrar dados históricos).
 */
export async function POST() {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const [consultas, tussValores, guiasTissProcedimentos] = await Promise.all([
      prisma.consulta.count(),
      prisma.tussValor.count(),
      prisma.guiaTissProcedimento.count(),
    ]);

    const refs = { consultas, tussValores, guiasTissProcedimentos };
    const hasRefs = Object.values(refs).some((v) => v > 0);

    if (hasRefs) {
      return NextResponse.json(
        {
          error:
            "Não é possível excluir o catálogo TUSS porque há registros que dependem desses códigos. Para não perder histórico, a exclusão em massa foi bloqueada.",
          refs,
        },
        { status: 409 }
      );
    }

    const deleted = await prisma.$transaction(async (tx) => {
      const deletedTussEspecialidades = await tx.tussEspecialidade.deleteMany({});
      const deletedTussOperadoras = await tx.tussOperadora.deleteMany({});
      const deletedCodigosTuss = await tx.codigoTuss.deleteMany({});

      return {
        tussEspecialidades: deletedTussEspecialidades.count,
        tussOperadoras: deletedTussOperadoras.count,
        codigosTuss: deletedCodigosTuss.count,
      };
    });

    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error("Erro ao excluir catálogo TUSS em massa:", error);
    return NextResponse.json({ error: "Erro ao excluir catálogo TUSS" }, { status: 500 });
  }
}

