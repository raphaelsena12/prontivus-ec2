import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StatusClinica } from "@/lib/generated/prisma";

export const runtime = "nodejs";

// Chamado pelo Vercel Cron (vercel.json) ou qualquer scheduler externo.
// Requer: Authorization: Bearer <CRON_SECRET>
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET não configurado");
    return NextResponse.json({ error: "Configuração ausente" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const agora = new Date();

    // Buscar clínicas ativas com dataExpiracao vencida
    // Inclui um buffer de 1 dia para evitar falsos positivos por fuso horário
    const limiteExpiracao = new Date(agora.getTime() - 24 * 60 * 60 * 1000);

    const clinicasVencidas = await prisma.tenant.findMany({
      where: {
        status: StatusClinica.ATIVA,
        dataExpiracao: { lt: limiteExpiracao },
      },
      select: { id: true, nome: true, email: true, dataExpiracao: true },
    });

    if (clinicasVencidas.length === 0) {
      return NextResponse.json({ suspensas: 0, ids: [] });
    }

    // Suspender em lote
    const ids = clinicasVencidas.map((c) => c.id);
    await prisma.tenant.updateMany({
      where: { id: { in: ids } },
      data: { status: StatusClinica.SUSPENSA },
    });

    console.log(
      `[cron:suspender-vencidas] ${ids.length} clínica(s) suspensa(s):`,
      clinicasVencidas.map((c) => `${c.nome} (exp: ${c.dataExpiracao?.toISOString()})`)
    );

    return NextResponse.json({
      suspensas: ids.length,
      ids,
      clinicas: clinicasVencidas.map((c) => ({
        id: c.id,
        nome: c.nome,
        dataExpiracao: c.dataExpiracao,
      })),
    });
  } catch (error) {
    console.error("[cron:suspender-vencidas] Erro:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
