import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getSession } from '@/lib/auth-helpers';
import { checkTokens, consumeTokens } from '@/lib/token-usage';
import { sanitizeTextForAI } from '@/lib/crypto/sanitize-pii';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isTransient = error.status === 429 || error.status === 500 || error.status === 503;
      if (isTransient && attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`OpenAI erro ${error.status}, tentativa ${attempt}/${retries}. Aguardando ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const {
      paciente,
      alergias,
      historicoConsultas,
      medicamentosEmUso,
      examesAnexados,
      vitais,
    } = body;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY não configurado' },
        { status: 500 }
      );
    }

    const clinicaId = session.user.clinicaId;
    if (clinicaId) {
      const tokenCheck = await checkTokens(clinicaId);
      if (!tokenCheck.allowed) {
        return NextResponse.json(
          { error: 'Limite de tokens de IA atingido para este mês. Entre em contato com o administrador da clínica.' },
          { status: 429 }
        );
      }
    }

    // Montar contexto clínico para o modelo
    const historicoTexto = (historicoConsultas ?? [])
      .slice(0, 5)
      .map((c: any) =>
        `- ${c.dataHora ? new Date(c.dataHora).toLocaleDateString('pt-BR') : 'Data desconhecida'}: ${c.tipoConsulta?.nome ?? 'Consulta'} — ${c.prontuario?.diagnostico ?? c.prontuario?.anamnese?.substring(0, 120) ?? 'Sem registro'}`
      )
      .join('\n');

    const medicamentosTexto = (medicamentosEmUso ?? [])
      .map((m: any) => `- ${m.nome} ${m.posologia ?? ''}`)
      .join('\n');

    const examesTexto = (examesAnexados ?? [])
      .slice(0, 8)
      .map((e: any) => `- ${e.nome} (${e.data ? new Date(e.data).toLocaleDateString('pt-BR') : 'sem data'})`)
      .join('\n');

    const vitaisTexto = (vitais ?? [])
      .map((v: any) => `${v.label}: ${v.value} ${v.unit}`)
      .join(' | ');

    // LGPD: sanitizar o prompt completo para remover PII residual antes de enviar à OpenAI
    const prompt = sanitizeTextForAI(`Você é um assistente clínico especializado em síntese de prontuário médico.
Analise os dados abaixo e gere um RESUMO MÉDICO objetivo e estruturado, útil para o médico antes de iniciar o atendimento.

PACIENTE: ${paciente?.idade ?? '?'} anos, sexo: ${paciente?.sexo ?? 'não informado'}
ALERGIAS: ${alergias?.length ? alergias.join(', ') : 'Nenhuma registrada'}
SINAIS VITAIS: ${vitaisTexto || 'Não disponíveis'}

HISTÓRICO DE CONSULTAS (últimas 5):
${historicoTexto || 'Nenhuma consulta anterior'}

MEDICAMENTOS EM USO:
${medicamentosTexto || 'Nenhum registrado'}

EXAMES ANEXADOS:
${examesTexto || 'Nenhum exame anexado'}

INSTRUÇÕES:
- Seja objetivo e clínico. Use linguagem médica.
- Identifique condições crônicas, comorbidades e padrões clínicos relevantes.
- Sinalize pontos de atenção críticos (alergias, interações, condições graves).
- Sugira orientações práticas para esta consulta com base no histórico.
- Responda SOMENTE em JSON, sem texto adicional, no formato abaixo.

{
  "panoramaGeral": "2-3 frases resumindo o perfil clínico do paciente",
  "condicoesAtivas": ["condição 1", "condição 2"],
  "pontosAtencao": ["ponto crítico 1", "ponto crítico 2"],
  "tendenciasClinicas": ["tendência observada no histórico 1"],
  "orientacoesSugeridas": ["sugestão 1 baseada no histórico", "sugestão 2"],
  "nivelComplexidade": "baixo" | "moderado" | "alto"
}`, { patientName: paciente?.nome });

    const response = await withRetry(() => openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 800,
    }));

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Resposta vazia do modelo');
    }

    const summary = JSON.parse(content);

    if (clinicaId) {
      await consumeTokens(clinicaId, 'resumo-paciente', response.usage?.total_tokens);
    }

    return NextResponse.json(summary);
  } catch (error: any) {
    console.error('[resumo-paciente] Erro:', error);
    return NextResponse.json(
      { error: error.message ?? 'Erro ao gerar resumo' },
      { status: 500 }
    );
  }
}
