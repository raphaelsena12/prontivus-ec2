import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClinicaWhatsAppService } from "@/lib/whatsapp";

export const runtime = "nodejs";

// Chamado diariamente (ex: 08h00) pelo cron do EC2.
// Envia lembrete WhatsApp para consultas do dia seguinte.
// Requer: Authorization: Bearer <CRON_SECRET>
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET não configurado");
    return NextResponse.json({ error: "Configuração ausente" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // Janela: consultas de hoje (00:00 até 23:59 no horário de Brasília)
  const agora = new Date();

  const inicioDia = new Date(agora);
  inicioDia.setHours(0, 0, 0, 0);

  const fimDia = new Date(agora);
  fimDia.setHours(23, 59, 59, 999);

  const consultas = await prisma.consulta.findMany({
    where: {
      dataHora: { gte: inicioDia, lte: fimDia },
      status: { in: ["AGENDADA", "CONFIRMADA"] },
    },
    include: {
      paciente: true,
      medico: { include: { usuario: true } },
      clinica: { select: { id: true, nome: true } },
    },
  });

  let enviados = 0;
  let erros = 0;

  for (const consulta of consultas) {
    const celular = consulta.paciente.celular || consulta.paciente.telefone;
    if (!celular) continue;

    try {
      const service = await getClinicaWhatsAppService(consulta.clinica.id);
      if (!service) continue;

      const dataFormatada = consulta.dataHora.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        timeZone: "America/Sao_Paulo",
      });
      const horaFormatada = consulta.dataHora.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      });

      await service.sendTemplateMessage({
        to: celular,
        message: "",
        templateId: "alerta_agendamento",
        templateParams: [
          consulta.paciente.nome,
          dataFormatada,
          horaFormatada,
          consulta.clinica.nome,
          consulta.medico.usuario.nome,
        ],
      });

      enviados++;
      console.log(`✅ Lembrete enviado para ${consulta.paciente.nome} (${celular})`);
    } catch (error: any) {
      erros++;
      console.error(`❌ Erro ao enviar lembrete para consulta ${consulta.id}:`, error.message);
    }
  }

  console.log(`📊 Lembretes: ${enviados} enviados, ${erros} erros de ${consultas.length} consultas`);

  return NextResponse.json({
    success: true,
    total: consultas.length,
    enviados,
    erros,
  });
}
