import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const contaPagarSchema = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória"),
  fornecedor: z.string().optional(),
  valor: z.number().min(0, "Valor deve ser maior ou igual a zero"),
  dataVencimento: z.string().transform((str) => new Date(str)),
  formaPagamentoId: z.string().uuid().optional(),
  observacoes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;
    const where = {
      clinicaId: auth.clinicaId!,
      ...(search && { OR: [{ descricao: { contains: search, mode: "insensitive" as const } }, { fornecedor: { contains: search, mode: "insensitive" as const } }] }),
      ...(status && { status }),
    };
    const [contas, total] = await Promise.all([
      prisma.contaPagar.findMany({ where, skip, take: limit, orderBy: { dataVencimento: "asc" } }),
      prisma.contaPagar.count({ where }),
    ]);
    return NextResponse.json({ contas, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("Erro ao listar contas a pagar:", error);
    return NextResponse.json({ error: "Erro ao listar contas a pagar" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;
    const body = await request.json();
    const validation = contaPagarSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Dados inválidos", details: validation.error.issues }, { status: 400 });
    }
    const conta = await prisma.contaPagar.create({
      data: { ...validation.data, clinicaId: auth.clinicaId!, status: "PENDENTE" },
    });
    return NextResponse.json({ conta }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar conta a pagar:", error);
    return NextResponse.json({ error: "Erro ao criar conta a pagar" }, { status: 500 });
  }
}















