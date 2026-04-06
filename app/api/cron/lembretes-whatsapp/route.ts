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

  // Janela: consultas entre 23h50 e 24h10 a partir de agora
  // Cron roda a cada 15min — janela de 20min garante que nenhuma consulta é perdida
  const agora = new Date();

  const inicioDia = new Date(agora.getTime() + 1430 * 60 * 1000); // +23h50
  const fimDia = new Date(agora.getTime() + 1450 * 60 * 1000);   // +24h10

  const consultas = await prisma.consulta.findMany({
    where: {
      dataHora: { gte: inicioDia, lte: fimDia },
      status: { in: ["AGENDADA", "CONFIRMADA"] },
    },
    include: {
      paciente: true,
      medico: { include: { usuario: true } },
      clinica: { select: { id: true, nome: true, whatsappContatoNumero: true, telefone: true } },
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

      const numeroContatoClinica = (consulta.clinica.whatsappContatoNumero || consulta.clinica.telefone || "").replace(/\D/g, "");

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
          numeroContatoClinica,
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
