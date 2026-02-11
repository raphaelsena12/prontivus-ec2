import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const fluxoCaixaSchema = z.object({
  tipo: z.enum(["ENTRADA", "SAIDA"]),
  descricao: z.string().min(1, "Descrição é obrigatória"),
  valor: z.number().min(0, "Valor deve ser maior ou igual a zero"),
  data: z.string().transform((str) => new Date(str)),
  formaPagamentoId: z.string().uuid().optional(),
  observacoes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo");
    const dataInicio = searchParams.get("dataInicio");
    const dataFim = searchParams.get("dataFim");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;
    const where: any = {
      clinicaId: auth.clinicaId!,
      ...(tipo && { tipo }),
      ...(search && {
        descricao: { contains: search, mode: "insensitive" as const },
      }),
      ...(dataInicio && dataFim && {
        data: { gte: new Date(dataInicio), lte: new Date(dataFim) },
      }),
    };
    const [movimentacoes, total] = await Promise.all([
      prisma.fluxoCaixa.findMany({
        where,
        include: { formaPagamento: { select: { id: true, nome: true } } },
        skip,
        take: limit,
        orderBy: { data: "desc" },
      }),
      prisma.fluxoCaixa.count({ where }),
    ]);
    return NextResponse.json({ movimentacoes, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("Erro ao listar fluxo de caixa:", error);
    return NextResponse.json({ error: "Erro ao listar fluxo de caixa" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;
    const body = await request.json();
    const validation = fluxoCaixaSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Dados inválidos", details: validation.error.issues }, { status: 400 });
    }
    const movimentacao = await prisma.fluxoCaixa.create({
      data: { ...validation.data, clinicaId: auth.clinicaId! },
    });
    return NextResponse.json({ movimentacao }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar movimentação:", error);
    return NextResponse.json({ error: "Erro ao criar movimentação" }, { status: 500 });
  }
}



