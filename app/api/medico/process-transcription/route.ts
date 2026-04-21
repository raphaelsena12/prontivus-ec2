import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { processTranscriptionWithOpenAI, type PacienteContexto } from "@/lib/openai-medical-service";
import { checkTokens, consumeTokens } from "@/lib/token-usage";
import { prisma } from "@/lib/prisma";
import { hashClinicalText, logClinicalAI } from "@/lib/clinical-ai-audit";

/**
 * Extrai possíveis alergias de um texto de observações.
 * Heurística simples: identifica linhas que mencionam "alergia" ou "alérgico".
 */
function extractAlergiasFromObservacoes(obs: string | null | undefined): string[] {
  if (!obs) return [];
  const lines = obs.split(/[\n;.]/);
  const matches = lines
    .filter((l) => /alergi|alérgic|intoleran/i.test(l))
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l.length < 200);
  return matches.slice(0, 10);
}

function calcularIdade(dataNascimento: Date | null | undefined): number | null {
  if (!dataNascimento) return null;
  const hoje = new Date();
  const nasc = new Date(dataNascimento);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade >= 0 && idade < 130 ? idade : null;
}

async function buildPacienteContextoFromConsulta(consultaId: string): Promise<PacienteContexto | undefined> {
  try {
    const consulta = await prisma.consulta.findUnique({
      where: { id: consultaId },
      select: {
        paciente: {
          select: {
            dataNascimento: true,
            sexo: true,
            observacoes: true,
          },
        },
      },
    });
    if (!consulta?.paciente) return undefined;

    const pacienteId = await prisma.consulta.findUnique({
      where: { id: consultaId },
      select: { pacienteId: true },
    });

    // Medicações em uso: pegar últimas prescrições
    let medicamentosEmUso: Array<{ nome: string; posologia?: string }> = [];
    if (pacienteId?.pacienteId) {
      const prescricoes = await prisma.consultaPrescricao.findMany({
        where: { consulta: { pacienteId: pacienteId.pacienteId } },
        orderBy: { createdAt: "desc" },
        take: 15,
        select: { medicamento: true, posologia: true },
      });
      medicamentosEmUso = prescricoes
        .filter((p) => p.medicamento)
        .map((p) => ({ nome: p.medicamento, posologia: p.posologia || undefined }));
    }

    return {
      idade: calcularIdade(consulta.paciente.dataNascimento),
      sexo: consulta.paciente.sexo,
      alergias: extractAlergiasFromObservacoes(consulta.paciente.observacoes),
      medicamentosEmUso,
      observacoesClinicas: consulta.paciente.observacoes,
    };
  } catch (error) {
    console.warn("[process-transcription] Falha ao montar contexto do paciente:", error);
    return undefined;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { transcription, examesIds = [], consultaId } = body;

    if (!transcription || typeof transcription !== "string") {
      return NextResponse.json(
        { error: "Transcrição não fornecida ou inválida" },
        { status: 400 }
      );
    }

    // Combinar todas as transcrições em um único texto
    const transcriptionText = Array.isArray(transcription)
      ? transcription.map((t: any) => t.text).join(" ")
      : transcription;

    // Validar credenciais OpenAI
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error: "Credenciais OpenAI não configuradas. Configure OPENAI_API_KEY no .env",
        },
        { status: 500 }
      );
    }

    const clinicaId = session.user.clinicaId;
    if (clinicaId) {
      const tokenCheck = await checkTokens(clinicaId);
      if (!tokenCheck.allowed) {
        return NextResponse.json(
          { error: "Limite de tokens de IA atingido para este mês. Entre em contato com o administrador da clínica." },
          { status: 429 }
        );
      }
    }

    // Montar contexto do paciente (alergias, medicações em uso, idade, etc.)
    const pacienteContexto = consultaId
      ? await buildPacienteContextoFromConsulta(consultaId)
      : undefined;

    const model = process.env.OPENAI_MODEL || "gpt-4o";
    const startedAt = Date.now();
    let pacienteId: string | null = null;
    if (consultaId) {
      const c = await prisma.consulta.findUnique({
        where: { id: consultaId },
        select: { pacienteId: true },
      });
      pacienteId = c?.pacienteId || null;
    }

    try {
      // Processar com OpenAI GPT (incluindo exames e contexto do paciente se disponíveis)
      const analysis = await processTranscriptionWithOpenAI(transcriptionText, examesIds, pacienteContexto);

      if (clinicaId) {
        await consumeTokens(clinicaId, "process-transcription", analysis._usage);
      }

      const { _usage, ...analysisData } = analysis;

      // Audit trail clínico (CFM / LGPD): grava hashes, modelo, custos e IDs.
      logClinicalAI({
        clinicaId,
        userId: session.user.id,
        userTipo: session.user.tipo,
        action: "process-transcription",
        consultaId: consultaId || null,
        pacienteId,
        model,
        promptHash: hashClinicalText(transcriptionText),
        outputHash: hashClinicalText(JSON.stringify(analysisData)),
        tokensUsed: _usage,
        latencyMs: Date.now() - startedAt,
        success: true,
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
        userAgent: request.headers.get("user-agent"),
        extra: { examesIds, hasPacienteContexto: !!pacienteContexto },
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        analysis: analysisData,
      });
    } catch (aiError: any) {
      logClinicalAI({
        clinicaId,
        userId: session.user.id,
        userTipo: session.user.tipo,
        action: "process-transcription",
        consultaId: consultaId || null,
        pacienteId,
        model,
        promptHash: hashClinicalText(transcriptionText),
        latencyMs: Date.now() - startedAt,
        success: false,
        errorMessage: aiError.message,
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
        userAgent: request.headers.get("user-agent"),
      }).catch(() => {});
      throw aiError;
    }
  } catch (error: any) {
    console.error("Erro ao processar transcrição:", error);
    return NextResponse.json(
      {
        error: error.message || "Erro ao processar transcrição com IA",
      },
      { status: 500 }
    );
  }
}

