import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const bulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "Informe ao menos 1 id"),
});

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
 * POST /api/super-admin/operadoras/bulk
 * Exclusão em massa (remove do banco) para operadoras globais (clinicaId = null)
 * Body: { ids: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const body = await request.json();
    const validation = bulkSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { ids } = validation.data;

    const erros: string[] = [];
    let excluidas = 0;

    for (const id of ids) {
      try {
        // Garante que é do catálogo global
        const exists = await prisma.operadora.findFirst({
          where: { id, clinicaId: null },
          select: { id: true },
        });
        if (!exists) {
          erros.push(`ID ${id}: operadora não encontrada (ou não é global)`);
          continue;
        }

        await prisma.operadora.delete({ where: { id } });
        excluidas++;
      } catch (e: any) {
        const code = e?.code || e?.name;
        if (code === "P2003") {
          erros.push(`ID ${id}: possui vínculos (consultas/guias/planos) e não pode ser excluída`);
          continue;
        }
        erros.push(`ID ${id}: ${e?.message || "erro desconhecido"}`);
      }
    }

    return NextResponse.json({ excluidas, erros: erros.slice(0, 50) });
  } catch (error: any) {
    console.error("Erro ao excluir operadoras em massa (super-admin):", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao excluir operadoras" },
      { status: 500 }
    );
  }
}

