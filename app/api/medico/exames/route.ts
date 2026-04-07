import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import {
  buildCodigoTussCatalogoAndParts,
  whereFromAndParts,
} from "@/lib/codigo-tuss-catalogo-filter";

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

// GET /api/medico/exames
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim();

    // Exigir pelo menos 3 caracteres para buscar
    if (search.length < 3) {
      return NextResponse.json({ exames: [] });
    }

    const searchFilter = {
      OR: [
        { nome: { contains: search, mode: "insensitive" as const } },
        { descricao: { contains: search, mode: "insensitive" as const } },
      ],
    };

    // 1) Exames cadastrados pela clínica
    const clinicaWhere = {
      clinicaId: auth.clinicaId,
      ativo: true,
      ...searchFilter,
    };

    // 2) Catálogo TUSS global (exames)
    const tussAnd = buildCodigoTussCatalogoAndParts("EXAMES", search, true);
    const tussWhere = whereFromAndParts(tussAnd);

    const [examesClinica, codigosTuss] = await Promise.all([
      prisma.exame.findMany({
        where: clinicaWhere,
        orderBy: { nome: "asc" },
        take: 50,
        select: {
          id: true,
          nome: true,
          descricao: true,
          tipo: true,
          codigoTuss: {
            select: {
              id: true,
              codigoTuss: true,
              descricao: true,
              categoriaExame: true,
            },
          },
        },
      }),
      prisma.codigoTuss.findMany({
        where: tussWhere,
        select: {
          id: true,
          codigoTuss: true,
          descricao: true,
          categoriaExame: true,
        },
        orderBy: { descricao: "asc" },
        take: 50,
      }),
    ]);

    // IDs de TUSS já vinculados a exames da clínica (evitar duplicatas)
    const tussIdsClinica = new Set(
      examesClinica
        .map((e) => e.codigoTuss?.id)
        .filter(Boolean)
    );

    // Converter itens TUSS para o mesmo formato que o frontend espera
    const examesTuss = codigosTuss
      .filter((c) => !tussIdsClinica.has(c.id))
      .map((c) => ({
        id: `tuss:${c.id}`,
        nome: c.descricao,
        descricao: c.codigoTuss,
        tipo: c.categoriaExame || "LABORATORIAL",
        codigoTuss: {
          id: c.id,
          codigoTuss: c.codigoTuss,
          descricao: c.descricao,
          categoriaExame: c.categoriaExame,
        },
      }));

    // Clínica primeiro, depois TUSS global
    const exames = [...examesClinica, ...examesTuss];

    return NextResponse.json({ exames });
  } catch (error) {
    console.error("Erro ao listar exames:", error);
    return NextResponse.json(
      { error: "Erro ao listar exames" },
      { status: 500 }
    );
  }
}
