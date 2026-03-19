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

  if (
    session.user.tipo !== TipoUsuario.SECRETARIA &&
    session.user.tipo !== TipoUsuario.ADMIN_CLINICA
  ) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso negado" },
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

// PATCH /api/secretaria/sinais-vitais - Salvar sinais vitais de uma consulta
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

    // Atualizar os sinais vitais da consulta
    const consultaAtualizada = await prisma.consulta.update({
      where: {
        id: consultaId,
      },
      data: {
        pressaoSistolica: pressaoSistolica ?? null,
        pressaoDiastolica: pressaoDiastolica ?? null,
        frequenciaCardiaca: frequenciaCardiaca ?? null,
        saturacaoO2: saturacaoO2 ?? null,
        temperatura: temperatura ?? null,
        peso: peso ?? null,
        altura: altura ?? null,
      },
    });

    return NextResponse.json(
      { consulta: consultaAtualizada, message: "Sinais vitais salvos com sucesso" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro ao salvar sinais vitais:", error);
    return NextResponse.json(
      { error: "Erro ao salvar sinais vitais" },
      { status: 500 }
    );
  }
}
