import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

// Schema de validação
const pacienteSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  cpf: z.string().min(11, "CPF inválido"),
  rg: z.string().nullable().optional(),
  dataNascimento: z.string().transform((str) => new Date(str)),
  sexo: z.enum(["M", "F", "OUTRO"]),
  email: z.union([
    z.string().email("Email inválido"),
    z.literal(""),
    z.null(),
  ]).optional(),
  telefone: z.string().nullable().optional(),
  celular: z.string().nullable().optional(),
  cep: z.string().nullable().optional(),
  endereco: z.string().nullable().optional(),
  numero: z.string().nullable().optional(),
  complemento: z.string().nullable().optional(),
  bairro: z.string().nullable().optional(),
  cidade: z.string().nullable().optional(),
  estado: z.string().nullable().optional(),
  nomeMae: z.string().nullable().optional(),
  nomePai: z.string().nullable().optional(),
  profissao: z.string().nullable().optional(),
  estadoCivil: z.enum(["SOLTEIRO", "CASADO", "DIVORCIADO", "VIUVO"]).nullable().optional(),
  observacoes: z.string().nullable().optional(),
});

// Helper para verificar autorização
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

// GET /api/admin-clinica/pacientes
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const where = {
      clinicaId: auth.clinicaId,
      ativo: true, // Filtrar apenas pacientes ativos
      ...(search && {
        OR: [
          { nome: { contains: search, mode: "insensitive" as const } },
          { cpf: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [pacientes, total] = await Promise.all([
      prisma.paciente.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.paciente.count({ where }),
    ]);

    return NextResponse.json({
      pacientes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erro ao listar pacientes:", error);
    return NextResponse.json(
      { error: "Erro ao listar pacientes" },
      { status: 500 }
    );
  }
}

// POST /api/admin-clinica/pacientes
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await request.json();
    const validation = pacienteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;
    const cpfLimpo = data.cpf.replace(/\D/g, "");

    // Verificar se CPF já existe (apenas em pacientes ativos)
    const pacienteExistente = await prisma.paciente.findFirst({
      where: {
        cpf: cpfLimpo,
        clinicaId: auth.clinicaId,
        ativo: true,
      },
    });

    if (pacienteExistente) {
      return NextResponse.json(
        { error: "CPF já cadastrado" },
        { status: 409 }
      );
    }

    const paciente = await prisma.paciente.create({
      data: {
        ...data,
        cpf: cpfLimpo,
        clinicaId: auth.clinicaId!,
        email: data.email || null,
      },
    });

    return NextResponse.json({ paciente }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar paciente:", error);
    return NextResponse.json(
      { error: "Erro ao criar paciente" },
      { status: 500 }
    );
  }
}

