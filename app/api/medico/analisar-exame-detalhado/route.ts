import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { getSignedUrlFromS3, getObjectBufferFromS3 } from "@/lib/s3-service";
import { checkTokens, consumeTokens } from "@/lib/token-usage";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    // @ts-expect-error — pdf-parse has no type declarations
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
    const result = await pdfParse(buffer);
    return result.text || "";
  } catch (err) {
    console.error("[extractTextFromPdf] Erro:", err);
    return "";
  }
}

/**
 * Retry com backoff exponencial para erros transientes da OpenAI.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isTransient =
        error.status === 429 || error.status === 500 || error.status === 503;
      if (isTransient && attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(
          `OpenAI erro ${error.status}, tentativa ${attempt}/${retries}. Aguardando ${delay}ms...`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}

const SYSTEM_PROMPT = `Você é um assistente de análise de exames médicos. Sua função é auxiliar o médico identificando pontos de atenção nos exames, SEM NUNCA fornecer diagnósticos.

⚠️ REGRAS CRÍTICAS:
- NUNCA forneça diagnóstico
- NUNCA conclua condições médicas
- Use linguagem como: "possível alteração", "requer atenção", "sugere revisão"
- Seja conservador e técnico
- Se houver incerteza, explicite

## TAREFA

Analise o documento fornecido (imagem ou PDF) e:

### DETECÇÃO DE ANOMALIAS
- Liste SOMENTE parâmetros que estão FORA do intervalo de referência (valor < mínimo OU valor > máximo)
- NUNCA liste valores que estão DENTRO da faixa de referência, mesmo que estejam próximos ao limite
- Exemplo: se referência é 11,5 a 15% e o valor é 13,6 — NÃO liste, pois 13,6 está dentro de 11,5-15%
- Exemplo: se referência é 4,5 a 6,0 e o valor é 6,12 — LISTE, pois 6,12 > 6,0
- Para imagens médicas, identifique padrões visuais suspeitos (ex: opacidades, descontinuidades ósseas, assimetrias)

### ANOTAÇÃO VISUAL
Para cada item relevante, gere uma anotação com:
- tipo: ("lab_value" | "anatomical_region" | "suspected_anomaly")
- descrição: breve explicação técnica
- nível de atenção: ("moderado" | "alto") — NÃO use "baixo", pois se está fora da faixa merece pelo menos atenção moderada
- bounding_box: SEMPRE null — não gere coordenadas de bounding box
- sugestão_visual: "rectangle"

### CONTEXTO CLÍNICO (SEM DIAGNÓSTICO)
- Explique por que aquilo merece atenção
- Relacione com possíveis implicações (sem afirmar nada)

## FORMATO DE RESPOSTA (JSON obrigatório)

{
  "summary": "Resumo geral do exame em linguagem técnica",
  "findings": [
    {
      "type": "lab_value",
      "label": "Nome do parâmetro",
      "value": "valor encontrado",
      "reference_range": "faixa de referência",
      "attention_level": "baixo" | "moderado" | "alto",
      "description": "Descrição técnica do achado",
      "clinical_note": "Nota clínica SEM diagnóstico — apenas implicações possíveis",
      "bounding_box": { "x": 0.0, "y": 0.0, "width": 0.0, "height": 0.0 },
      "visual_hint": "rectangle"
    }
  ],
  "image_annotations": [
    {
      "type": "anatomical_region" | "suspected_anomaly",
      "label": "Descrição da região",
      "attention_level": "baixo" | "moderado" | "alto",
      "description": "Descrição técnica",
      "clinical_note": "Nota clínica SEM diagnóstico",
      "bounding_box": { "x": 0.0, "y": 0.0, "width": 0.0, "height": 0.0 },
      "visual_hint": "circle" | "arrow" | "rectangle"
    }
  ],
  "disclaimer": "Esta análise é apenas auxiliar e não substitui avaliação médica profissional."
}

IMPORTANTE:
- Para exames laboratoriais (hemograma, bioquímica, etc.), use "findings" — NÃO gere bounding_box (defina como null), pois as posições em tabelas são imprecisas
- Para exames de imagem (raio-X, tomografia, ultrassom, etc.), use "image_annotations" COM bounding_box precisos sobre regiões anatômicas
- REGRA FUNDAMENTAL: só inclua em findings valores que estão MATEMATICAMENTE fora da faixa de referência. Se valor >= mínimo E valor <= máximo, NÃO inclua
- Se nenhum valor estiver fora da faixa, retorne findings como array vazio [] e coloque no summary que todos os valores estão dentro da normalidade
- Se não conseguir identificar valores ou regiões específicas, retorne arrays vazios mas SEMPRE preencha o "summary"
- Retorne APENAS o JSON válido, sem texto adicional`;

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { exameId } = body;

    if (!exameId || typeof exameId !== "string") {
      return NextResponse.json(
        { error: "ID do exame é obrigatório" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Credenciais OpenAI não configuradas" },
        { status: 500 }
      );
    }

    const clinicaId = session.user.clinicaId;
    if (clinicaId) {
      const tokenCheck = await checkTokens(clinicaId);
      if (!tokenCheck.allowed) {
        return NextResponse.json(
          {
            error:
              "Limite de tokens de IA atingido para este mês. Entre em contato com o administrador da clínica.",
          },
          { status: 429 }
        );
      }
    }

    // Buscar exame no banco
    const exame = await prisma.documentoGerado.findFirst({
      where: {
        id: exameId,
        tipoDocumento: { in: ["exame-imagem", "exame-pdf"] },
      },
      select: {
        id: true,
        nomeDocumento: true,
        tipoDocumento: true,
        s3Key: true,
      },
    });

    if (!exame || !exame.s3Key) {
      return NextResponse.json(
        { error: "Exame não encontrado" },
        { status: 404 }
      );
    }

    // Preparar conteúdo para a OpenAI
    const userContent: any[] = [
      {
        type: "text",
        text: `Analise o seguinte exame médico: "${exame.nomeDocumento}"\n\nIdentifique todos os pontos de atenção, valores alterados e regiões de interesse. Gere bounding boxes precisos para cada achado.\n\nRetorne APENAS o JSON no formato especificado.`,
      },
    ];

    let model = process.env.OPENAI_VISION_MODEL || "gpt-4o";

    if (exame.tipoDocumento === "exame-imagem") {
      // Para imagens, enviar via Vision API
      const signedUrl = await getSignedUrlFromS3(exame.s3Key, 3600);
      userContent.push({
        type: "image_url",
        image_url: { url: signedUrl },
      });
    } else if (exame.tipoDocumento === "exame-pdf") {
      // Para PDFs, extrair texto e/ou enviar como contexto
      const buffer = await getObjectBufferFromS3(exame.s3Key);
      let pdfText = await extractTextFromPdf(buffer);
      pdfText = pdfText
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
        .replace(/\s{3,}/g, "  ")
        .trim();

      if (pdfText.length > 8000) {
        pdfText = pdfText.substring(0, 8000) + "\n[...texto truncado]";
      }

      if (pdfText.length > 30) {
        userContent[0] = {
          type: "text",
          text: `Analise o seguinte exame médico: "${exame.nomeDocumento}"\n\nConteúdo extraído do PDF:\n${pdfText}\n\nIdentifique todos os pontos de atenção, valores alterados e regiões de interesse. Para exames em texto/PDF, os bounding_box devem indicar posições aproximadas de onde os valores estariam no documento original (use estimativas baseadas na ordem do texto).\n\nRetorne APENAS o JSON no formato especificado.`,
        };
        // Usar modelo sem visão para texto puro
        model = process.env.OPENAI_MODEL || "gpt-4o";
      } else {
        // PDF escaneado sem texto — tentar como imagem se possível
        userContent[0] = {
          type: "text",
          text: `Analise o seguinte exame médico: "${exame.nomeDocumento}"\n\nEste é um PDF escaneado sem texto extraível. Analise com base no nome do exame. Se possível, identifique pontos de atenção.\n\nRetorne APENAS o JSON no formato especificado.`,
        };
      }
    }

    const completion = await withRetry(() =>
      openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 4000,
      })
    );

    const responseContent = completion.choices[0]?.message?.content;
    const refusal = completion.choices[0]?.message?.refusal;

    if (refusal) {
      console.warn("[analisar-exame-detalhado] OpenAI recusou:", refusal);
      return NextResponse.json({
        success: true,
        analise: {
          summary:
            "A IA não conseguiu analisar este exame devido a restrições de conteúdo. O médico deve realizar a análise manualmente.",
          findings: [],
          image_annotations: [],
          disclaimer:
            "Esta análise é apenas auxiliar e não substitui avaliação médica profissional.",
        },
      });
    }

    if (!responseContent) {
      throw new Error("Resposta vazia da OpenAI");
    }

    let analise: any;
    try {
      analise = JSON.parse(responseContent);
    } catch {
      console.error(
        "[analisar-exame-detalhado] JSON inválido:",
        responseContent?.substring(0, 200)
      );
      throw new Error("Resposta da OpenAI em formato inválido");
    }

    // Validar e normalizar a estrutura
    const resultado = {
      summary:
        typeof analise.summary === "string"
          ? analise.summary
          : "Análise do exame concluída.",
      findings: Array.isArray(analise.findings)
        ? analise.findings.map((f: any) => ({
            type: f.type || "lab_value",
            label: f.label || "",
            value: f.value || "",
            reference_range: f.reference_range || "",
            attention_level: ["baixo", "moderado", "alto"].includes(
              f.attention_level
            )
              ? f.attention_level
              : "baixo",
            description: f.description || "",
            clinical_note: f.clinical_note || "",
            bounding_box:
              f.bounding_box &&
              typeof f.bounding_box.x === "number" &&
              typeof f.bounding_box.y === "number"
                ? {
                    x: Math.max(0, Math.min(1, f.bounding_box.x)),
                    y: Math.max(0, Math.min(1, f.bounding_box.y)),
                    width: Math.max(
                      0,
                      Math.min(1, f.bounding_box.width || 0.1)
                    ),
                    height: Math.max(
                      0,
                      Math.min(1, f.bounding_box.height || 0.05)
                    ),
                  }
                : null,
            visual_hint: ["circle", "arrow", "rectangle"].includes(
              f.visual_hint
            )
              ? f.visual_hint
              : "rectangle",
          }))
        : [],
      image_annotations: Array.isArray(analise.image_annotations)
        ? analise.image_annotations.map((a: any) => ({
            type: a.type || "anatomical_region",
            label: a.label || "",
            attention_level: ["baixo", "moderado", "alto"].includes(
              a.attention_level
            )
              ? a.attention_level
              : "baixo",
            description: a.description || "",
            clinical_note: a.clinical_note || "",
            bounding_box:
              a.bounding_box &&
              typeof a.bounding_box.x === "number" &&
              typeof a.bounding_box.y === "number"
                ? {
                    x: Math.max(0, Math.min(1, a.bounding_box.x)),
                    y: Math.max(0, Math.min(1, a.bounding_box.y)),
                    width: Math.max(
                      0,
                      Math.min(1, a.bounding_box.width || 0.1)
                    ),
                    height: Math.max(
                      0,
                      Math.min(1, a.bounding_box.height || 0.1)
                    ),
                  }
                : null,
            visual_hint: ["circle", "arrow", "rectangle"].includes(
              a.visual_hint
            )
              ? a.visual_hint
              : "circle",
          }))
        : [],
      disclaimer:
        analise.disclaimer ||
        "Esta análise é apenas auxiliar e não substitui avaliação médica profissional.",
    };

    if (clinicaId) {
      await consumeTokens(
        clinicaId,
        "analisar-exame-detalhado",
        completion.usage?.total_tokens
      );
    }

    return NextResponse.json({
      success: true,
      analise: resultado,
    });
  } catch (error: any) {
    console.error("Erro ao analisar exame detalhado:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao analisar exame com IA" },
      { status: 500 }
    );
  }
}
