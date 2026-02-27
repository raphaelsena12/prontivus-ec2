import {
  ComprehendMedicalClient,
  DetectEntitiesV2Command,
  InferICD10CMCommand,
  InferRxNormCommand,
} from "@aws-sdk/client-comprehendmedical";

// Configuração do cliente AWS Comprehend Medical
let comprehendClient: ComprehendMedicalClient | null = null;

// Regiões suportadas pelo AWS Comprehend Medical
const SUPPORTED_REGIONS = [
  "us-east-1", // N. Virginia
  "us-west-2", // Oregon
  "eu-west-1", // Ireland
];

export function getComprehendClient(): ComprehendMedicalClient {
  if (!comprehendClient) {
    // Usar região suportada, priorizando us-east-1
    const region = process.env.AWS_REGION || "us-east-1";
    const supportedRegion = SUPPORTED_REGIONS.includes(region)
      ? region
      : "us-east-1"; // Fallback para região suportada

    if (region !== supportedRegion) {
      console.warn(
        `AWS_REGION ${region} não suporta Comprehend Medical. Usando ${supportedRegion}`
      );
    }

    comprehendClient = new ComprehendMedicalClient({
      region: supportedRegion,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
    });
  }
  return comprehendClient;
}

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
  entities: Array<{
    text: string;
    category: string;
    type: string;
    score: number;
  }>;
}

/**
 * Processa a transcrição usando AWS Comprehend Medical
 * e gera anamnese, CID e exames sugeridos
 */
