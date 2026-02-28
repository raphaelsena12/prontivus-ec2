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
  protocolos: Array<{
    nome: string;
    descricao: string;
    justificativa?: string;
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
    const systemPrompt = `Você é um assistente médico especializado em análise de consultas médicas, com conhecimento atualizado das diretrizes clínicas brasileiras e internacionais (PCDT/CONITEC, CFM, SBC, SBD, SBPT, UpToDate, Dynamed).

Sua função é analisar transcrições de consultas e gerar:
1. Uma anamnese completa, estruturada e profissional em português brasileiro
2. Códigos CID-10 sugeridos com scores de confiança entre 0 e 1 (apenas inclua códigos com score acima de 0.5)
3. Com base nos CIDs identificados, consulte os protocolos de tratamento mais atuais para cada condição e use-os para derivar as sugestões de exames e prescrições
4. Exames complementares indicados pelo protocolo atual de cada CID identificado, com justificativa clínica
5. Prescrições médicas baseadas nos protocolos vigentes para os CIDs identificados, com medicamentos de primeira linha conforme as diretrizes

IMPORTANTE — ANAMNESE:
- O formato deve ser EXATAMENTE nesta ordem (começando direto na QUEIXA PRINCIPAL, SEM o tópico "ANAMNESE:"):
  1. "QUEIXA PRINCIPAL:" - Motivo da consulta, preferencialmente nas palavras do paciente, curta e objetiva (2-3 palavras)
  2. "HISTÓRIA DA DOENÇA ATUAL:" - início, evolução, localização, intensidade, características, fatores de melhora/piora, sintomas associados, tratamentos prévios, impacto funcional
  3. "ANTECEDENTES PESSOAIS PATOLÓGICOS:" - Doenças prévias, internações, cirurgias, traumas, alergias, transfusões, vacinação, uso crônico de medicamentos
  4. "ANTECEDENTES FAMILIARES:" - Doenças hereditárias, neoplasias, cardiopatias, hepatopatias, doenças autoimunes
  5. "HÁBITOS DE VIDA / HISTÓRIA SOCIAL:" - Tabagismo, etilismo, drogas ilícitas, alimentação, atividade física, sono, ocupação e exposição ocupacional
  6. "MEDICAMENTOS EM USO ATUAL:" - Nome, dose, frequência, tempo de uso
  7. "EXAMES FÍSICOS:" - Achados do exame físico realizado na consulta (inspeção, palpação, percussão, ausculta, sinais vitais, etc.)
- Use títulos em MAIÚSCULAS seguidos de dois pontos (:) para seções principais
- Se alguma seção não for mencionada na transcrição, exiba o título seguido de "N/A"
- A seção "EXAMES REALIZADOS" deve conter APENAS exames que o paciente mencionou que JÁ realizou. NÃO inclua sugestões futuras nesta seção.

IMPORTANTE — EXAMES E PRESCRIÇÕES (baseados em protocolos por CID):
- Para cada CID identificado, aplique o protocolo de tratamento mais recente disponível (ex: CID I10 → protocolo SBC 2024 de hipertensão arterial; CID E11 → diretriz SBD 2024 de diabetes; etc.)
- Sugira os exames preconizados pelas diretrizes vigentes para avaliação inicial ou seguimento da condição
- Prescreva medicamentos de primeira linha conforme as diretrizes, com dosagens e posologias corretas
- Use nomes genéricos ou comerciais comuns no Brasil
- Formato de dosagem: "500mg", "10ml"; posologia: "1 comprimido de 8/8h", "1 gota 2x ao dia"; duração: "7 dias", "30 dias", "uso contínuo"
- Verifique alergias e interações medicamentosas antes de sugerir prescrições
- Retorne APENAS um JSON válido, sem texto adicional

Formato JSON esperado:
{
  "anamnese": "QUEIXA PRINCIPAL:\\n[resumo de 2 a 3 palavras]\\n\\nHISTÓRIA DA DOENÇA ATUAL:\\n...\\n\\nANTECEDENTES PESSOAIS PATOLÓGICOS:\\n...\\n\\nANTECEDENTES FAMILIARES:\\n...\\n\\nHÁBITOS DE VIDA / HISTÓRIA SOCIAL:\\n...\\n\\nMEDICAMENTOS EM USO ATUAL:\\n...\\n\\nEXAMES FÍSICOS:\\n...",
  "cidCodes": [
    {"code": "I10", "description": "Hipertensão essencial (primária)", "score": 0.9}
  ],
  "protocolos": [
    {"nome": "Diretriz SBC 2024 — Hipertensão Arterial", "descricao": "Meta pressórica <130/80 mmHg; início com IECA/BRA + diurético tiazídico ou bloqueador de canal de cálcio", "justificativa": "CID I10 — protocolo de primeira linha SBC 2024"}
  ],
  "exames": [
    {"nome": "Creatinina sérica e TFG estimada", "tipo": "Laboratorial", "justificativa": "Avaliação de lesão de órgão-alvo renal — protocolo SBC 2024 para hipertensão arterial"}
  ],
  "prescricoes": [
    {"medicamento": "Losartana potássica", "dosagem": "50mg", "posologia": "1 comprimido 1x ao dia", "duracao": "uso contínuo", "justificativa": "BRA de primeira linha para hipertensão — Diretriz SBC 2024"}
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

IMPORTANTE: 
- Analise as imagens dos exames anexados e incorpore os achados relevantes na anamnese, nos códigos CID sugeridos e nas prescrições médicas.
- Na seção "EXAMES REALIZADOS" da anamnese, inclua APENAS exames que o paciente mencionou que JÁ realizou. NÃO inclua sugestões de exames futuros.
- Se o paciente mencionou exames anexados ou que já fez, liste-os na seção "EXAMES REALIZADOS".

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
              })).filter((cid: any) => cid.code && cid.description && cid.score > 0.5),
              protocolos: (analysis.protocolos || []).map((p: any) => ({
                nome: p.nome || "",
                descricao: p.descricao || "",
                justificativa: p.justificativa || "",
              })).filter((p: any) => p.nome),
              exames: (analysis.exames || []).map((exame: any) => ({
                nome: exame.nome || "",
                tipo: exame.tipo || "Laboratorial",
                justificativa: exame.justificativa || "",
              })).filter((exame: any) => exame.nome),
              prescricoes: (analysis.prescricoes || []).map((presc: any) => ({
                medicamento: presc.medicamento || "",
                dosagem: presc.dosagem || "",
                posologia: presc.posologia || "",
                duracao: presc.duracao || "",
                justificativa: presc.justificativa || "",
              })).filter((presc: any) => presc.medicamento),
              entities: analysis.entities || [],
            };

            console.log("=== RESULTADO OPENAI (COM IMAGENS) ===");
            console.log("Anamnese gerada:", validatedAnalysis.anamnese?.substring(0, 100));
            console.log("Total de CIDs:", validatedAnalysis.cidCodes.length);
            console.log("Total de protocolos:", validatedAnalysis.protocolos.length);
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

IMPORTANTE:
- O formato da anamnese deve seguir EXATAMENTE a ordem começando direto em "QUEIXA PRINCIPAL:" (SEM o tópico "ANAMNESE:"), depois "HISTÓRIA DA DOENÇA ATUAL:", "ANTECEDENTES PESSOAIS PATOLÓGICOS:", "ANTECEDENTES FAMILIARES:", "HÁBITOS DE VIDA / HISTÓRIA SOCIAL:", "MEDICAMENTOS EM USO ATUAL:", e "EXAMES FÍSICOS:". Se alguma seção não for mencionada, exiba o título seguido de "N/A".
- Na seção "EXAMES REALIZADOS" da anamnese, inclua APENAS exames que o paciente mencionou que JÁ realizou na transcrição. NÃO inclua sugestões de exames futuros.
- Se o paciente não mencionou nenhum exame realizado, deixe a seção "EXAMES REALIZADOS" vazia ou omita-a.
- Os exames sugeridos (no array "exames" do JSON) são para serem solicitados no futuro, não para a seção "EXAMES REALIZADOS".

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
      })).filter((cid: any) => cid.code && cid.description && cid.score > 0.5),
      protocolos: (analysis.protocolos || []).map((p: any) => ({
        nome: p.nome || "",
        descricao: p.descricao || "",
        justificativa: p.justificativa || "",
      })).filter((p: any) => p.nome),
      exames: (analysis.exames || []).map((exame: any) => ({
        nome: exame.nome || "",
        tipo: exame.tipo || "Laboratorial",
        justificativa: exame.justificativa || "",
      })).filter((exame: any) => exame.nome),
      prescricoes: (analysis.prescricoes || []).map((presc: any) => ({
        medicamento: presc.medicamento || "",
        dosagem: presc.dosagem || "",
        posologia: presc.posologia || "",
        duracao: presc.duracao || "",
        justificativa: presc.justificativa || "",
      })).filter((presc: any) => presc.medicamento),
      entities: analysis.entities || [],
    };

    console.log("=== RESULTADO OPENAI ===");
    console.log("Anamnese gerada:", validatedAnalysis.anamnese?.substring(0, 100));
    console.log("Total de CIDs:", validatedAnalysis.cidCodes.length);
    console.log("Total de protocolos:", validatedAnalysis.protocolos.length);
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

/**
 * Fase 1 — Gera APENAS a anamnese estruturada a partir da transcrição.
 * Não gera CID, exames nem prescrições.
 */
export async function generateAnamneseOnly(transcriptionText: string): Promise<{ anamnese: string }> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Credenciais OpenAI não configuradas. Configure OPENAI_API_KEY no .env");
  }

  const systemPrompt = `Você é um assistente médico especializado em registros clínicos.
Sua função é estruturar a transcrição de uma consulta em uma anamnese médica completa e profissional em português brasileiro.

A anamnese deve seguir EXATAMENTE esta ordem de seções (títulos em MAIÚSCULAS com dois pontos), começando direto na QUEIXA PRINCIPAL (SEM o tópico "ANAMNESE:"):
1. QUEIXA PRINCIPAL: — motivo da consulta em 2-3 palavras nas palavras do paciente
2. HISTÓRIA DA DOENÇA ATUAL: — início, evolução, localização, intensidade, fatores de melhora/piora, sintomas associados
3. ANTECEDENTES PESSOAIS PATOLÓGICOS: — doenças prévias, internações, cirurgias, alergias, medicamentos crônicos
4. ANTECEDENTES FAMILIARES: — doenças hereditárias relevantes
5. HÁBITOS DE VIDA / HISTÓRIA SOCIAL: — tabagismo, etilismo, atividade física, ocupação
6. MEDICAMENTOS EM USO ATUAL: — nome, dose, frequência
7. EXAMES FÍSICOS: — achados do exame físico realizado na consulta (inspeção, palpação, percussão, ausculta, sinais vitais, etc.)

Se alguma seção não for mencionada na transcrição, escreva o título seguido de "N/A".
Retorne APENAS um JSON com o campo "anamnese".`;

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Estruture a seguinte transcrição em anamnese médica:\n\n${transcriptionText}\n\nRetorne APENAS o JSON: {"anamnese": "..."}` },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 2000,
  });

  const responseContent = completion.choices[0]?.message?.content;
  if (!responseContent) throw new Error("Resposta vazia da OpenAI");

  try {
    const data = JSON.parse(responseContent);
    return { anamnese: data.anamnese || "Anamnese não gerada pela IA" };
  } catch {
    throw new Error("Resposta da OpenAI em formato inválido");
  }
}

