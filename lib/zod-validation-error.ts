import type { ZodIssue } from "zod";

/** Rótulos para segmentos de `path` em erros Zod (API admin-clinica e afins). */
const SEGMENT_LABELS: Record<string, string> = {
  codigo: "Código",
  codigoTuss: "Código TUSS",
  codigoTussId: "Código TUSS",
  nome: "Nome",
  descricao: "Descrição",
  valor: "Valor",
  tipo: "Tipo",
  ativo: "Status",
  email: "E-mail",
  cpf: "CPF",
  rg: "RG",
  crm: "CRM",
  senha: "Senha",
  telefone: "Telefone",
  celular: "Celular",
  dataNascimento: "Data de nascimento",
  sexo: "Sexo",
  cep: "CEP",
  endereco: "Endereço",
  numero: "Número",
  complemento: "Complemento",
  bairro: "Bairro",
  cidade: "Cidade",
  estado: "Estado",
  profissao: "Profissão",
  estadoCivil: "Estado civil",
  observacoes: "Observações",
  usuarioId: "Usuário",
  especialidadeId: "Especialidade",
  categoriaId: "Categoria",
  rqe: "RQE",
  especialidades: "Especialidades",
  medicamentoId: "Medicamento",
  insumoId: "Insumo",
  quantidade: "Quantidade",
  medicamentos: "Medicamentos",
  insumos: "Insumos",
  principioAtivo: "Princípio ativo",
  laboratorio: "Laboratório",
  apresentacao: "Apresentação",
  concentracao: "Concentração",
  unidade: "Unidade",
  bandeiraCartao: "Bandeira do cartão",
  descricaoPagamento: "Descrição do pagamento",
  dataVencimento: "Data de vencimento",
  dataPagamento: "Data de pagamento",
  dataEmissao: "Data de emissão",
  dataRecebimento: "Data de recebimento",
  valorPago: "Valor pago",
  valorRecebido: "Valor recebido",
  valorOriginal: "Valor original",
  categoriaFinanceira: "Categoria financeira",
  fornecedor: "Fornecedor",
  cliente: "Cliente",
  medicoId: "Médico",
  pacienteId: "Paciente",
  formaPagamentoId: "Forma de pagamento",
  operadoraId: "Operadora",
  planoSaudeId: "Plano de saúde",
  tussOperadoraId: "Vínculo TUSS–operadora",
  codigoTussOperadora: "Código na operadora",
  aceita: "Aceita",
  valorTuss: "Valor TUSS",
  valorNegociado: "Valor negociado",
  dataInicioVigencia: "Início da vigência",
  dataFimVigencia: "Fim da vigência",
  tipoMovimentacao: "Tipo de movimentação",
  motivo: "Motivo",
  limiteMaximoRetornosPorDia: "Limite máximo de retornos por dia",
  isEnfermeiro: "Enfermeiro",
  duracaoMinutos: "Duração (minutos)",
  cor: "Cor",
  nomePlano: "Nome do plano",
  registroAns: "Registro ANS",
  tipoEstoque: "Tipo de estoque",
  estoqueId: "Estoque",
  quantidadeAtual: "Quantidade atual",
  quantidadeMinima: "Quantidade mínima",
  quantidadeMaxima: "Quantidade máxima",
  localizacao: "Localização",
  data: "Data",
  informacoes: "Informações",
};

function segmentLabel(seg: PropertyKey): string {
  if (typeof seg === "number") return `item ${seg + 1}`;
  if (typeof seg === "symbol") return String(seg);
  return SEGMENT_LABELS[seg] ?? seg;
}

/**
 * Junta issues do Zod em uma mensagem única para o usuário (campo + mensagem).
 */
export function formatZodIssuesForUser(issues: ZodIssue[]): string {
  if (!issues.length) return "Verifique os dados informados.";
  return issues
    .map((issue) => {
      const parts = issue.path.map(segmentLabel);
      const prefix = parts.length ? `${parts.join(" › ")}: ` : "";
      return `${prefix}${issue.message}`;
    })
    .join(" · ");
}

export function zodValidationErrorPayload(issues: ZodIssue[]) {
  return {
    error: formatZodIssuesForUser(issues),
    details: issues,
  };
}

/**
 * Extrai mensagem legível do JSON de erro da API (após `await res.json()`).
 * Retorna string vazia se não houver `error` nem `details` utilizáveis.
 */
export function getApiErrorMessage(body: unknown): string {
  if (!body || typeof body !== "object") {
    return "";
  }
  const b = body as Record<string, unknown>;
  if (typeof b.error === "string" && b.error.trim()) {
    return b.error.trim();
  }
  if (Array.isArray(b.details) && b.details.length > 0) {
    return formatZodIssuesForUser(b.details as ZodIssue[]);
  }
  return "";
}