export async function processTranscriptionWithAI(
  transcriptionText: string
): Promise<MedicalAnalysis> {
  // Verificar se as credenciais estão configuradas
  if (
    !process.env.AWS_ACCESS_KEY_ID ||
    !process.env.AWS_SECRET_ACCESS_KEY
  ) {
    throw new Error(
      "Credenciais AWS não configuradas. Configure AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY no .env"
    );
  }

  const client = getComprehendClient();

  try {
    // 1. Detectar entidades médicas
    const entitiesCommand = new DetectEntitiesV2Command({
      Text: transcriptionText,
    });
    const entitiesResponse = await client.send(entitiesCommand);

    // 2. Inferir códigos CID-10
    let cidCodes: Array<{ code: string; description: string; score: number }> = [];
    
    try {
      const icdCommand = new InferICD10CMCommand({
        Text: transcriptionText,
      });
      const icdResponse = await client.send(icdCommand);
      
      console.log("ICD Response:", JSON.stringify(icdResponse, null, 2));
      
      if (icdResponse.Entities && icdResponse.Entities.length > 0) {
        cidCodes = icdResponse.Entities.map((entity: any) => ({
          code: entity.Code || "",
          description: entity.Description || "",
          score: entity.Score || 0,
        })).filter((cid) => cid.code && cid.description); // Filtrar códigos vazios
        console.log("CIDs retornados pelo AWS:", cidCodes.length);
      }
      
      // Sempre tentar inferir códigos adicionais baseado nas entidades
      // Mesmo que o AWS tenha retornado alguns códigos, podemos complementar
      if (cidCodes.length === 0 || cidCodes.length < 3) {
        console.log("Complementando CIDs com inferência de entidades...");
        const inferredCids = inferCIDFromEntities(entitiesResponse.Entities || []);
        
        // Adicionar CIDs inferidos que não estão na lista
        inferredCids.forEach((inferred) => {
          if (!cidCodes.find((c) => c.code === inferred.code)) {
            cidCodes.push(inferred);
          }
        });
      }
    } catch (icdError: any) {
      console.error("Erro ao inferir códigos CID do AWS:", icdError);
      // Se falhar, tentar inferir baseado nas entidades
      console.log("Usando fallback: inferindo CIDs de entidades...");
      cidCodes = inferCIDFromEntities(entitiesResponse.Entities || []);
    }
    
    // Garantir que sempre temos pelo menos uma tentativa de inferência
    if (cidCodes.length === 0) {
      console.log("Nenhum CID encontrado. Tentando inferência final...");
      cidCodes = inferCIDFromEntities(entitiesResponse.Entities || []);
    }

    // 3. Processar resultados e gerar anamnese estruturada
    const entities = (entitiesResponse.Entities || []).map((entity) => ({
      text: entity.Text || "",
      category: entity.Category || "",
      type: entity.Type || "",
      score: entity.Score || 0,
    }));

    // 4. Gerar anamnese baseada nas entidades detectadas
    const anamnese = generateAnamnese(transcriptionText, entities);

    // 5. Sugerir exames baseado nas entidades e CID
    const exames = suggestExams(entities, cidCodes);

    // Ordenar códigos CID, garantindo que não estejam vazios e tenham score > 0.5
    let sortedCidCodes = cidCodes
      .filter((cid) => cid.code && cid.description && cid.score > 0.5) // Garantir que não está vazio e tem assertividade > 50%
      .sort((a, b) => b.score - a.score);

    // Se ainda não houver CIDs, tentar inferir diretamente do texto da transcrição
    if (sortedCidCodes.length === 0) {
      console.log("Nenhum CID encontrado após todas as tentativas. Inferindo do texto...");
      console.log("Texto da transcrição para inferência:", transcriptionText.substring(0, 200));
      const textInferred = inferCIDFromText(transcriptionText);
      console.log("CIDs inferidos do texto:", textInferred.length, textInferred);
      sortedCidCodes = textInferred;
    }

    console.log("=== RESULTADO FINAL DE CIDs ===");
    console.log("Total de CIDs:", sortedCidCodes.length);
    console.log("CIDs:", JSON.stringify(sortedCidCodes, null, 2));
    console.log("Entidades detectadas:", entities.length);
    console.log("===============================");

    return {
      anamnese,
      cidCodes: sortedCidCodes,
      exames,
      entities,
    };
  } catch (error: any) {
    console.error("Erro ao processar com Comprehend Medical:", error);
    
    // Tratamento específico para erros de região
    if (error.message?.includes("ENOTFOUND") || error.code === "ENOTFOUND") {
      throw new Error(
        "AWS Comprehend Medical não está disponível na região configurada. " +
        "Configure AWS_REGION=us-east-1, us-west-2 ou eu-west-1 no .env"
      );
    }
    
    // Tratamento para erros de autenticação
    if (error.name === "UnrecognizedClientException" || error.name === "InvalidSignatureException") {
      throw new Error(
        "Credenciais AWS inválidas. Verifique AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY"
      );
    }
    
    throw new Error(
      error.message || "Erro ao processar transcrição com IA médica"
    );
  }
}

/**
 * Infere códigos CID baseado nas entidades quando o AWS não retorna
 */
