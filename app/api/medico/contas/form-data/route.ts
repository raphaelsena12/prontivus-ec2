import { NextRequest, NextResponse } from "next/server";
import { checkMedicoAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await checkMedicoAuth();
    if (!auth.authorized) return auth.response;

    // Buscar pacientes das consultas do médico
    const consultas = await prisma.consulta.findMany({
      where: { medicoId: auth.medicoId },
      select: { pacienteId: true },
      distinct: ["pacienteId"],
    });

    const pacienteIds = consultas.map((c) => c.pacienteId);

    const pacientes = await prisma.paciente.findMany({
      where: {
        id: { in: pacienteIds },
        clinicaId: auth.clinicaId,
      },
      select: {
        id: true,
        nome: true,
      },
      orderBy: {
        nome: "asc",
      },
    });

    // Buscar formas de pagamento da clínica
    const formasPagamento = await prisma.formaPagamento.findMany({
      where: {
        clinicaId: auth.clinicaId,
      },
      select: {
        id: true,
        nome: true,
      },
      orderBy: {
        nome: "asc",
      },
    });

    return NextResponse.json({
      pacientes,
      formasPagamento,
    });
  } catch (error) {
    console.error("Erro ao buscar dados do formulário:", error);
    return NextResponse.json(
      { error: "Erro ao buscar dados do formulário" },
      { status: 500 }
    );
  }
}
