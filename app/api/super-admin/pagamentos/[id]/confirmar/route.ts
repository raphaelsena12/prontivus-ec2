import { NextRequest, NextResponse } from "next/server";
import { getSession, isSuperAdmin } from "@/lib/auth-helpers";
import { confirmarPagamento } from "@/lib/pagamento-service";

// POST /api/super-admin/pagamentos/[id]/confirmar
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const admin = await isSuperAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { transacaoId, dataPagamento } = body;

    const pagamento = await confirmarPagamento(
      id,
      transacaoId,
      dataPagamento ? new Date(dataPagamento) : undefined
    );

    return NextResponse.json({
      pagamento,
      message: "Pagamento confirmado e licença renovada com sucesso",
    });
  } catch (error: any) {
    console.error("Erro ao confirmar pagamento:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao confirmar pagamento" },
      { status: 500 }
    );
  }
}















