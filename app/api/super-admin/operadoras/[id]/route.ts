import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const updateSchema = z.object({
  codigoAns: z.string().regex(/^\d{6}$/, "Código ANS deve ter exatamente 6 dígitos numéricos").optional(),
  razaoSocial: z.string().min(3).optional(),
  nomeFantasia: z.string().optional().nullable(),
  cnpj: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  cep: z.string().optional().nullable(),
  endereco: z.string().optional().nullable(),
  numero: z.string().optional().nullable(),
  complemento: z.string().optional().nullable(),
  bairro: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  estado: z.string().optional().nullable(),
  pais: z.string().optional().nullable(),
  ativo: z.boolean().optional(),
});

async function checkAuthorization() {
  const session = await getSession();
  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }),
    };
  }
  if (session.user.tipo !== TipoUsuario.SUPER_ADMIN) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Acesso negado" }, { status: 403 }),
    };
  }
  return { authorized: true };
}

// GET /api/super-admin/operadoras/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const operadora = await prisma.operadora.findFirst({
      where: { id, clinicaId: null },
    });
    if (!operadora) return NextResponse.json({ error: "Operadora não encontrada" }, { status: 404 });
    return NextResponse.json({ operadora });
  } catch (error) {
    console.error("Erro ao buscar operadora (super-admin):", error);
    return NextResponse.json({ error: "Erro ao buscar operadora" }, { status: 500 });
  }
}

// PATCH /api/super-admin/operadoras/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const body = await request.json();
    const validation = updateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Dados inválidos", details: validation.error.issues }, { status: 400 });
    }

    const exists = await prisma.operadora.findFirst({ where: { id, clinicaId: null }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "Operadora não encontrada" }, { status: 404 });

    const data = validation.data as any;
    if (data.email === "") data.email = null;

    const operadora = await prisma.operadora.update({
      where: { id },
      data,
    });

    return NextResponse.json({ operadora });
  } catch (error) {
    console.error("Erro ao atualizar operadora (super-admin):", error);
    return NextResponse.json({ error: "Erro ao atualizar operadora" }, { status: 500 });
  }
}

// DELETE /api/super-admin/operadoras/[id]
// (exclui do banco)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const exists = await prisma.operadora.findFirst({ where: { id, clinicaId: null }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "Operadora não encontrada" }, { status: 404 });

    try {
      await prisma.operadora.delete({ where: { id } });
      return NextResponse.json({ message: "Operadora excluída com sucesso" });
    } catch (e: any) {
      // FK constraint (ex.: já usada em consultas/guias/planos) ou outros erros de integridade
      const code = e?.code || e?.name;
      if (code === "P2003") {
        return NextResponse.json(
          {
            error:
              "Não foi possível excluir: esta operadora possui vínculos (ex.: consultas/guias/planos). Remova os vínculos antes ou mantenha no catálogo.",
          },
          { status: 409 }
        );
      }
      throw e;
    }
  } catch (error) {
    console.error("Erro ao desativar operadora (super-admin):", error);
    return NextResponse.json({ error: "Erro ao excluir operadora" }, { status: 500 });
  }
}

