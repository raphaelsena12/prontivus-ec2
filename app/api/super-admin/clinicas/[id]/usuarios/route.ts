import { NextRequest, NextResponse } from "next/server";
import { getSession, isSuperAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

// Schema de validação para criação de usuário
const createUsuarioSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("Email inválido"),
  cpf: z.string().min(11, "CPF deve ter 11 dígitos"),
  telefone: z.string().optional(),
  tipo: z.nativeEnum(TipoUsuario),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
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

  const admin = await isSuperAdmin();

  if (!admin) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso negado. Apenas Super Admin." },
        { status: 403 }
      ),
    };
  }

  return { authorized: true };
}

// Helper para validar UUID
function isValidUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// GET /api/super-admin/clinicas/[id]/usuarios
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

    // Validar ID
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se clínica existe
    const clinica = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!clinica) {
      return NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 404 }
      );
    }

    // Buscar usuários da clínica
    const usuarios = await prisma.usuario.findMany({
      where: {
        clinicaId: id,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        cpf: true,
        telefone: true,
        tipo: true,
        ativo: true,
        primeiroAcesso: true,
        ultimoAcesso: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ usuarios });
  } catch (error) {
    console.error("Erro ao listar usuários:", error);
    return NextResponse.json(
      { error: "Erro ao listar usuários" },
      { status: 500 }
    );
  }
}

// POST /api/super-admin/clinicas/[id]/usuarios
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    // Validar ID
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se clínica existe
    const clinica = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!clinica) {
      return NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = createUsuarioSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Limpar CPF
    const cpfLimpo = data.cpf.replace(/\D/g, "");

    // Verificar se email já existe
    const emailExistente = await prisma.usuario.findUnique({
      where: { email: data.email },
    });

    if (emailExistente) {
      return NextResponse.json(
        { error: "Email já cadastrado" },
        { status: 409 }
      );
    }

    // Verificar se CPF já existe
    const cpfExistente = await prisma.usuario.findUnique({
      where: { cpf: cpfLimpo },
    });

    if (cpfExistente) {
      return NextResponse.json(
        { error: "CPF já cadastrado" },
        { status: 409 }
      );
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(data.senha, 10);

    // Criar usuário
    const usuario = await prisma.usuario.create({
      data: {
        nome: data.nome,
        email: data.email,
        cpf: cpfLimpo,
        telefone: data.telefone?.replace(/\D/g, "") || null,
        tipo: data.tipo,
        senha: senhaHash,
        clinicaId: id,
        ativo: true,
        primeiroAcesso: true,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        cpf: true,
        telefone: true,
        tipo: true,
        ativo: true,
        primeiroAcesso: true,
        ultimoAcesso: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ usuario }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Email ou CPF já cadastrado" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Erro ao criar usuário" },
      { status: 500 }
    );
  }
}


