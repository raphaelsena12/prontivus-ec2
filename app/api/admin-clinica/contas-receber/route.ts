import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const contaReceberSchema = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória"),
  pacienteId: z.string().uuid().optional(),
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
      ...(search && { OR: [{ descricao: { contains: search, mode: "insensitive" as const } }, { paciente: { nome: { contains: search, mode: "insensitive" as const } } }] }),
      ...(status && { status }),
    };
    const [contas, total] = await Promise.all([
      prisma.contaReceber.findMany({
        where,
        include: { paciente: { select: { id: true, nome: true } } },
        skip,
        take: limit,
        orderBy: { dataVencimento: "asc" },
      }),
      prisma.contaReceber.count({ where }),
    ]);
    return NextResponse.json({ contas, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("Erro ao listar contas a receber:", error);
    return NextResponse.json({ error: "Erro ao listar contas a receber" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;
    const body = await request.json();
    const validation = contaReceberSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Dados inválidos", details: validation.error.issues }, { status: 400 });
    }
    const conta = await prisma.contaReceber.create({
      data: { ...validation.data, clinicaId: auth.clinicaId!, status: "PENDENTE" },
    });
    return NextResponse.json({ conta }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar conta a receber:", error);
    return NextResponse.json({ error: "Erro ao criar conta a receber" }, { status: 500 });
  }
}















