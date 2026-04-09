import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";

async function checkAuthorization() {
  const session = await getSession();

  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      ),
    };
  }

  if (session.user.tipo !== TipoUsuario.MEDICO) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      ),
    };
  }

  const clinicaId = await getUserClinicaId();
  if (!clinicaId) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, clinicaId };
}

// Remove acentos de uma string (usado para busca accent-insensitive)
function removeAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// GET /api/medico/medicamentos
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    if (search) {
      // Busca accent-insensitive usando translate() nativo do PostgreSQL
      const normalized = removeAccents(search);
      const pattern = `%${normalized}%`;
      const accentFrom = "áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ";
      const accentTo   = "aaaaaeeeeiiiioooooouuuucAAAAAEEEEIIIIOOOOOUUUUC";

      const medicamentos = await prisma.$queryRawUnsafe(`
        SELECT * FROM "medicamentos"
        WHERE ("clinicaId" IS NULL OR "clinicaId" = $2) AND "ativo" = true
          AND (
            translate(LOWER("nome"), '${accentFrom}', '${accentTo}') ILIKE $1
            OR translate(LOWER(COALESCE("principioAtivo", '')), '${accentFrom}', '${accentTo}') ILIKE $1
            OR translate(LOWER(COALESCE("laboratorio", '')), '${accentFrom}', '${accentTo}') ILIKE $1
          )
        ORDER BY "nome" ASC
        LIMIT 50
      `, pattern, auth.clinicaId);

      return NextResponse.json({ medicamentos });
    }

    const medicamentos = await prisma.medicamento.findMany({
      where: {
        OR: [
          { clinicaId: null },
          { clinicaId: auth.clinicaId },
        ],
        ativo: true,
      },
      orderBy: { nome: "asc" },
      take: 50,
    });

    return NextResponse.json({ medicamentos });
  } catch (error) {
    console.error("Erro ao listar medicamentos:", error);
    return NextResponse.json(
      { error: "Erro ao listar medicamentos" },
      { status: 500 }
    );
  }
}

