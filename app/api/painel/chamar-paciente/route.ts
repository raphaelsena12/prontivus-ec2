import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { pacienteNome, medicoNome, sala, status = "CHAMANDO", clinicaId } = body;

  if (!pacienteNome || !medicoNome || !sala || !clinicaId) {
    return NextResponse.json({ error: "Dados incompletos: pacienteNome, medicoNome, sala e clinicaId são obrigatórios" }, { status: 400 });
  }

  const chamada = {
    id: crypto.randomUUID(),
    pacienteNome: String(pacienteNome),
    medicoNome: String(medicoNome),
    sala: String(sala),
    status: status === "EM_ATENDIMENTO" ? "EM_ATENDIMENTO" : "CHAMANDO",
    horario: new Date().toISOString(),
    clinicaId: String(clinicaId),
  };

  const io = (global as any).__socketIO;
  const painelChamadas = (global as any).__painelChamadas as Map<string, typeof chamada[]> | undefined;

  // Se já existe chamada CHAMANDO para o mesmo paciente, atualiza em vez de duplicar
  let isUpdate = false;
  if (painelChamadas) {
    const atual = painelChamadas.get(clinicaId) || [];
    const existenteIdx = atual.findIndex(
      (c) => c.pacienteNome === chamada.pacienteNome && c.status === "CHAMANDO"
    );
    if (existenteIdx !== -1) {
      // Atualiza o existente (mantém o id original, atualiza horário/sala/médico)
      chamada.id = atual[existenteIdx].id;
      atual[existenteIdx] = chamada;
      // Move para o topo
      const [atualizado] = atual.splice(existenteIdx, 1);
      painelChamadas.set(clinicaId, [atualizado, ...atual].slice(0, 10));
      isUpdate = true;
    } else {
      painelChamadas.set(clinicaId, [chamada, ...atual].slice(0, 10));
    }
  }

  const mensagem = `Atenção, ${pacienteNome}, favor se dirigir a ${sala}.`;

  if (io) {
    if (isUpdate) {
      // Paciente já estava no painel — atualiza o card existente e move ao topo
      io.to(`painel:${clinicaId}`).emit("rechamar-paciente", { chamada, mensagem });
    } else {
      io.to(`painel:${clinicaId}`).emit("nova-chamada", { chamada, mensagem });
    }
  }

  return NextResponse.json({ success: true, chamada });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { id, status, clinicaId } = body;

  if (!id || !status || !clinicaId) {
    return NextResponse.json({ error: "Dados incompletos: id, status e clinicaId são obrigatórios" }, { status: 400 });
  }

  const painelChamadas = (global as any).__painelChamadas as Map<string, any[]> | undefined;
  if (painelChamadas) {
    const atual = painelChamadas.get(clinicaId) || [];
    const idx = atual.findIndex((c) => c.id === id);
    if (idx !== -1) {
      atual[idx] = { ...atual[idx], status };
      painelChamadas.set(clinicaId, atual);

      const io = (global as any).__socketIO;
      if (io) {
        io.to(`painel:${clinicaId}`).emit("atualizar-chamada", { chamada: atual[idx] });
      }
    }
  }

  return NextResponse.json({ success: true });
}
