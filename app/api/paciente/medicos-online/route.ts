import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

// GET /api/paciente/medicos-online
// Retorna lista de médicos com status ONLINE ou EM_ATENDIMENTO para o paciente
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const medicosOnline = await prisma.medicoTelemedicina.findMany({
      where: {
        status: { in: ["ONLINE", "EM_ATENDIMENTO"] },
      },
      include: {
        medico: {
          select: {
            id: true,
            crm: true,
            especialidade: true,
            usuario: {
              select: {
                nome: true,
                avatar: true,
              },
            },
          },
        },
      },
      orderBy: [
        { status: "asc" }, // ONLINE antes de EM_ATENDIMENTO
        { onlineSince: "asc" },
      ],
    });

    const resultado = medicosOnline.map((m) => ({
      id: m.medico.id,
      medicoTelemedicinaId: m.id,
      nome: m.medico.usuario.nome,
      especialidade: m.medico.especialidade,
      crm: m.medico.crm,
      status: m.status,
      valorConsulta: Number(m.valorConsulta),
      tempoConsultaMin: m.tempoConsultaMin,
      bio: m.bio,
      tags: m.tags,
      fotoUrl: m.fotoUrl ?? m.medico.usuario.avatar,
      onlineSince: m.onlineSince,
    }));

    return NextResponse.json({ medicos: resultado });
  } catch (error) {
    console.error("Erro ao buscar médicos online:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
