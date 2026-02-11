import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';
import { getSignedUrlFromS3 } from '@/lib/s3-service';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface MedicalAnalysis {
  anamnese: string;
  cidCodes: Array<{
    code: string;
    description: string;
    score: number;
  }>;
  exames: Array<{
    nome: string;
    tipo: string;
    justificativa: string;
  }>;
  prescricoes: Array<{
    medicamento: string;
    dosagem: string;
    posologia: string;
    duracao: string;
    justificativa?: string;
  }>;
  entities: Array<{
    text: string;
    category: string;
    type: string;
    score: number;
  }>;
}

/**
 * Processa a transcrição usando OpenAI GPT
 * e gera anamnese, CID e exames sugeridos
 * Suporta análise de imagens e PDFs de exames
 */
export async function processTranscriptionWithOpenAI(
  transcriptionText: string,
  examesIds: string[] = []
): Promise<MedicalAnalysis> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "Credenciais OpenAI não configuradas. Configure OPENAI_API_KEY no .env"
    );
  }

  try {
    const systemPrompt = `Você é um assistente médico especializado em análise de consultas médicas. 
Sua função é analisar transcrições de consultas e gerar:
1. Uma anamnese completa, estruturada e profissional em português brasileiro
2. Códigos CID-10 sugeridos (máximo 5) com scores de confiança entre 0 e 1
3. Exames sugeridos com justificativas clínicas
4. Prescrições médicas sugeridas com medicamentos, dosagens, posologias e durações

IMPORTANTE:
- A anamnese deve seguir o formato médico padrão brasileiro
- Use títulos em MAIÚSCULAS seguidos de dois pontos (:) para seções principais
- Exemplos de títulos: "ANAMNESE", "QUEIXA PRINCIPAL", "HISTÓRICO DA DOENÇA ATUAL", "ANTECEDENTES PESSOAIS", "MEDICAÇÕES EM USO", "EXAMES REALIZADOS", "EXAME FÍSICO"
- Os códigos CID-10 devem ser válidos e específicos
- Os exames devem ser clinicamente relevantes
- As prescrições devem incluir medicamentos apropriados para o diagnóstico, com dosagens e posologias corretas
- Para prescrições: use nomes comerciais ou genéricos comuns no Brasil, dosagem em formato padrão (ex: "500mg", "10ml"), posologia clara (ex: "1 comprimido de 8/8h", "1 gota 2x ao dia"), e duração do tratamento (ex: "7 dias", "15 dias", "30 dias")
- Retorne APENAS um JSON válido, sem texto adicional

Formato JSON esperado:
{
  "anamnese": "ANAMNESE\\n\\nQUEIXA PRINCIPAL:\\n...\\n\\nHISTÓRICO DA DOENÇA ATUAL:\\n...\\n\\nANTECEDENTES PESSOAIS:\\n...\\n\\nMEDICAÇÕES EM USO:\\n...\\n\\nEXAMES REALIZADOS:\\n...",
  "cidCodes": [
    {"code": "I10", "description": "Hipertensão essencial (primária)", "score": 0.9}
  ],
  "exames": [
    {"nome": "Hemograma completo", "tipo": "Laboratorial", "justificativa": "Avaliação geral e rastreamento de infecções"}
  ],
  "prescricoes": [
    {"medicamento": "Amoxicilina", "dosagem": "500mg", "posologia": "1 comprimido de 8/8h", "duracao": "7 dias", "justificativa": "Tratamento de infecção bacteriana"}
  ],
  "entities": []
}`;

    // Preparar mensagens com exames se fornecidos
    const messages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    // Se houver exames selecionados, buscar e processar
    let examesContext = "";
    if (examesIds && examesIds.length > 0) {
      try {
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

        if (exames.length > 0) {
          examesContext = "\n\nEXAMES ANEXADOS PARA ANÁLISE:\n";
          
          // Para imagens, usar Vision API
          const imageUrls: string[] = [];
          const imageNames: string[] = [];
          
          for (const exame of exames) {
            if (exame.s3Key) {
              try {
                const signedUrl = await getSignedUrlFromS3(exame.s3Key, 3600);
                if (exame.tipoDocumento === "exame-imagem") {
                  imageUrls.push(signedUrl);
                  imageNames.push(exame.nomeDocumento);
                } else if (exame.tipoDocumento === "exame-pdf") {
                  // Para PDFs, adicionar ao contexto como referência
                  examesContext += `- ${exame.nomeDocumento} (PDF)\n`;
                }
              } catch (error) {
                console.error(`Erro ao obter URL do exame ${exame.id}:`, error);
              }
            }
          }

          // Se houver imagens, usar modelo com visão
          if (imageUrls.length > 0) {
            const userContent: any[] = [
              {
                type: "text",
                text: `Analise a seguinte transcrição de consulta médica${examesContext ? ` e os exames anexados` : ""} e gere a anamnese estruturada, códigos CID-10, exames sugeridos e prescrições médicas.

Transcrição da consulta:
${transcriptionText}
${examesContext}

IMPORTANTE: Analise as imagens dos exames anexados e incorpore os achados relevantes na anamnese, nos códigos CID sugeridos e nas prescrições médicas.

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

            messages.push({
              role: "user",
              content: userContent
            });

            // Usar modelo com visão (gpt-4o ou gpt-4o-mini com visão)
            const completion = await openai.chat.completions.create({
              model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
              messages,
              response_format: { type: "json_object" },
              temperature: 0.3,
              max_tokens: 2000,
            });

            const responseContent = completion.choices[0]?.message?.content;
            if (!responseContent) {
              throw new Error("Resposta vazia da OpenAI");
            }

            let analysis: MedicalAnalysis;
            try {
              analysis = JSON.parse(responseContent);
            } catch (parseError) {
              console.error("Erro ao fazer parse da resposta OpenAI:", parseError);
              console.error("Resposta recebida:", responseContent);
              throw new Error("Resposta da OpenAI em formato inválido");
            }

            // Validar e garantir estrutura correta
            const validatedAnalysis: MedicalAnalysis = {
              anamnese: analysis.anamnese || "Anamnese não gerada pela IA",
              cidCodes: (analysis.cidCodes || []).map((cid: any) => ({
                code: cid.code || "",
                description: cid.description || "",
                score: typeof cid.score === 'number' ? Math.max(0, Math.min(1, cid.score)) : 0.7,
              })).filter((cid: any) => cid.code && cid.description).slice(0, 5),
              exames: (analysis.exames || []).map((exame: any) => ({
                nome: exame.nome || "",
                tipo: exame.tipo || "Laboratorial",
                justificativa: exame.justificativa || "",
              })).filter((exame: any) => exame.nome).slice(0, 10),
              prescricoes: (analysis.prescricoes || []).map((presc: any) => ({
                medicamento: presc.medicamento || "",
                dosagem: presc.dosagem || "",
                posologia: presc.posologia || "",
                duracao: presc.duracao || "",
                justificativa: presc.justificativa || "",
              })).filter((presc: any) => presc.medicamento).slice(0, 10),
              entities: analysis.entities || [],
            };

            console.log("=== RESULTADO OPENAI (COM IMAGENS) ===");
            console.log("Anamnese gerada:", validatedAnalysis.anamnese?.substring(0, 100));
            console.log("Total de CIDs:", validatedAnalysis.cidCodes.length);
            console.log("Total de exames:", validatedAnalysis.exames.length);
            console.log("Total de prescrições:", validatedAnalysis.prescricoes.length);
            console.log("=========================");

            return validatedAnalysis;
          }
        }
      } catch (error) {
        console.error("Erro ao processar exames:", error);
        // Continuar sem os exames se houver erro
      }
    }

    // Processamento padrão (sem imagens ou se não houver imagens)
    const userPrompt = `Analise a seguinte transcrição de consulta médica${examesContext ? ` e os exames anexados` : ""} e gere a anamnese estruturada, códigos CID-10, exames sugeridos e prescrições médicas.

Transcrição da consulta:
${transcriptionText}
${examesContext}

Retorne APENAS o JSON no formato especificado, sem comentários ou texto adicional.`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Mais determinístico para dados médicos
      max_tokens: 2000,
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("Resposta vazia da OpenAI");
    }

    // Tentar fazer parse do JSON
    let analysis: MedicalAnalysis;
    try {
      analysis = JSON.parse(responseContent);
    } catch (parseError) {
      console.error("Erro ao fazer parse da resposta OpenAI:", parseError);
      console.error("Resposta recebida:", responseContent);
      throw new Error("Resposta da OpenAI em formato inválido");
    }

    // Validar e garantir estrutura correta
    const validatedAnalysis: MedicalAnalysis = {
      anamnese: analysis.anamnese || "Anamnese não gerada pela IA",
      cidCodes: (analysis.cidCodes || []).map((cid: any) => ({
        code: cid.code || "",
        description: cid.description || "",
        score: typeof cid.score === 'number' ? Math.max(0, Math.min(1, cid.score)) : 0.7,
      })).filter((cid: any) => cid.code && cid.description).slice(0, 5),
      exames: (analysis.exames || []).map((exame: any) => ({
        nome: exame.nome || "",
        tipo: exame.tipo || "Laboratorial",
        justificativa: exame.justificativa || "",
      })).filter((exame: any) => exame.nome).slice(0, 10),
      prescricoes: (analysis.prescricoes || []).map((presc: any) => ({
        medicamento: presc.medicamento || "",
        dosagem: presc.dosagem || "",
        posologia: presc.posologia || "",
        duracao: presc.duracao || "",
        justificativa: presc.justificativa || "",
      })).filter((presc: any) => presc.medicamento).slice(0, 10),
      entities: analysis.entities || [],
    };

    console.log("=== RESULTADO OPENAI ===");
    console.log("Anamnese gerada:", validatedAnalysis.anamnese?.substring(0, 100));
    console.log("Total de CIDs:", validatedAnalysis.cidCodes.length);
    console.log("Total de exames:", validatedAnalysis.exames.length);
    console.log("Total de prescrições:", validatedAnalysis.prescricoes.length);
    console.log("=========================");

    return validatedAnalysis;
  } catch (error: any) {
    console.error("Erro ao processar com OpenAI:", error);
    
    // Tratamento específico para erros de API
    if (error.status === 401) {
      throw new Error("Credenciais OpenAI inválidas. Verifique OPENAI_API_KEY");
    }
    if (error.status === 429) {
      throw new Error("Limite de requisições da OpenAI excedido. Tente novamente mais tarde");
    }
    if (error.status === 500) {
      throw new Error("Erro interno da OpenAI. Tente novamente");
    }
    
    throw new Error(
      error.message || "Erro ao processar transcrição com OpenAI"
    );
  }
}
