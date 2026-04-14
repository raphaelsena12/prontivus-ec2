import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";

async function checkAuthorization() {
  const session = await getSession();

  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      ),
    };
  }

  if (session.user.tipo !== TipoUsuario.MEDICO) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso negado. Apenas médicos podem acessar esta rota." },
        { status: 403 }
      ),
    };
  }

  const clinicaId = await getUserClinicaId();
  if (!clinicaId) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, clinicaId };
}

// PATCH /api/medico/sinais-vitais - Médico atualiza sinais vitais durante atendimento
export async function PATCH(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await request.json();
    const {
      consultaId,
      pressaoSistolica,
      pressaoDiastolica,
      frequenciaCardiaca,
      saturacaoO2,
      temperatura,
      peso,
      altura,
    } = body;

    if (!consultaId) {
      return NextResponse.json(
        { error: "ID da consulta é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se a consulta pertence à clínica
    const consulta = await prisma.consulta.findFirst({
      where: {
        id: consultaId,
        clinicaId: auth.clinicaId,
      },
    });

    if (!consulta) {
      return NextResponse.json(
        { error: "Consulta não encontrada" },
        { status: 404 }
      );
    }

    // Montar apenas os campos enviados para atualização parcial
    const data: Record<string, unknown> = {};
    if (pressaoSistolica !== undefined) data.pressaoSistolica = pressaoSistolica;
    if (pressaoDiastolica !== undefined) data.pressaoDiastolica = pressaoDiastolica;
    if (frequenciaCardiaca !== undefined) data.frequenciaCardiaca = frequenciaCardiaca;
    if (saturacaoO2 !== undefined) data.saturacaoO2 = saturacaoO2;
    if (temperatura !== undefined) data.temperatura = temperatura;
    if (peso !== undefined) data.peso = peso;
    if (altura !== undefined) data.altura = altura;

    const consultaAtualizada = await prisma.consulta.update({
      where: { id: consultaId },
      data,
    });

    return NextResponse.json(
      { consulta: consultaAtualizada, message: "Sinais vitais atualizados com sucesso" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro ao atualizar sinais vitais:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar sinais vitais" },
      { status: 500 }
    );
  }
}
