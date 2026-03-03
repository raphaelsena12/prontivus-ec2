import { NextRequest, NextResponse } from "next/server";
import { checkSecretariaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkSecretariaAuth();
  if (!auth.authorized) return auth.response!;
  const clinicaId = auth.clinicaId!;
  const { id } = await params;

  const guia = await prisma.guiaTiss.findFirst({
    where: { id, clinicaId },
    include: {
      procedimentos: true,
      paciente: true,
    },
  });

  if (!guia) {
    return NextResponse.json({ error: "Guia não encontrada" }, { status: 404 });
  }

  if (guia.status === "ENVIADA") {
    return NextResponse.json({ error: "Guia já foi enviada" }, { status: 400 });
  }

  const erros: string[] = [];

  // Regra: guia deve ter pelo menos um procedimento
  if (guia.procedimentos.length === 0) {
    erros.push("A guia deve ter pelo menos um procedimento");
  }

  // Regra: data de atendimento não pode ser futura
  if (guia.dataAtendimento > new Date()) {
    erros.push("A data de atendimento não pode ser futura");
  }

  // Regra: carteirinha obrigatória
  if (!guia.numeroCarteirinha || guia.numeroCarteirinha.trim() === "") {
    erros.push("Número da carteirinha é obrigatório");
  }

  // Regra: CPF do paciente deve estar preenchido
  if (!guia.paciente.cpf) {
    erros.push("CPF do paciente não está preenchido");
  }

  if (erros.length > 0) {
    return NextResponse.json({ valida: false, erros }, { status: 422 });
  }

  await prisma.guiaTiss.update({
    where: { id },
    data: { status: "VALIDADA" },
  });

  return NextResponse.json({ valida: true, erros: [] });
}