function inferCIDFromEntities(
  entities: any[]
): Array<{ code: string; description: string; score: number }> {
  const cidCodes: Array<{ code: string; description: string; score: number }> = [];
  
  console.log("Inferindo CID de entidades. Total de entidades:", entities.length);
  
  // Mapeamento expandido de condições comuns para CID-10
  const conditionToCID: { [key: string]: { code: string; description: string }[] } = {
    "dor de estômago": [{ code: "K30", description: "Dispepsia" }],
    "dor estomacal": [{ code: "K30", description: "Dispepsia" }],
    "gastrite": [{ code: "K29.7", description: "Gastrite não especificada" }],
    "hipertensão": [{ code: "I10", description: "Hipertensão essencial (primária)" }],
    "diabetes": [{ code: "E11.9", description: "Diabetes mellitus não insulino-dependente sem complicações" }],
    "infecção": [{ code: "B99.9", description: "Doença infecciosa não especificada" }],
    "febre": [{ code: "R50.9", description: "Febre não especificada" }],
    "tosse": [{ code: "R05", description: "Tosse" }],
    "dor de cabeça": [{ code: "R51", description: "Cefaleia" }],
    "cefaleia": [{ code: "R51", description: "Cefaleia" }],
    "dor abdominal": [{ code: "R10.9", description: "Dor abdominal não especificada" }],
    "náusea": [{ code: "R11.0", description: "Náusea" }],
    "vômito": [{ code: "R11", description: "Náusea e vômito" }],
    "asma": [{ code: "J45.9", description: "Asma não especificada" }],
    "bronquite": [{ code: "J40", description: "Bronquite não especificada como aguda ou crônica" }],
    "resfriado": [{ code: "J00", description: "Rinite aguda (resfriado comum)" }],
    "gripe": [{ code: "J11.1", description: "Influenza com outras manifestações respiratórias" }],
    "sinusite": [{ code: "J01.9", description: "Sinusite aguda não especificada" }],
    "faringite": [{ code: "J02.9", description: "Faringite aguda não especificada" }],
    "amigdalite": [{ code: "J03.9", description: "Amigdalite aguda não especificada" }],
    "otite": [{ code: "H66.9", description: "Otite média não especificada" }],
    "conjuntivite": [{ code: "H10.9", description: "Conjuntivite não especificada" }],
    "dermatite": [{ code: "L30.9", description: "Dermatite não especificada" }],
    "alergia": [{ code: "T78.4", description: "Alergia não especificada" }],
    "ansiedade": [{ code: "F41.9", description: "Transtorno de ansiedade não especificado" }],
    "depressão": [{ code: "F32.9", description: "Episódio depressivo não especificado" }],
    "insônia": [{ code: "G47.0", description: "Distúrbios do início e da manutenção do sono (insônias)" }],
    "artrite": [{ code: "M13.9", description: "Artrite não especificada" }],
    "artrose": [{ code: "M19.9", description: "Artrose não especificada" }],
    "osteoporose": [{ code: "M81.0", description: "Osteoporose pós-menopausa sem fratura patológica" }],
    "dor nas costas": [{ code: "M54.9", description: "Dorsalgia não especificada" }],
    "lombalgia": [{ code: "M54.5", description: "Dor lombar baixa" }],
    "enxaqueca": [{ code: "G43.9", description: "Enxaqueca não especificada" }],
    "infecção urinária": [{ code: "N39.0", description: "Infecção do trato urinário, local não especificado" }],
    "cistite": [{ code: "N30.9", description: "Cistite não especificada" }],
    "pneumonia": [{ code: "J18.9", description: "Pneumonia não especificada" }],
    "hipertireoidismo": [{ code: "E05.9", description: "Tireotoxicose não especificada" }],
    "hipotireoidismo": [{ code: "E03.9", description: "Hipotireoidismo não especificado" }],
  };

  // Processar todas as entidades médicas
  entities.forEach((entity) => {
    if (!entity) return;
    
    const category = entity.Category || entity.category;
    const text = entity.Text || entity.text || "";
    const score = entity.Score || entity.score || 0.7;
    
    // Verificar se é uma condição médica
    if (category === "MEDICAL_CONDITION" || category === "DX_NAME" || category === "SYMPTOM") {
      const textLower = text.toLowerCase().trim();
      
      if (!textLower) return;
      
      console.log("Processando entidade:", textLower, "Categoria:", category);
      
      // Buscar correspondências no mapeamento
      Object.keys(conditionToCID).forEach((key) => {
        if (textLower.includes(key) || key.includes(textLower)) {
          const cids = conditionToCID[key];
          cids.forEach((cid) => {
            // Evitar duplicatas
            if (!cidCodes.find((c) => c.code === cid.code)) {
              cidCodes.push({
                code: cid.code,
                description: cid.description,
                score: Math.max(score, 0.6), // Garantir score mínimo
              });
              console.log("CID inferido:", cid.code, "-", cid.description);
            }
          });
        }
      });
    }
  });

  // Se ainda não encontrou nenhum CID, tentar inferir de sintomas comuns
  if (cidCodes.length === 0) {
    const allText = entities
      .map((e) => (e.Text || e.text || "").toLowerCase())
      .join(" ");
    
    console.log("Nenhum CID encontrado. Texto completo:", allText);
    
    // Buscar palavras-chave mais genéricas
    const genericKeywords: { [key: string]: { code: string; description: string } } = {
      "dor": { code: "R52.9", description: "Dor não especificada" },
      "febre": { code: "R50.9", description: "Febre não especificada" },
      "tosse": { code: "R05", description: "Tosse" },
      "mal estar": { code: "R53", description: "Mal-estar e fadiga" },
      "fadiga": { code: "R53", description: "Mal-estar e fadiga" },
      "cansaço": { code: "R53", description: "Mal-estar e fadiga" },
    };
    
    Object.keys(genericKeywords).forEach((keyword) => {
      if (allText.includes(keyword)) {
        const cid = genericKeywords[keyword];
        if (!cidCodes.find((c) => c.code === cid.code)) {
          cidCodes.push({
            code: cid.code,
            description: cid.description,
            score: 0.6,
          });
          console.log("CID genérico inferido:", cid.code);
        }
      }
    });
  }

  console.log("Total de CIDs inferidos:", cidCodes.length);
  return cidCodes;
}

