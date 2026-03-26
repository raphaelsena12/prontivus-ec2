import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

// Cadastro de operadoras agora é gerenciado pelo SUPER_ADMIN (catálogo global).
// No admin-clinica, a clínica apenas "aceita / não aceita" operadoras via TenantOperadora.

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

// GET /api/admin-clinica/operadoras
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
      // Catálogo global (clinicaId NULL) + operadoras legadas da própria clínica
      OR: [{ clinicaId: null }, { clinicaId: auth.clinicaId }],
      ...(search && {
        OR: [
          { codigoAns: { contains: search, mode: "insensitive" as const } },
          { razaoSocial: { contains: search, mode: "insensitive" as const } },
          { nomeFantasia: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(ativo !== null && { ativo: ativo === "true" }),
    };

    const operadoras = await prisma.operadora.findMany({
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
      where,
      orderBy: { razaoSocial: "asc" },
    });

    // Aceitação por clínica (TenantOperadora)
    const aceitacoes = await prisma.tenantOperadora.findMany({
      where: { tenantId: auth.clinicaId },
      select: { operadoraId: true, aceita: true },
    });
    const aceitaMap = new Map<string, boolean>();
    aceitacoes.forEach((a) => aceitaMap.set(a.operadoraId, a.aceita));

    // Buscar planos separadamente
    const operadoraIds = operadoras.map(o => o.id);
    const planosSaude = await prisma.planoSaude.findMany({
      where: {
        operadoraId: { in: operadoraIds },
        ativo: true,
      },
    });
    const planosMap = new Map<string, typeof planosSaude>();
    planosSaude.forEach(plano => {
      if (!planosMap.has(plano.operadoraId)) {
        planosMap.set(plano.operadoraId, []);
      }
      planosMap.get(plano.operadoraId)!.push(plano);
    });

    const operadorasComPlanos = operadoras.map(operadora => ({
      ...operadora,
      planosSaude: planosMap.get(operadora.id) || [],
      aceitaNaClinica: aceitaMap.get(operadora.id) ?? false,
      isGlobal: operadora.clinicaId === null,
    }));

    return NextResponse.json({ operadoras: operadorasComPlanos });
  } catch (error) {
    console.error("Erro ao listar operadoras:", error);
    return NextResponse.json(
      { error: "Erro ao listar operadoras" },
      { status: 500 }
    );
  }
}

// POST /api/admin-clinica/operadoras
export async function POST(request: NextRequest) {
  const auth = await checkAuthorization();
  if (!auth.authorized) return auth.response!;

  return NextResponse.json(
    { error: "Cadastro de operadoras é gerenciado pelo Super Admin. Aqui você apenas seleciona/aceita operadoras." },
    { status: 403 }
  );
}

