import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

// CRUD de operadora agora é gerenciado pelo SUPER_ADMIN (catálogo global).
// Este endpoint mantém apenas GET (leitura) para uso interno/telas legadas.

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

// GET /api/admin-clinica/operadoras/[id]
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

    const operadora = await prisma.operadora.findFirst({
      select: {
        id: true,
        clinicaId: true,
        codigoAns: true,
        razaoSocial: true,
        nomeFantasia: true,
        cnpj: true,
        telefone: true,
        email: true,
        cep: true,
        endereco: true,
        numero: true,
        complemento: true,
        bairro: true,
        cidade: true,
        estado: true,
        pais: true,
        ativo: true,
        createdAt: true,
        updatedAt: true,
      },
      where: {
        id,
        OR: [{ clinicaId: null }, { clinicaId: auth.clinicaId }],
      },
    });

    if (!operadora) {
      return NextResponse.json(
        { error: "Operadora não encontrada" },
        { status: 404 }
      );
    }

    // Buscar planos separadamente
    const planosSaude = await prisma.planoSaude.findMany({
      where: {
        operadoraId: operadora.id,
      },
    });

    return NextResponse.json({
      operadora: {
        ...operadora,
        planosSaude,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar operadora:", error);
    return NextResponse.json(
      { error: "Erro ao buscar operadora" },
      { status: 500 }
    );
  }
}

// PATCH/DELETE removidos: gestão de operadoras é no super-admin; aceitação é via /aceitacao.