export interface SuggestionsContext {
  anamnese: string;
  alergias?: string[];
  medicamentosEmUso?: string[];
  examesIds?: string[];
}

export interface MedicalSuggestions {
  cidCodes: MedicalAnalysis["cidCodes"];
  protocolos: MedicalAnalysis["protocolos"];
  exames: MedicalAnalysis["exames"];
  prescricoes: MedicalAnalysis["prescricoes"];
}

/**
 * Fase 2 — Gera sugestões clínicas (CID, exames e prescrições) a partir
 * da anamnese já confirmada e do contexto selecionado pelo médico.
 */
export async function generateMedicalSuggestions(context: SuggestionsContext): Promise<MedicalSuggestions> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Credenciais OpenAI não configuradas. Configure OPENAI_API_KEY no .env");
  }

  let contextText = `ANAMNESE DA CONSULTA:\n${context.anamnese}`;

  if (context.alergias && context.alergias.length > 0) {
    contextText += `\n\nALERGIAS DO PACIENTE:\n${context.alergias.join(", ")}`;
  }

  if (context.medicamentosEmUso && context.medicamentosEmUso.length > 0) {
    contextText += `\n\nMEDICAMENTOS EM USO:\n${context.medicamentosEmUso.join(", ")}`;
  }

  // Buscar dados dos exames se fornecidos
  if (context.examesIds && context.examesIds.length > 0) {
    try {
      const exames = await prisma.documentoGerado.findMany({
        where: { id: { in: context.examesIds } },
        select: { id: true, nomeDocumento: true, tipoDocumento: true },
      });
      if (exames.length > 0) {
        contextText += `\n\nEXAMES ANEXADOS:\n${exames.map((e) => `- ${e.nomeDocumento}`).join("\n")}`;
      }
    } catch (error) {
      console.error("Erro ao buscar exames para sugestões:", error);
    }
  }

  const systemPrompt = `Você é um assistente médico especializado em diagnóstico clínico, com conhecimento atualizado das diretrizes brasileiras e internacionais (PCDT/CONITEC, CFM, SBC, SBD, SBPT, UpToDate, Dynamed).

Com base na anamnese e no contexto clínico fornecido, siga este raciocínio em etapas:

ETAPA 1 — CID-10:
- Identifique os diagnósticos mais prováveis e atribua códigos CID-10 válidos e específicos com scores de confiança (0 a 1).
- Inclua apenas códigos com score acima de 0.5.

ETAPA 2 — Protocolos vigentes por CID:
- Para cada CID identificado, determine o protocolo de tratamento mais recente e baseado em evidências disponível (ex: Diretriz SBC 2024 para HAS, Diretriz SBD 2024 para DM2, PCDT CONITEC para DPOC, etc.).
- Documente o protocolo com nome, principais recomendações e justificativa clínica.

ETAPA 3 — Exames (baseados nos protocolos):
- Sugira os exames complementares preconizados pelas diretrizes vigentes para cada CID: avaliação inicial, rastreamento de complicações ou monitorização de tratamento.
- Inclua tipo (Laboratorial, Imagem, Funcional) e justificativa referenciando o protocolo.

ETAPA 4 — Prescrições (baseadas nos protocolos):
- Prescreva medicamentos de primeira linha conforme as diretrizes vigentes para cada CID.
- Verifique conflitos com as alergias listadas — NUNCA prescreva medicamento ao qual o paciente é alérgico.
- Verifique interações relevantes com medicamentos em uso atual.
- Use nomes genéricos ou comerciais comuns no Brasil; dosagem em formato padrão (ex: "50mg", "500mg"); posologia clara (ex: "1 comprimido 1x ao dia", "1 cp 8/8h"); duração precisa (ex: "7 dias", "30 dias", "uso contínuo").

Retorne APENAS um JSON válido no seguinte formato:
{
  "cidCodes": [{"code": "I10", "description": "Hipertensão essencial (primária)", "score": 0.9}],
  "protocolos": [{"nome": "Diretriz SBC 2024 — Hipertensão Arterial Sistêmica", "descricao": "Meta <130/80 mmHg; iniciar com IECA/BRA associado a diurético tiazídico ou BCC", "justificativa": "CID I10 — diretriz de primeira linha SBC 2024"}],
  "exames": [{"nome": "Creatinina sérica e TFG estimada", "tipo": "Laboratorial", "justificativa": "Avaliação de lesão de órgão-alvo renal — Diretriz SBC 2024 para HAS"}],
  "prescricoes": [{"medicamento": "Losartana potássica", "dosagem": "50mg", "posologia": "1 comprimido 1x ao dia", "duracao": "uso contínuo", "justificativa": "BRA de primeira linha para HAS — Diretriz SBC 2024"}]
}`;

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: contextText },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 1500,
  });

  const responseContent = completion.choices[0]?.message?.content;
  if (!responseContent) throw new Error("Resposta vazia da OpenAI");

  let data: any;
  try {
    data = JSON.parse(responseContent);
  } catch {
    throw new Error("Resposta da OpenAI em formato inválido");
  }

  return {
    cidCodes: (data.cidCodes || [])
      .map((cid: any) => ({
        code: cid.code || "",
        description: cid.description || "",
        score: typeof cid.score === "number" ? Math.max(0, Math.min(1, cid.score)) : 0.7,
      }))
      .filter((cid: any) => cid.code && cid.description && cid.score > 0.5),
    protocolos: (data.protocolos || [])
      .map((p: any) => ({
        nome: p.nome || "",
        descricao: p.descricao || "",
        justificativa: p.justificativa || "",
      }))
      .filter((p: any) => p.nome),
    exames: (data.exames || [])
      .map((e: any) => ({ nome: e.nome || "", tipo: e.tipo || "Laboratorial", justificativa: e.justificativa || "" }))
      .filter((e: any) => e.nome),
    prescricoes: (data.prescricoes || [])
      .map((p: any) => ({
        medicamento: p.medicamento || "",
        dosagem: p.dosagem || "",
        posologia: p.posologia || "",
        duracao: p.duracao || "",
        justificativa: p.justificativa || "",
      }))
      .filter((p: any) => p.medicamento),
  };
}
