import { NextRequest, NextResponse } from "next/server";
import { checkMedicoAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

// GET /api/medico/telemedicina/sessoes/[sessionId]
// Retorna detalhes da sessão de telemedicina para o médico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const auth = await checkMedicoAuth();
    if (!auth.authorized) return auth.response;

    const { sessionId } = await params;

    const sessao = await prisma.telemedicineSession.findUnique({
      where: { id: sessionId },
      include: {
        consulta: {
          select: {
            id: true,
            dataHora: true,
            modalidade: true,
            clinicaId: true,
            paciente: {
              select: {
                id: true,
                nome: true,
                dataNascimento: true,
                cpf: true,
                email: true,
                telefone: true,
              },
            },
            medico: {
              select: {
                id: true,
                usuario: { select: { nome: true } },
              },
            },
          },
        },
        participants: true,
        consents: {
          orderBy: { consentTimestamp: "desc" },
          take: 1,
        },
        logs: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!sessao) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
    }

    // Verifica que o médico pertence à clínica da consulta
    if (sessao.consulta.clinicaId !== auth.clinicaId) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // Remove dados sensíveis da sessão, expõe apenas o link completo para o médico autenticado
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const patientLink = `${baseUrl}/telemedicina/acesso?token=${sessao.patientToken}`;
    const { meetingData, patientToken, ...sessaoSegura } = sessao;

    return NextResponse.json({ sessao: sessaoSegura, patientLink });
  } catch (error) {
    console.error("Erro ao buscar sessão de telemedicina:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