/**
 * Gera anamnese estruturada baseada na transcrição e entidades detectadas
 */
function generateAnamnese(
  transcription: string,
  entities: Array<{ text: string; category: string; type: string }>
): string {
  // Extrair informações principais
  const sintomas = entities
    .filter((e) => e.category === "MEDICAL_CONDITION" || e.type === "SYMPTOM")
    .map((e) => e.text)
    .join(", ");

  const medicamentos = entities
    .filter((e) => e.category === "MEDICATION")
    .map((e) => e.text)
    .join(", ");

  const exames = entities
    .filter((e) => e.category === "TEST_TREATMENT_PROCEDURE")
    .map((e) => e.text)
    .join(", ");

  // Construir anamnese estruturada seguindo a ordem padrão
  // Extrair queixa principal (2-3 palavras do primeiro sintoma)
  let queixaPrincipal = "N/A";
  if (sintomas) {
    const primeiroSintoma = sintomas.split(',')[0].trim();
    const palavras = primeiroSintoma.split(' ').slice(0, 3);
    queixaPrincipal = palavras.join(' ');
  }

  let anamnese = `ANAMNESE:\n${transcription}\n\n`;
  
  // QUEIXA PRINCIPAL
  anamnese += `QUEIXA PRINCIPAL:\n${queixaPrincipal}\n\n`;
  
  // HISTÓRIA DA DOENÇA ATUAL
  anamnese += `HISTÓRIA DA DOENÇA ATUAL:\n${transcription}\n\n`;
  
  // ANTECEDENTES PESSOAIS PATOLÓGICOS
  anamnese += `ANTECEDENTES PESSOAIS PATOLÓGICOS:\nN/A\n\n`;
  
  // ANTECEDENTES FAMILIARES
  anamnese += `ANTECEDENTES FAMILIARES:\nN/A\n\n`;
  
  // HÁBITOS DE VIDA / HISTÓRIA SOCIAL
  anamnese += `HÁBITOS DE VIDA / HISTÓRIA SOCIAL:\nN/A\n\n`;
  
  // MEDICAMENTOS EM USO ATUAL
  if (medicamentos) {
    anamnese += `MEDICAMENTOS EM USO ATUAL:\n${medicamentos}\n\n`;
  } else {
    anamnese += `MEDICAMENTOS EM USO ATUAL:\nN/A\n\n`;
  }

  // EXAMES FÍSICOS
  anamnese += `EXAMES FÍSICOS:\nN/A\n\n`;

  // EXAMES REALIZADOS (se houver)
  if (exames) {
    anamnese += `EXAMES REALIZADOS:\n${exames}\n\n`;
  }

  return anamnese;
}

