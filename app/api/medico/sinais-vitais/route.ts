import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";

async function checkAuthorization() {
  const session = await getSession();

  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }),
    };
  }

  if (session.user.tipo !== TipoUsuario.MEDICO) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Acesso negado." }, { status: 403 }),
    };
  }

  const clinicaId = await getUserClinicaId();
  if (!clinicaId) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Clínica não encontrada" }, { status: 403 }),
    };
  }

  return { authorized: true, clinicaId };
}

// PATCH /api/medico/sinais-vitais
export async function PATCH(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const body = await request.json();
    const { consultaId, pressaoSistolica, pressaoDiastolica, frequenciaCardiaca, saturacaoO2, temperatura, peso, altura } = body;

    if (!consultaId) {
      return NextResponse.json({ error: "ID da consulta é obrigatório" }, { status: 400 });
    }

    const consulta = await prisma.consulta.findFirst({
      where: { id: consultaId, clinicaId: auth.clinicaId },
    });

    if (!consulta) {
      return NextResponse.json({ error: "Consulta não encontrada" }, { status: 404 });
    }

    const toInt = (v: unknown): number | null => {
      if (v === null || v === undefined || v === "") return null;
      const n = parseInt(String(v), 10);
      return isNaN(n) ? null : n;
    };

    const toFloat = (v: unknown): number | null => {
      if (v === null || v === undefined || v === "") return null;
      const n = parseFloat(String(v).replace(",", "."));
      return isNaN(n) ? null : n;
    };

    // Só inclui campos com valor não-nulo
    const data: Record<string, unknown> = {};
    const ps = toInt(pressaoSistolica);
    const pd = toInt(pressaoDiastolica);
    const fc = toInt(frequenciaCardiaca);
    const so = toFloat(saturacaoO2);
    const te = toFloat(temperatura);
    const pe = toFloat(peso);
    const al = toFloat(altura);

    if (ps !== null) data.pressaoSistolica = ps;
    if (pd !== null) data.pressaoDiastolica = pd;
    if (fc !== null) data.frequenciaCardiaca = fc;
    if (so !== null) data.saturacaoO2 = so;
    if (te !== null) data.temperatura = te;
    if (pe !== null) data.peso = pe;
    if (al !== null) data.altura = al;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ consulta, message: "Nenhum campo para atualizar" }, { status: 200 });
    }

    const consultaAtualizada = await prisma.consulta.update({
      where: { id: consultaId },
      data,
    });

    const consultaSerializada = {
      ...consultaAtualizada,
      saturacaoO2: consultaAtualizada.saturacaoO2 != null ? parseFloat(consultaAtualizada.saturacaoO2.toString()) : null,
      temperatura: consultaAtualizada.temperatura != null ? parseFloat(consultaAtualizada.temperatura.toString()) : null,
      peso: consultaAtualizada.peso != null ? parseFloat(consultaAtualizada.peso.toString()) : null,
      altura: consultaAtualizada.altura != null ? parseFloat(consultaAtualizada.altura.toString()) : null,
    };
    return NextResponse.json({ consulta: consultaSerializada, message: "Sinais vitais atualizados com sucesso" }, { status: 200 });
  } catch (error) {
    console.error("Erro ao atualizar sinais vitais:", error);
    return NextResponse.json({ error: "Erro ao atualizar sinais vitais" }, { status: 500 });
  }
}
