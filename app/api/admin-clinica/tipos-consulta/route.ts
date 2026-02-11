import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const tipoConsultaSchema = z.object({
  codigo: z.string().min(1, "Código é obrigatório"),
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  descricao: z.string().optional(),
  ativo: z.boolean().optional().default(true),
});

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

  if (session.user.tipo !== TipoUsuario.ADMIN_CLINICA && session.user.tipo !== TipoUsuario.SECRETARIA) {
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

// GET /api/admin-clinica/tipos-consulta
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const ativo = searchParams.get("ativo");

    const where: any = {
      ...(search && {
        OR: [
          { codigo: { contains: search, mode: "insensitive" as const } },
          { nome: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(ativo !== null && { ativo: ativo === "true" }),
    };

    const tiposConsulta = await prisma.tipoConsulta.findMany({
      where,
      orderBy: { nome: "asc" },
    });

    return NextResponse.json({ tiposConsulta });
  } catch (error) {
    console.error("Erro ao listar tipos de consulta:", error);
    return NextResponse.json(
      { error: "Erro ao listar tipos de consulta" },
      { status: 500 }
    );
  }
}

// POST /api/admin-clinica/tipos-consulta
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await request.json();
    const validation = tipoConsultaSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verificar se código já existe
    const existente = await prisma.tipoConsulta.findUnique({
      where: { codigo: data.codigo },
    });

    if (existente) {
      return NextResponse.json(
        { error: "Código de tipo de consulta já existe" },
        { status: 409 }
      );
    }

    const tipoConsulta = await prisma.tipoConsulta.create({
      data,
    });

    return NextResponse.json({ tipoConsulta }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar tipo de consulta:", error);
    return NextResponse.json(
      { error: "Erro ao criar tipo de consulta" },
      { status: 500 }
    );
  }
}

