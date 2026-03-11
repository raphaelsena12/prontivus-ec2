import { NextResponse } from "next/server";
import { checkMedicoAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

// GET /api/medico/telemedicina/sessoes-aguardando
// Retorna sessões de telemedicina aguardando o médico (iniciadas pelo paciente)
export async function GET() {
  try {
    const auth = await checkMedicoAuth();
    if (!auth.authorized) return auth.response;

    const sessoes = await prisma.telemedicineSession.findMany({
      where: {
        status: { in: ["waiting", "scheduled"] },
        consulta: {
          medicoId: auth.medicoId,
          clinicaId: auth.clinicaId,
          modalidade: "TELEMEDICINA",
        },
      },
      include: {
        consulta: {
          select: {
            id: true,
            dataHora: true,
            paciente: {
              select: {
                id: true,
                nome: true,
                dataNascimento: true,
                telefone: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const resultado = sessoes.map((s) => ({
      sessionId: s.id,
      status: s.status,
      consultaId: s.consulta.id,
      dataHora: s.consulta.dataHora,
      criadoEm: s.createdAt,
      paciente: {
        id: s.consulta.paciente.id,
        nome: s.consulta.paciente.nome,
        dataNascimento: s.consulta.paciente.dataNascimento,
        telefone: s.consulta.paciente.telefone,
        email: s.consulta.paciente.email,
      },
    }));

    return NextResponse.json({ sessoes: resultado });
  } catch (error) {
    console.error("Erro ao buscar sessões aguardando:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