/**
 * Sugere exames baseado nas entidades detectadas e códigos CID
 */
function suggestExams(
  entities: Array<{ text: string; category: string; type: string }>,
  cidCodes: Array<{ code: string; description: string }>
): Array<{ nome: string; tipo: string; justificativa: string }> {
  const exames: Array<{ nome: string; tipo: string; justificativa: string }> =
    [];

  // Mapeamento de condições para exames sugeridos
  const conditionExams: { [key: string]: string[] } = {
    diabetes: ["Glicemia de jejum", "Hemoglobina glicada", "Creatinina"],
    hipertensão: ["Pressão arterial", "Eletrocardiograma", "Creatinina"],
    infecção: ["Hemograma completo", "Proteína C reativa", "Hemossedimentação"],
    dor: ["Radiografia", "Ultrassonografia", "Hemograma completo"],
  };

  // Verificar condições mencionadas
  const conditions = entities
    .filter((e) => e.category === "MEDICAL_CONDITION")
    .map((e) => e.text.toLowerCase());

  conditions.forEach((condition) => {
    Object.keys(conditionExams).forEach((key) => {
      if (condition.includes(key)) {
        conditionExams[key].forEach((exame) => {
          if (!exames.find((e) => e.nome === exame)) {
            exames.push({
              nome: exame,
              tipo: "Laboratorial",
              justificativa: `Sugerido baseado na condição: ${condition}`,
            });
          }
        });
      }
    });
  });

  // Adicionar exames padrão se não houver sugestões específicas
  if (exames.length === 0) {
    exames.push(
      {
        nome: "Hemograma completo",
        tipo: "Laboratorial",
        justificativa: "Exame de rotina para avaliação geral",
      },
      {
        nome: "Glicemia de jejum",
        tipo: "Laboratorial",
        justificativa: "Avaliação metabólica",
      }
    );
  }

  return exames; // Retornar todos os exames sugeridos
}

/**
 * Infere códigos CID diretamente do texto da transcrição
 * Útil quando não há entidades detectadas
 */
