import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/paciente/telemedicina/sessao/[token]
// Rota PÚBLICA — valida o token e retorna informações básicas da sessão para o paciente
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token || token.length < 32) {
      return NextResponse.json({ error: "Token inválido" }, { status: 400 });
    }

    const sessao = await prisma.telemedicineSession.findUnique({
      where: { patientToken: token },
      include: {
        consulta: {
          select: {
            dataHora: true,
            clinica: { select: { nome: true } },
            medico: {
              select: {
                usuario: { select: { nome: true } },
                especialidade: true,
              },
            },
          },
        },
      },
    });

    if (!sessao) {
      return NextResponse.json(
        { error: "Link inválido ou não encontrado" },
        { status: 404 }
      );
    }

    // Verifica expiração
    if (new Date() > sessao.patientTokenExpiresAt) {
      return NextResponse.json(
        { error: "Este link expirou. Solicite um novo link à clínica." },
        { status: 410 }
      );
    }

    // Verifica se sessão está cancelada ou encerrada
    if (sessao.status === "cancelled") {
      return NextResponse.json(
        { error: "Esta consulta foi cancelada." },
        { status: 410 }
      );
    }

    if (sessao.status === "finished") {
      return NextResponse.json(
        { error: "Esta consulta já foi encerrada.", finished: true },
        { status: 410 }
      );
    }

    const medicoNome = sessao.consulta.medico?.usuario?.nome || "Médico";
    const especialidade = sessao.consulta.medico?.especialidade || null;

    return NextResponse.json({
      sessionId: sessao.id,
      status: sessao.status,
      identityVerified: !!sessao.identityVerifiedAt,
      doctorName: medicoNome,
      specialty: especialidade || null,
      scheduledAt: sessao.consulta.dataHora,
      clinicName: sessao.consulta.clinica?.nome || null,
    });
  } catch (error) {
    console.error("Erro ao validar token de telemedicina:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
