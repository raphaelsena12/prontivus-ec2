import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StatusClinica } from "@/lib/generated/prisma";

export const runtime = "nodejs";

// Chamado no 1º dia de cada mês pelo scheduler do EC2.
// Reseta tokensConsumidos de todas as clínicas ativas para 0.
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

  const result = await prisma.tenant.updateMany({
    where: { status: StatusClinica.ATIVA },
    data: { tokensConsumidos: 0 },
  });

  console.log(`🪙 Tokens resetados para ${result.count} clínicas ativas`);

  return NextResponse.json({
    success: true,
    clinicasResetadas: result.count,
  });
}
