import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { gerarNumeroProntuario } from "@/lib/paciente-helpers";

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
    const status = searchParams.get("status") || "ativo";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Usar query raw diretamente para evitar problemas com Prisma Client desatualizado
    if (!auth.clinicaId) {
      return NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 403 }
      );
    }
    
    // Construir condições WHERE dinamicamente com escape adequado
    const clinicaIdEscaped = auth.clinicaId.replace(/'/g, "''");
    let whereConditions = `"clinicaId" = '${clinicaIdEscaped}'`;
    
    if (status === "ativo") {
      whereConditions += ` AND ativo = true`;
    } else if (status === "inativo") {
      whereConditions += ` AND ativo = false`;
    }
    
    if (search) {
      const searchEscaped = search.replace(/'/g, "''");
      whereConditions += ` AND (nome ILIKE '%${searchEscaped}%' OR cpf ILIKE '%${searchEscaped}%' OR email ILIKE '%${searchEscaped}%')`;
    }
    
    // Verificar se a coluna numeroProntuario existe no banco
    const columnCheck = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'pacientes' 
          AND column_name = 'numeroProntuario'
      ) as exists
    `);
    
    const hasNumeroProntuario = columnCheck[0]?.exists || false;
    
    // Query para buscar pacientes - incluir numeroProntuario apenas se a coluna existir
    const pacientesQuery = hasNumeroProntuario ? `
      SELECT 
        id, "clinicaId", "usuarioId", "numeroProntuario", nome, cpf, rg, 
        "dataNascimento", sexo, email, telefone, celular, cep, endereco, 
        numero, complemento, bairro, cidade, estado, "nomeMae", "nomePai", 
        profissao, "estadoCivil", observacoes, ativo, "createdAt", "updatedAt"
      FROM pacientes
      WHERE ${whereConditions}
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
      OFFSET ${skip}
    ` : `
      SELECT 
        id, "clinicaId", "usuarioId", NULL as "numeroProntuario", nome, cpf, rg, 
        "dataNascimento", sexo, email, telefone, celular, cep, endereco, 
        numero, complemento, bairro, cidade, estado, "nomeMae", "nomePai", 
        profissao, "estadoCivil", observacoes, ativo, "createdAt", "updatedAt"
      FROM pacientes
      WHERE ${whereConditions}
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
      OFFSET ${skip}
    `;
    
    // Query para contar total
    const countQuery = `
      SELECT COUNT(*) as count
      FROM pacientes
      WHERE ${whereConditions}
    `;
    
    const [pacientesRaw, totalRaw] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(pacientesQuery),
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>(countQuery),
    ]);

    const total = Number(totalRaw[0]?.count || 0);
    
    // Converter datas e garantir serialização correta
    const pacientes = pacientesRaw.map((p: any) => ({
      ...p,
      dataNascimento: p.dataNascimento ? new Date(p.dataNascimento).toISOString() : null,
      createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
      updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : null,
      numeroProntuario: p.numeroProntuario ? Number(p.numeroProntuario) : null,
    }));

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
      { error: "Erro ao listar pacientes", details: error instanceof Error ? error.message : "Erro desconhecido" },
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

    // Verificar se CPF já existe (apenas em pacientes ativos) usando query raw
    const pacienteExistenteCheck = await prisma.$queryRawUnsafe<Array<any>>(`
      SELECT id FROM pacientes 
      WHERE cpf = '${cpfLimpo.replace(/'/g, "''")}' 
        AND "clinicaId" = '${auth.clinicaId?.replace(/'/g, "''") || ""}' 
        AND ativo = true 
      LIMIT 1
    `);

    if (pacienteExistenteCheck.length > 0) {
      return NextResponse.json(
        { error: "CPF já cadastrado" },
        { status: 409 }
      );
    }

    // Verificar se já existe usuário com este CPF
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { cpf: cpfLimpo },
    });

    if (usuarioExistente) {
      return NextResponse.json(
        { error: "CPF já está cadastrado como usuário" },
        { status: 409 }
      );
    }

    // Gerar email se não fornecido (baseado no CPF)
    const emailPaciente = (data.email && data.email.trim() !== "") 
      ? data.email.trim() 
      : `${cpfLimpo}@temp.prontivus.com`;

    // Verificar se email já existe
    const emailExistente = await prisma.usuario.findUnique({
      where: { email: emailPaciente },
    });

    if (emailExistente) {
      return NextResponse.json(
        { error: "Email já cadastrado" },
        { status: 409 }
      );
    }

    // Hash da senha (CPF)
    const senhaHash = await bcrypt.hash(cpfLimpo, 10);

    // Gerar número do prontuário automaticamente (globalmente único)
    const numeroProntuario = await gerarNumeroProntuario();

    // Criar usuário automaticamente
    const usuario = await prisma.usuario.create({
      data: {
        nome: data.nome,
        email: emailPaciente,
        cpf: cpfLimpo,
        telefone: (data.telefone && data.telefone.trim() !== "") 
          ? data.telefone.replace(/\D/g, "") 
          : null,
        tipo: TipoUsuario.PACIENTE,
        senha: senhaHash,
        clinicaId: auth.clinicaId!,
        ativo: true,
        primeiroAcesso: true,
      },
    });

    // Verificar se a coluna numeroProntuario existe antes de criar o paciente
    const columnCheck = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'pacientes' 
          AND column_name = 'numeroProntuario'
      ) as exists
    `);
    
    const hasNumeroProntuario = columnCheck[0]?.exists || false;
    
    // Criar paciente usando query raw se a coluna não existir, ou Prisma se existir
    let paciente;
    
    // Helper para escapar strings SQL
    const escapeSQL = (value: string | null | undefined): string => {
      if (!value) return "NULL";
      return `'${String(value).replace(/'/g, "''")}'`;
    };
    
    if (!hasNumeroProntuario) {
      // Criar sem numeroProntuario usando query raw
      const insertQuery = `
        INSERT INTO pacientes (
          id, "clinicaId", "usuarioId", nome, cpf, rg, "dataNascimento", sexo, 
          email, telefone, celular, cep, endereco, numero, complemento, 
          bairro, cidade, estado, "nomeMae", "nomePai", profissao, "estadoCivil", 
          observacoes, ativo, "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), 
          ${escapeSQL(auth.clinicaId || "")},
          ${escapeSQL(usuario.id)},
          ${escapeSQL(data.nome)},
          ${escapeSQL(cpfLimpo)},
          ${escapeSQL(data.rg || null)},
          '${data.dataNascimento.toISOString()}',
          ${escapeSQL(data.sexo)},
          ${escapeSQL(data.email || null)},
          ${escapeSQL(data.telefone || null)},
          ${escapeSQL(data.celular || null)},
          ${escapeSQL(data.cep || null)},
          ${escapeSQL(data.endereco || null)},
          ${escapeSQL(data.numero || null)},
          ${escapeSQL(data.complemento || null)},
          ${escapeSQL(data.bairro || null)},
          ${escapeSQL(data.cidade || null)},
          ${escapeSQL(data.estado || null)},
          ${escapeSQL(data.nomeMae || null)},
          ${escapeSQL(data.nomePai || null)},
          ${escapeSQL(data.profissao || null)},
          ${escapeSQL(data.estadoCivil || null)},
          ${escapeSQL(data.observacoes || null)},
          true,
          NOW(),
          NOW()
        )
        RETURNING *
      `;
      
      const created = await prisma.$queryRawUnsafe<Array<any>>(insertQuery);
      paciente = created[0];
    } else {
      // Criar com numeroProntuario usando Prisma
      paciente = await prisma.paciente.create({
        data: {
          ...data,
          cpf: cpfLimpo,
          clinicaId: auth.clinicaId!,
          email: data.email || null,
          usuarioId: usuario.id,
          numeroProntuario,
        },
      });
    }

    return NextResponse.json({ paciente }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar paciente:", error);
    return NextResponse.json(
      { error: "Erro ao criar paciente" },
      { status: 500 }
    );
  }
}

