import { MedicamentoSyncRepository, MedicamentoAnvisaData } from "./medicamento-sync-repository";
import https from "https";
import { URL } from "url";
import { TextDecoder } from "util";

const ANVISA_CSV_URL =
  "https://dados.anvisa.gov.br/dados/CONSULTAS/PRODUTOS/TA_CONSULTA_MEDICAMENTOS.CSV";

// Agente HTTPS que ignora erros de certificado SSL
// Necessário porque alguns servidores governamentais podem ter certificados não verificáveis
const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // Ignorar erros de certificado SSL
});

interface SyncResult {
  success: boolean;
  totalProcessed: number;
  totalInserted: number;
  totalUpdated: number;
  totalErrors: number;
  errors: string[];
  duration: number; // em milissegundos
}

// Armazenar progresso de sincronização em memória (por clinicaId)
const syncProgress = new Map<string, {
  total: number;
  processed: number;
  inserted: number;
  updated: number;
  errors: number;
  status: "idle" | "downloading" | "processing" | "completed" | "error";
  message: string;
}>();

export class AnvisaSyncService {
  private repository: MedicamentoSyncRepository;
  private clinicaId: string;

  constructor(clinicaId: string) {
    this.repository = new MedicamentoSyncRepository();
    this.clinicaId = clinicaId;
  }

  /**
   * Obtém o progresso atual da sincronização
   */
  static getProgress(clinicaId: string) {
    return syncProgress.get(clinicaId) || null;
  }

  /**
   * Atualiza o progresso da sincronização
   */
  private updateProgress(updates: Partial<typeof syncProgress extends Map<string, infer T> ? T : never>) {
    const current = syncProgress.get(this.clinicaId) || {
      total: 0,
      processed: 0,
      inserted: 0,
      updated: 0,
      errors: 0,
      status: "idle" as const,
      message: "",
    };
    syncProgress.set(this.clinicaId, { ...current, ...updates });
  }

