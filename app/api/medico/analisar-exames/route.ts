import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';
import { getSignedUrlFromS3 } from '@/lib/s3-service';
import { checkTokens, consumeTokens } from "@/lib/token-usage";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { examesIds, consultaId } = body;

    if (!examesIds || !Array.isArray(examesIds) || examesIds.length === 0) {
      return NextResponse.json(
        { error: "IDs dos exames são obrigatórios" },
        { status: 400 }
      );
    }

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

    // Buscar exames do banco
    const exames = await prisma.documentoGerado.findMany({
      where: {
        id: { in: examesIds },
        tipoDocumento: { in: ["exame-imagem", "exame-pdf"] },
      },
      select: {
        id: true,
        nomeDocumento: true,
        tipoDocumento: true,
        s3Key: true,
        dados: true,
      },
    });

    if (exames.length === 0) {
      return NextResponse.json(
        { error: "Nenhum exame encontrado" },
        { status: 404 }
      );
    }

    // Preparar imagens para análise
    const imageUrls: string[] = [];
    const imageNames: string[] = [];
    
    for (const exame of exames) {
      if (exame.s3Key && exame.tipoDocumento === "exame-imagem") {
        try {
          const signedUrl = await getSignedUrlFromS3(exame.s3Key, 3600);
          imageUrls.push(signedUrl);
          imageNames.push(exame.nomeDocumento);
        } catch (error) {
          console.error(`Erro ao obter URL do exame ${exame.id}:`, error);
        }
      }
    }

    if (imageUrls.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma imagem encontrada para análise" },
        { status: 400 }
      );
    }

    // Prompt específico para análise de exames (SEM anamnese)
    const systemPrompt = `Você é um médico especializado em análise de exames laboratoriais e de imagem.
Sua função é analisar APENAS os exames fornecidos e fornecer:
1. Um resumo executivo dos achados principais
2. Lista de achados relevantes encontrados nos exames
3. Sugestões de interpretação clínica
4. Recomendações baseadas nos resultados

IMPORTANTE:
- NÃO gere anamnese, pois não há transcrição de consulta
- Foque APENAS na análise dos exames fornecidos
- Identifique valores alterados, achados anormais, padrões relevantes
- Forneça interpretação clínica objetiva
- Sugira próximos passos ou exames complementares se necessário
- Use linguagem médica profissional em português brasileiro
- Retorne APENAS um JSON válido, sem texto adicional

Formato JSON esperado:
{
  "resumo": "Resumo executivo dos achados principais dos exames analisados",
  "achados": [
    "Achado 1: descrição detalhada",
    "Achado 2: descrição detalhada"
  ],
  "sugestoes": [
    "Sugestão 1 de interpretação ou ação",
    "Sugestão 2 de interpretação ou ação"
  ],
  "recomendacoes": [
    "Recomendação 1 baseada nos achados",
    "Recomendação 2 baseada nos achados"
  ]
}`;

    // Preparar conteúdo com imagens
    const userContent: any[] = [
      {
        type: "text",
        text: `Analise os seguintes exames médicos e forneça uma análise detalhada focada APENAS nos achados dos exames.

Exames para análise:
${imageNames.map((name, idx) => `${idx + 1}. ${name}`).join('\n')}

Analise cada exame cuidadosamente e identifique:
- Valores, parâmetros e resultados
- Achados anormais ou alterados
- Padrões relevantes
- Interpretação clínica

Retorne APENAS o JSON no formato especificado, sem comentários ou texto adicional.`
      }
    ];

    // Adicionar imagens
    for (let i = 0; i < imageUrls.length; i++) {
      userContent.push({
        type: "image_url",
        image_url: {
          url: imageUrls[i]
        }
      });
    }

    // Chamar OpenAI
    const completion = await withRetry(() => openai.chat.completions.create({
      model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ],
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 2000,
    }));

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("Resposta vazia da OpenAI");
    }

    let analise: {
      resumo: string;
      achados: string[];
      sugestoes: string[];
      recomendacoes: string[];
    };

    try {
      analise = JSON.parse(responseContent);
    } catch (parseError) {
      console.error("Erro ao fazer parse da resposta OpenAI:", parseError);
      console.error("Resposta recebida:", responseContent);
      throw new Error("Resposta da OpenAI em formato inválido");
    }

    // Validar estrutura
    const resultado = {
      resumo: analise.resumo || "Análise dos exames concluída.",
      achados: Array.isArray(analise.achados) ? analise.achados : [],
      sugestoes: Array.isArray(analise.sugestoes) ? analise.sugestoes : [],
      recomendacoes: Array.isArray(analise.recomendacoes) ? analise.recomendacoes : [],
    };

    if (clinicaId) {
      await consumeTokens(clinicaId, "analisar-exames", completion.usage?.total_tokens);
    }

    return NextResponse.json({
      success: true,
      analise: resultado,
    });
  } catch (error: any) {
    console.error("Erro ao analisar exames:", error);
    return NextResponse.json(
      {
        error: error.message || "Erro ao analisar exames com IA",
      },
      { status: 500 }
    );
  }
}

