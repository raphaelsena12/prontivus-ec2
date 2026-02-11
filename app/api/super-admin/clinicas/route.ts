import { NextRequest, NextResponse } from "next/server";
import { getSession, isSuperAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { StatusClinica, TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

// Validação de CNPJ
const validateCNPJ = (cnpj: string): boolean => {
  const cleaned = cnpj.replace(/\D/g, "");
  if (cleaned.length !== 14) return false;

  let size = cleaned.length - 2;
  let numbers = cleaned.substring(0, size);
  const digits = cleaned.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  size = size + 1;
  numbers = cleaned.substring(0, size);
  sum = 0;
  pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return result === parseInt(digits.charAt(1));
};

// Schemas de validação Zod
const createClinicaSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  cnpj: z
    .string()
    .min(1, "CNPJ é obrigatório")
    .refine(
      (val) => {
        const formatted = val.replace(/\D/g, "");
        return formatted.length === 14 && validateCNPJ(val);
      },
      { message: "CNPJ inválido" }
    ),
  email: z.string().email("Email inválido"),
  telefone: z.string().min(1, "Telefone é obrigatório"),
  planoId: z.string().uuid("Plano inválido"),
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

// GET /api/super-admin/clinicas
export async function GET() {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const clinicas = await prisma.tenant.findMany({
      select: {
        id: true,
        nome: true,
        cnpj: true,
        email: true,
        telefone: true,
        status: true,
        tokensMensaisDisponiveis: true,
        tokensConsumidos: true,
        telemedicineHabilitada: true,
        dataContratacao: true,
        dataExpiracao: true,
        createdAt: true,
        updatedAt: true,
        planoId: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Buscar planos separadamente
    const planoIds = [...new Set(clinicas.map(c => c.planoId))];
    const planos = await prisma.plano.findMany({
      where: { id: { in: planoIds } },
    });
    const planosMap = new Map(planos.map(p => [p.id, p]));

    const formattedClinicas = clinicas.map((clinica) => {
      const plano = planosMap.get(clinica.planoId);
      return {
        id: clinica.id,
        nome: clinica.nome,
        cnpj: clinica.cnpj,
        email: clinica.email,
        telefone: clinica.telefone,
        status: clinica.status,
        tokensMensaisDisponiveis: clinica.tokensMensaisDisponiveis,
        tokensConsumidos: clinica.tokensConsumidos,
        telemedicineHabilitada: clinica.telemedicineHabilitada,
        dataContratacao: clinica.dataContratacao,
        dataExpiracao: clinica.dataExpiracao,
        createdAt: clinica.createdAt,
        updatedAt: clinica.updatedAt,
        plano: plano ? {
          id: plano.id,
          nome: plano.nome,
          tokensMensais: plano.tokensMensais,
          preco: Number(plano.preco),
          telemedicineHabilitada: plano.telemedicineHabilitada,
        } : null,
      };
    });

    return NextResponse.json({ clinicas: formattedClinicas });
  } catch (error) {
    console.error("Erro ao listar clínicas:", error);
    return NextResponse.json(
      { error: "Erro ao listar clínicas" },
      { status: 500 }
    );
  }
}

// POST /api/super-admin/clinicas
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await request.json();
    const validation = createClinicaSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verificar se CNPJ já existe
    const cnpjLimpo = data.cnpj.replace(/\D/g, "");
    const existingClinica = await prisma.tenant.findUnique({
      where: { cnpj: cnpjLimpo },
    });

    if (existingClinica) {
      return NextResponse.json(
        { error: "CNPJ já cadastrado" },
        { status: 409 }
      );
    }

    // Buscar plano
    const plano = await prisma.plano.findUnique({
      where: { id: data.planoId },
    });

    if (!plano) {
      return NextResponse.json(
        { error: "Plano não encontrado" },
        { status: 404 }
      );
    }

    // Criar clínica
    const clinica = await prisma.tenant.create({
      data: {
        nome: data.nome,
        cnpj: cnpjLimpo,
        email: data.email,
        telefone: data.telefone.replace(/\D/g, ""),
        planoId: data.planoId,
        tokensMensaisDisponiveis: plano.tokensMensais,
        tokensConsumidos: 0,
        telemedicineHabilitada: plano.telemedicineHabilitada,
        dataContratacao: new Date(),
        status: StatusClinica.ATIVA,
      },
    });

    // Criar admin da clínica
    const senhaHash = await bcrypt.hash("Clinica@123", 10);
    const emailAdmin = `admin@${cnpjLimpo}.clinica.com`;
    const cpfAdmin = `000${cnpjLimpo.slice(-9)}`;

    await prisma.usuario.create({
      data: {
        email: emailAdmin,
        senha: senhaHash,
        nome: `Admin ${data.nome}`,
        cpf: cpfAdmin,
        tipo: TipoUsuario.ADMIN_CLINICA,
        clinicaId: clinica.id,
        ativo: true,
        primeiroAcesso: true,
      },
    });

    // Simular envio de email
    console.log(
      `Email simulado enviado para ${emailAdmin} com credenciais: Clinica@123`
    );

    const formattedClinica = {
      id: clinica.id,
      nome: clinica.nome,
      cnpj: clinica.cnpj,
      email: clinica.email,
      telefone: clinica.telefone,
      status: clinica.status,
      tokensMensaisDisponiveis: clinica.tokensMensaisDisponiveis,
      tokensConsumidos: clinica.tokensConsumidos,
      telemedicineHabilitada: clinica.telemedicineHabilitada,
      dataContratacao: clinica.dataContratacao,
      dataExpiracao: clinica.dataExpiracao,
      plano: {
        id: plano.id,
        nome: plano.nome,
        tokensMensais: plano.tokensMensais,
        preco: Number(plano.preco),
        telemedicineHabilitada: plano.telemedicineHabilitada,
      },
    };

    return NextResponse.json(
      { clinica: formattedClinica, message: "Clínica criada com sucesso" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao criar clínica:", error);
    return NextResponse.json(
      { error: "Erro ao criar clínica" },
      { status: 500 }
    );
  }
}
