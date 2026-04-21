import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import {
  buildCodigoTussCatalogoAndParts,
  whereFromAndParts,
} from "@/lib/codigo-tuss-catalogo-filter";

async function checkAuth() {
  const session = await getSession();
  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }),
    };
  }
  if (
    session.user.tipo !== TipoUsuario.SECRETARIA &&
    session.user.tipo !== TipoUsuario.ADMIN_CLINICA
  ) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Acesso negado" }, { status: 403 }),
    };
  }
  const clinicaId = await getUserClinicaId();
  if (!clinicaId) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Clínica não encontrada" }, { status: 403 }),
    };
  }
  return { authorized: true, clinicaId };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuth();
    if (!auth.authorized) return auth.response!;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") || "";
    const search = (searchParams.get("search") || "").trim();
    const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10), 50);

    // Modo hidratação: buscar pelo id para preencher o campo em modo edição
    if (id) {
      const procedimento = await prisma.procedimento.findFirst({
        where: { id, clinicaId: auth.clinicaId!, ativo: true },
        select: { id: true, codigo: true, nome: true },
      });
      if (procedimento) {
        return NextResponse.json({
          items: [{ id: procedimento.id, codigo: procedimento.codigo, nome: procedimento.nome, origem: "CLINICA" }],
        });
      }
      return NextResponse.json({ items: [] });
    }

    if (!search || search.length < 3) {
      return NextResponse.json({ items: [] });
    }

    const [procedimentos, codigosTuss] = await Promise.all([
      prisma.procedimento.findMany({
        where: {
          clinicaId: auth.clinicaId!,
          ativo: true,
          OR: [
            { codigo: { contains: search, mode: "insensitive" } },
            { nome: { contains: search, mode: "insensitive" } },
          ],
        },
        orderBy: { nome: "asc" },
        take: limit,
        select: { id: true, codigo: true, nome: true },
      }),
      prisma.codigoTuss.findMany({
        where: whereFromAndParts(
          buildCodigoTussCatalogoAndParts("PROCEDIMENTOS", search, true)
        ),
        orderBy: { descricao: "asc" },
        take: limit,
        select: { id: true, codigoTuss: true, descricao: true },
      }),
    ]);

    const clinicaItems = procedimentos.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      nome: p.nome,
      origem: "CLINICA" as const,
    }));

    const tussItems = codigosTuss.map((c) => ({
      id: c.id,
      codigo: c.codigoTuss,
      nome: c.descricao,
      origem: "GLOBAL" as const,
    }));

    const items = [...clinicaItems, ...tussItems].slice(0, limit);

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Erro na busca global de procedimentos:", error);
    return NextResponse.json({ error: "Erro ao buscar procedimentos" }, { status: 500 });
  }
}
