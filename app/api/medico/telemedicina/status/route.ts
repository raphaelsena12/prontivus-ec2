import { NextRequest, NextResponse } from "next/server";
import { checkMedicoAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

// POST /api/medico/telemedicina/status
// Body: { status: "ONLINE" | "OFFLINE" }
export async function POST(request: NextRequest) {
  try {
    const auth = await checkMedicoAuth();
    if (!auth.authorized) return auth.response;

    const body = await request.json();
    const { status } = body;

    if (!["ONLINE", "OFFLINE"].includes(status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }

    // Garante que a config existe antes de mudar status
    const existing = await prisma.medicoTelemedicina.findUnique({
      where: { medicoId: auth.medicoId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Configure sua disponibilidade antes de ficar online" },
        { status: 400 }
      );
    }

    const updated = await prisma.medicoTelemedicina.update({
      where: { medicoId: auth.medicoId },
      data: {
        status,
        onlineSince: status === "ONLINE" ? new Date() : null,
      },
    });

    return NextResponse.json({ config: updated });
  } catch (error) {
    console.error("Erro ao atualizar status:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