  /**
   * Baixa o CSV da ANVISA e retorna como string
   */
  private async downloadCSV(): Promise<string> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[ANVISA Sync] Tentativa ${attempt}/${maxRetries} de download...`);
        console.log(`[ANVISA Sync] Fazendo requisição para: ${ANVISA_CSV_URL}`);
        
        // Usar https nativo do Node.js para garantir que o agente seja usado corretamente
        const url = new URL(ANVISA_CSV_URL);
        
        const csvText = await new Promise<string>((resolve, reject) => {
          let timeoutId: NodeJS.Timeout | null = null;
          
          const req = https.request(
            {
              hostname: url.hostname,
              path: url.pathname + url.search,
              method: "GET",
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/csv,text/plain,*/*",
                "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
              },
              agent: httpsAgent, // Usar agente que ignora erros de certificado SSL
            },
            (res) => {
              // Limpar timeout quando receber resposta
              if (timeoutId) {
                clearTimeout(timeoutId);
              }
              
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                let data: Buffer = Buffer.alloc(0);
                const contentLength = res.headers["content-length"];
                
                if (contentLength) {
                  console.log(`[ANVISA Sync] Resposta recebida, tamanho esperado: ${contentLength} bytes`);
                }
                
                res.on("data", (chunk) => {
                  // O CSV da ANVISA geralmente vem em ISO-8859-1 (Latin-1)
                  // Vamos acumular os chunks como Buffer e converter no final
                  const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                  // Acumular como Buffer para converter tudo de uma vez no final
                  data = Buffer.concat([data, buffer]);
                });
                
                res.on("end", () => {
                  if (!data || data.length === 0) {
                    reject(new Error("CSV vazio ou inválido"));
                  } else {
                    try {
                      // O CSV da ANVISA geralmente vem em ISO-8859-1 (Latin-1)
                      // Ler como Latin-1 - o Node.js automaticamente converte para UTF-8 internamente
                      const csvText = data.toString('latin1');
                      
                      console.log(`[ANVISA Sync] CSV baixado e convertido de Latin-1 para UTF-8 (${csvText.length} caracteres)`);
                      resolve(csvText);
                    } catch (error) {
                      // Fallback: tentar UTF-8 direto
                      try {
                        const utf8Data = data.toString('utf8');
                        console.log(`[ANVISA Sync] CSV baixado como UTF-8 (${utf8Data.length} caracteres)`);
                        resolve(utf8Data);
                      } catch (fallbackError) {
                        console.error(`[ANVISA Sync] Erro ao converter encoding:`, fallbackError);
                        reject(new Error("Erro ao converter encoding do CSV"));
                      }
                    }
                  }
                });
                
                res.on("error", (error) => {
                  reject(error);
                });
              } else {
                reject(
                  new Error(
                    `HTTP ${res.statusCode}: ${res.statusMessage || "Erro desconhecido"}`
                  )
                );
              }
            }
          );

          req.on("error", (error) => {
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
            reject(error);
          });

          // Timeout manual (10 minutos)
          timeoutId = setTimeout(() => {
            req.destroy();
            reject(new Error("Timeout ao baixar CSV (10 minutos)"));
          }, 10 * 60 * 1000);

          req.end();
        });

        return csvText;
      } catch (error) {
        // Log detalhado do erro
        if (error instanceof Error) {
          const errorDetails: any = {
            name: error.name,
            message: error.message,
          };
          
          // Adicionar informações adicionais se disponíveis
          if ((error as any).cause) {
            errorDetails.cause = (error as any).cause;
          }
          if ((error as any).code) {
            errorDetails.code = (error as any).code;
          }
          
          console.error(`[ANVISA Sync] Detalhes do erro (tentativa ${attempt}):`, errorDetails);
          
          if (error.message.includes("Timeout")) {
            lastError = new Error("Timeout ao baixar CSV (10 minutos)");
          } else if (
            error.message.includes("ECONNREFUSED") ||
            error.message.includes("ENOTFOUND") ||
            error.message.includes("ETIMEDOUT") ||
            (error as any).code === "ECONNREFUSED" ||
            (error as any).code === "ENOTFOUND" ||
            (error as any).code === "ETIMEDOUT"
          ) {
            const code = (error as any).code || "desconhecido";
            lastError = new Error(
              `Erro de conexão (${code}): ${error.message}. Verifique sua conexão com a internet e se o site da ANVISA (dados.anvisa.gov.br) está acessível.`
            );
          } else {
            lastError = error;
          }
        } else {
          lastError = new Error(String(error));
        }
        
        console.error(`[ANVISA Sync] Erro na tentativa ${attempt}:`, lastError.message);

        if (attempt < maxRetries) {
          // Espera exponencial: 2s, 4s, 8s
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`[ANVISA Sync] Aguardando ${waitTime}ms antes da próxima tentativa...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    throw new Error(
      `Falha ao baixar CSV após ${maxRetries} tentativas: ${lastError?.message}`
    );
  }

  /**
   * Faz parse do CSV e retorna array de objetos
   */
  private parseCSV(csvText: string): MedicamentoAnvisaData[] {
    const lines = csvText.split("\n").filter((line) => line.trim().length > 0);

    if (lines.length < 2) {
      throw new Error("CSV inválido: menos de 2 linhas (cabeçalho + dados)");
    }

    // Primeira linha é o cabeçalho
    const header = lines[0];
    const headerColumns = this.parseCSVLine(header);

    // Normalizar nomes das colunas (remover acentos, espaços, etc)
    const normalizedHeaders = headerColumns.map((h) =>
      this.normalizeColumnName(h)
    );

    // Mapear índices das colunas baseado no formato real do CSV da ANVISA
    // Cabeçalho real: NU_REGISTRO_PRODUTO, NO_PRODUTO, NO_RAZAO_SOCIAL_EMPRESA, etc.
    const columnMap = {
      numeroRegistro: normalizedHeaders.findIndex((h) =>
        /nu_registro_produto/i.test(h)
      ),
      nomeProduto: normalizedHeaders.findIndex((h) =>
        /^no_produto$/i.test(h)
      ),
      principioAtivo: normalizedHeaders.findIndex((h) =>
        /co_substancia|substancias_medicamentos/i.test(h)
      ),
      empresa: normalizedHeaders.findIndex((h) =>
        /no_razao_social_empresa/i.test(h)
      ),
      situacaoRegistro: normalizedHeaders.findIndex((h) =>
        /co_situacao_assunto_doc|situacao_assunto/i.test(h)
      ),
      classeTerapeutica: normalizedHeaders.findIndex((h) =>
        /co_atc/i.test(h)
      ),
      apresentacao: normalizedHeaders.findIndex((h) =>
        /complemento|co_seq_apresentacao_produto/i.test(h)
      ),
      concentracao: normalizedHeaders.findIndex((h) =>
        /concentracao|dosagem/i.test(h)
      ),
      controle: normalizedHeaders.findIndex((h) =>
        /co_tarja|tarja|controle/i.test(h)
      ),
      data: normalizedHeaders.findIndex((h) =>
        /dt_vencimento_produto|data_ultima_atualizacao/i.test(h)
      ),
    };
    
    // Debug: mostrar mapeamento encontrado
    console.log(`[ANVISA Sync] Mapeamento de colunas encontrado:`, {
      numeroRegistro: columnMap.numeroRegistro >= 0 ? `Coluna ${columnMap.numeroRegistro}: "${headerColumns[columnMap.numeroRegistro]}"` : "NÃO ENCONTRADO",
      nomeProduto: columnMap.nomeProduto >= 0 ? `Coluna ${columnMap.nomeProduto}: "${headerColumns[columnMap.nomeProduto]}"` : "NÃO ENCONTRADO",
      empresa: columnMap.empresa >= 0 ? `Coluna ${columnMap.empresa}: "${headerColumns[columnMap.empresa]}"` : "NÃO ENCONTRADO",
      principioAtivo: columnMap.principioAtivo >= 0 ? `Coluna ${columnMap.principioAtivo}: "${headerColumns[columnMap.principioAtivo]}"` : "NÃO ENCONTRADO",
    });

    // Validar que encontramos pelo menos numeroRegistro e nomeProduto
    if (columnMap.numeroRegistro === -1 || columnMap.nomeProduto === -1) {
      throw new Error(
        `Colunas obrigatórias não encontradas. Cabeçalho: ${header}`
      );
    }

    const medicamentos: MedicamentoAnvisaData[] = [];
    const errors: string[] = [];

    // Processar linhas de dados (pular cabeçalho)
    for (let i = 1; i < lines.length; i++) {
      try {
        const line = lines[i];
        if (!line || line.trim().length === 0) continue;

        const columns = this.parseCSVLine(line);

        const numeroRegistro = this.getColumnValue(
          columns,
          columnMap.numeroRegistro
        );
        const nomeProduto = this.getColumnValue(columns, columnMap.nomeProduto);

        // Validar campos obrigatórios
        if (!numeroRegistro || !nomeProduto) {
          errors.push(`Linha ${i + 1}: Campos obrigatórios ausentes`);
          continue;
        }

        const medicamento: MedicamentoAnvisaData = {
          numeroRegistro: numeroRegistro.trim(),
          nomeProduto: this.formatTitleCase(nomeProduto.trim()) || nomeProduto.trim(),
          principioAtivo: this.formatTitleCase(
            this.getColumnValue(columns, columnMap.principioAtivo)?.trim()
          ),
          empresa: this.formatTitleCase(
            this.getColumnValue(columns, columnMap.empresa)?.trim()
          ),
          situacaoRegistro:
            this.getColumnValue(columns, columnMap.situacaoRegistro)?.trim() ||
            null,
          classeTerapeutica:
            this.getColumnValue(columns, columnMap.classeTerapeutica)?.trim() ||
            null,
          apresentacao:
            this.getColumnValue(columns, columnMap.apresentacao)?.trim() || null,
          concentracao:
            this.getColumnValue(columns, columnMap.concentracao)?.trim() || null,
          controle: this.getControleFromTarja(
            this.getColumnValue(columns, columnMap.controle)
          ),
          data: this.getColumnValue(columns, columnMap.data)?.trim() || null,
        };

        medicamentos.push(medicamento);
      } catch (error) {
        const errorMsg = `Linha ${i + 1}: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMsg);
        console.error(`[ANVISA Sync] Erro ao processar linha ${i + 1}:`, error);
      }
    }

    if (errors.length > 0) {
      console.warn(
        `[ANVISA Sync] ${errors.length} erros ao processar CSV (primeiros 10):`,
        errors.slice(0, 10)
      );
    }

    return medicamentos;
  }

  /**
   * Faz parse de uma linha CSV, tratando aspas e vírgulas dentro de campos
   */
  private parseCSVLine(line: string): string[] {
    const columns: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Aspas duplas escapadas
          current += '"';
          i++; // Pular próxima aspas
        } else {
          // Toggle aspas
          inQuotes = !inQuotes;
        }
      } else if (char === ";" && !inQuotes) {
        // Separador (ponto e vírgula)
        columns.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    // Adicionar última coluna
    columns.push(current);

    return columns.map((col) => col.trim());
  }

  /**
   * Normaliza nome de coluna para facilitar matching
   */
  private normalizeColumnName(name: string): string {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .trim();
  }

  /**
   * Obtém valor de uma coluna de forma segura
   */
  private getColumnValue(columns: string[], index: number): string | null {
    if (index === -1 || index >= columns.length) {
      return null;
    }
    const value = columns[index];
    return value && value.trim().length > 0 ? value : null;
  }

  /**
   * Converte código de tarja para tipo de controle
   */
  private getControleFromTarja(tarjaCode: string | null): string | null {
    if (!tarjaCode) return null;
    
    // Mapear códigos de tarja da ANVISA para tipos de controle
    const tarjaMap: Record<string, string> = {
      "1": "Simples",
      "2": "Tarja Amarela",
      "3": "Tarja Vermelha",
      "4": "Tarja Preta",
      "5": "Controle Especial",
    };
    
    return tarjaMap[tarjaCode] || tarjaCode;
  }

  /**
   * Formata texto para Title Case (primeira letra de cada palavra em maiúscula)
   * Exemplo: "SULFATO DE SABUTAMOL" -> "Sulfato de Sabutamol"
   */
  private formatTitleCase(text: string | null): string | null {
    if (!text) return null;
    
    const words = text.toLowerCase().split(/\s+/);
    const smallWords = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos'];
    
    return words
      .map((word, index) => {
        // Primeira palavra sempre capitalizada
        if (index === 0) {
          return word.charAt(0).toUpperCase() + word.slice(1);
        }
        // Manter palavras de conexão em minúsculas (exceto a primeira)
        if (smallWords.includes(word)) {
          return word;
        }
        // Primeira letra em maiúscula
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }

  /**
   * Sincroniza medicamentos da ANVISA
   */
  async sync(): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: false,
      totalProcessed: 0,
      totalInserted: 0,
      totalUpdated: 0,
      totalErrors: 0,
      errors: [],
      duration: 0,
    };

    try {
      console.log("[ANVISA Sync] Iniciando sincronização...");
      this.updateProgress({
        status: "downloading",
        message: "Baixando CSV da ANVISA...",
        total: 0,
        processed: 0,
        inserted: 0,
        updated: 0,
        errors: 0,
      });

      // 1. Baixar CSV
      const csvText = await this.downloadCSV();

      // 2. Fazer parse
      console.log("[ANVISA Sync] Processando CSV...");
      this.updateProgress({
        status: "processing",
        message: "Processando CSV...",
      });
      
      const medicamentos = this.parseCSV(csvText);
      result.totalProcessed = medicamentos.length;

      console.log(
        `[ANVISA Sync] ${medicamentos.length} medicamentos encontrados no CSV`
      );

      // Atualizar total
      this.updateProgress({
        total: medicamentos.length,
        message: `Processando ${medicamentos.length} medicamentos...`,
      });

      // 3. Processar em lotes para melhor performance
      const batchSize = 100;
      let inserted = 0;
      let updated = 0;
      let errors = 0;

      for (let i = 0; i < medicamentos.length; i += batchSize) {
        const batch = medicamentos.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(medicamentos.length / batchSize);

        console.log(
          `[ANVISA Sync] Processando lote ${batchNumber}/${totalBatches} (${batch.length} registros)...`
        );

        // Processar lote em paralelo
        const batchPromises = batch.map(async (medicamento) => {
          try {
            // Verificar se já existe
            const existing = await this.repository.findByNumeroRegistro(
              this.clinicaId,
              medicamento.numeroRegistro
            );

            // Fazer UPSERT
            await this.repository.upsert(this.clinicaId, medicamento);

            if (existing) {
              updated++;
            } else {
              inserted++;
            }
          } catch (error) {
            errors++;
            const errorMsg = `Erro ao processar ${medicamento.numeroRegistro}: ${
              error instanceof Error ? error.message : String(error)
            }`;
            result.errors.push(errorMsg);
            console.error(`[ANVISA Sync] ${errorMsg}`);
          }
        });

        await Promise.all(batchPromises);

        // Atualizar progresso após cada lote
        const processed = Math.min(i + batchSize, medicamentos.length);
        const isLastBatch = processed >= medicamentos.length;
        
        this.updateProgress({
          processed: isLastBatch ? medicamentos.length : processed,
          inserted,
          updated,
          errors,
          message: isLastBatch 
            ? `Processamento concluído: ${medicamentos.length} medicamentos processados`
            : `Processando: ${processed} de ${medicamentos.length} medicamentos...`,
        });

        // Log de progresso a cada 10 lotes
        if (batchNumber % 10 === 0 || batchNumber === totalBatches) {
          console.log(
            `[ANVISA Sync] Progresso: ${processed}/${medicamentos.length} (${Math.round(
              (processed / medicamentos.length) * 100
            )}%)`
          );
        }
      }

      result.totalInserted = inserted;
      result.totalUpdated = updated;
      result.totalErrors = errors;
      result.success = errors < medicamentos.length * 0.1; // Sucesso se menos de 10% de erros

      const duration = Date.now() - startTime;
      result.duration = duration;

      // Atualizar progresso final
      this.updateProgress({
        status: result.success ? "completed" : "error",
        processed: medicamentos.length,
        inserted,
        updated,
        errors,
        message: result.success 
          ? `Sincronização concluída: ${inserted} inseridos, ${updated} atualizados`
          : `Sincronização concluída com erros: ${errors} erros`,
      });

      console.log(
        `[ANVISA Sync] Sincronização concluída em ${(duration / 1000).toFixed(2)}s`
      );
      console.log(
        `[ANVISA Sync] Resultado: ${inserted} inseridos, ${updated} atualizados, ${errors} erros`
      );
    } catch (error) {
      result.success = false;
      const errorMsg =
        error instanceof Error ? error.message : String(error);
      result.errors.push(errorMsg);
      
      // Atualizar progresso com erro
      this.updateProgress({
        status: "error",
        message: `Erro: ${errorMsg}`,
      });
      
      console.error("[ANVISA Sync] Erro fatal na sincronização:", errorMsg);
    } finally {
      result.duration = Date.now() - startTime;
    }

    return result;
  }
}
