import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

// Schema de validação para criação de usuário
const createUsuarioSchema = z.object({
  nome: z.string()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  email: z.string()
    .email("Email inválido")
    .max(100, "Email deve ter no máximo 100 caracteres"),
  cpf: z.string()
    .min(11, "CPF deve ter 11 dígitos")
    .max(14, "CPF inválido")
    .refine((val) => val.replace(/\D/g, "").length === 11, {
      message: "CPF inválido",
    }),
  telefone: z.string()
    .min(1, "Telefone é obrigatório")
    .max(15, "Telefone inválido")
    .refine((val) => {
      const cleaned = val.replace(/\D/g, "");
      return cleaned.length >= 10 && cleaned.length <= 11;
    }, {
      message: "Telefone inválido",
    }),
  tipo: z.nativeEnum(TipoUsuario),
  senha: z.string()
    .min(6, "Senha deve ter no mínimo 6 caracteres")
    .max(255, "Senha deve ter no máximo 255 caracteres"),
});

// GET /api/admin-clinica/usuarios
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) {
      return auth.response;
    }

    // Buscar usuários da clínica (apenas ativos)
    const usuarios = await prisma.usuario.findMany({
      where: {
        clinicaId: auth.clinicaId!,
        ativo: true,
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

// POST /api/admin-clinica/usuarios
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) {
      return auth.response;
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
        telefone: data.telefone.replace(/\D/g, ""),
        tipo: data.tipo,
        senha: senhaHash,
        clinicaId: auth.clinicaId!,
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














