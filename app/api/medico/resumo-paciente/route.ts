import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
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

    const prompt = `Você é um assistente clínico especializado em síntese de prontuário médico.
Analise os dados abaixo e gere um RESUMO MÉDICO objetivo e estruturado, útil para o médico antes de iniciar o atendimento.

PACIENTE: ${paciente?.nome ?? 'Não informado'}, ${paciente?.idade ?? '?'} anos
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
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Resposta vazia do modelo');
    }

    const summary = JSON.parse(content);
    return NextResponse.json(summary);
  } catch (error: any) {
    console.error('[resumo-paciente] Erro:', error);
    return NextResponse.json(
      { error: error.message ?? 'Erro ao gerar resumo' },
      { status: 500 }
    );
  }
}
