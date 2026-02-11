import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const formaPagamentoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  tipo: z.enum(["DINHEIRO", "CARTAO_CREDITO", "CARTAO_DEBITO", "PIX", "BOLETO", "TRANSFERENCIA"]),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;
    const where = {
      clinicaId: auth.clinicaId!,
      ...(search && { OR: [{ nome: { contains: search, mode: "insensitive" as const } }] }),
    };
    const [formasPagamento, total] = await Promise.all([
      prisma.formaPagamento.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.formaPagamento.count({ where }),
    ]);
    return NextResponse.json({ formasPagamento, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("Erro ao listar formas de pagamento:", error);
    return NextResponse.json({ error: "Erro ao listar formas de pagamento" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;
    const body = await request.json();
    const validation = formaPagamentoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Dados inválidos", details: validation.error.issues }, { status: 400 });
    }
    const formaPagamento = await prisma.formaPagamento.create({
      data: { ...validation.data, clinicaId: auth.clinicaId! },
    });
    return NextResponse.json({ formaPagamento }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar forma de pagamento:", error);
    return NextResponse.json({ error: "Erro ao criar forma de pagamento" }, { status: 500 });
  }
}















