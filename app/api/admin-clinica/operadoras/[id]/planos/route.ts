import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const planoSaudeSchema = z.object({
  codigoAns: z.string().optional(),
  nome: z.string().min(3, "Nome é obrigatório"),
  tipoPlano: z.enum([
    "AMBULATORIAL",
    "HOSPITALAR",
    "AMBULATORIAL_HOSPITALAR",
    "ODONTOLOGICO",
  ]),
  abrangencia: z.enum(["NACIONAL", "REGIONAL", "MUNICIPAL"]).optional(),
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

// GET /api/admin-clinica/operadoras/[id]/planos
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    // Verificar se operadora é aceita pela clínica (vínculo TenantOperadora)
    const operadora = await prisma.operadora.findFirst({
      where: {
        id,
        tenantsAceitacao: { some: { tenantId: auth.clinicaId, aceita: true } },
      },
      select: { id: true },
    });

    if (!operadora) {
      return NextResponse.json(
        { error: "Operadora não encontrada" },
        { status: 404 }
      );
    }

    const planos = await prisma.planoSaude.findMany({
      where: {
        operadoraId: id,
      },
      orderBy: { nome: "asc" },
    });

    return NextResponse.json({ planos });
  } catch (error) {
    console.error("Erro ao listar planos:", error);
    return NextResponse.json(
      { error: "Erro ao listar planos" },
      { status: 500 }
    );
  }
}

// POST /api/admin-clinica/operadoras/[id]/planos
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkAuthorization();
  if (!auth.authorized) return auth.response!;

  return NextResponse.json(
    { error: "Cadastro de planos é gerenciado pelo Super Admin. A clínica apenas seleciona/aceita operadoras/planos." },
    { status: 403 }
  );
}