function inferCIDFromText(
  text: string
): Array<{ code: string; description: string; score: number }> {
  const cidCodes: Array<{ code: string; description: string; score: number }> = [];
  const textLower = text.toLowerCase();
  
  console.log("Inferindo CID diretamente do texto:", textLower.substring(0, 200));
  
  // Mapeamento expandido de palavras-chave para CID-10
  const keywordToCID: { [key: string]: { code: string; description: string }[] } = {
    "dor de estômago": [{ code: "K30", description: "Dispepsia" }],
    "dor estomacal": [{ code: "K30", description: "Dispepsia" }],
    "gastrite": [{ code: "K29.7", description: "Gastrite não especificada" }],
    "hipertensão": [{ code: "I10", description: "Hipertensão essencial (primária)" }],
    "pressão alta": [{ code: "I10", description: "Hipertensão essencial (primária)" }],
    "diabetes": [{ code: "E11.9", description: "Diabetes mellitus não insulino-dependente sem complicações" }],
    "infecção": [{ code: "B99.9", description: "Doença infecciosa não especificada" }],
    "febre": [{ code: "R50.9", description: "Febre não especificada" }],
    "tosse": [{ code: "R05", description: "Tosse" }],
    "dor de cabeça": [{ code: "R51", description: "Cefaleia" }],
    "cefaleia": [{ code: "R51", description: "Cefaleia" }],
    "enxaqueca": [{ code: "G43.9", description: "Enxaqueca não especificada" }],
    "dor abdominal": [{ code: "R10.9", description: "Dor abdominal não especificada" }],
    "náusea": [{ code: "R11.0", description: "Náusea" }],
    "vômito": [{ code: "R11", description: "Náusea e vômito" }],
    "asma": [{ code: "J45.9", description: "Asma não especificada" }],
    "bronquite": [{ code: "J40", description: "Bronquite não especificada como aguda ou crônica" }],
    "resfriado": [{ code: "J00", description: "Rinite aguda (resfriado comum)" }],
    "gripe": [{ code: "J11.1", description: "Influenza com outras manifestações respiratórias" }],
    "sinusite": [{ code: "J01.9", description: "Sinusite aguda não especificada" }],
    "faringite": [{ code: "J02.9", description: "Faringite aguda não especificada" }],
    "amigdalite": [{ code: "J03.9", description: "Amigdalite aguda não especificada" }],
    "otite": [{ code: "H66.9", description: "Otite média não especificada" }],
    "conjuntivite": [{ code: "H10.9", description: "Conjuntivite não especificada" }],
    "dermatite": [{ code: "L30.9", description: "Dermatite não especificada" }],
    "alergia": [{ code: "T78.4", description: "Alergia não especificada" }],
    "ansiedade": [{ code: "F41.9", description: "Transtorno de ansiedade não especificado" }],
    "depressão": [{ code: "F32.9", description: "Episódio depressivo não especificado" }],
    "insônia": [{ code: "G47.0", description: "Distúrbios do início e da manutenção do sono (insônias)" }],
    "artrite": [{ code: "M13.9", description: "Artrite não especificada" }],
    "artrose": [{ code: "M19.9", description: "Artrose não especificada" }],
    "osteoporose": [{ code: "M81.0", description: "Osteoporose pós-menopausa sem fratura patológica" }],
    "dor nas costas": [{ code: "M54.9", description: "Dorsalgia não especificada" }],
    "lombalgia": [{ code: "M54.5", description: "Dor lombar baixa" }],
    "infecção urinária": [{ code: "N39.0", description: "Infecção do trato urinário, local não especificado" }],
    "cistite": [{ code: "N30.9", description: "Cistite não especificada" }],
    "pneumonia": [{ code: "J18.9", description: "Pneumonia não especificada" }],
    "hipertireoidismo": [{ code: "E05.9", description: "Tireotoxicose não especificada" }],
    "hipotireoidismo": [{ code: "E03.9", description: "Hipotireoidismo não especificado" }],
    "dor": [{ code: "R52.9", description: "Dor não especificada" }],
    "mal estar": [{ code: "R53", description: "Mal-estar e fadiga" }],
    "fadiga": [{ code: "R53", description: "Mal-estar e fadiga" }],
    "cansaço": [{ code: "R53", description: "Mal-estar e fadiga" }],
  };
  
  // Buscar palavras-chave no texto (ordenar por tamanho para pegar termos mais específicos primeiro)
  const sortedKeywords = Object.keys(keywordToCID).sort((a, b) => b.length - a.length);
  
  sortedKeywords.forEach((keyword) => {
    if (textLower.includes(keyword)) {
      const cids = keywordToCID[keyword];
      cids.forEach((cid) => {
        if (!cidCodes.find((c) => c.code === cid.code)) {
          cidCodes.push({
            code: cid.code,
            description: cid.description,
            score: 0.7, // Score padrão para inferência de texto
          });
          console.log("CID inferido do texto:", cid.code, "-", cid.description, "palavra-chave:", keyword);
        }
      });
    }
  });
  
  console.log("Total de CIDs inferidos do texto:", cidCodes.length);
  
  // Filtrar apenas códigos com score > 0.5 (assertividade acima de 50%)
  const filteredCids = cidCodes.filter((cid) => cid.score > 0.5);
  
  // Se não encontrou nenhum CID e o texto é muito curto/genérico, 
  // retornar um CID genérico para consulta/exame (com score mínimo de 0.51 para passar no filtro)
  if (filteredCids.length === 0 && textLower.length < 100) {
    console.log("Texto muito genérico, retornando CID genérico para consulta");
    return [{
      code: "Z00.0",
      description: "Exame médico geral",
      score: 0.51
    }];
  }
  
  return filteredCids;
}

