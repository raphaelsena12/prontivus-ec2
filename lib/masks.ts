// Funções de máscara para campos de formulário

/**
 * Aplica máscara de CPF: 000.000.000-00
 */
export const maskCPF = (value: string): string => {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 11) {
    return cleaned
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return value;
};

/**
 * Aplica máscara de RG (formato brasileiro comum): 00.000.000-0
 */
export const maskRG = (value: string): string => {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 9) {
    return cleaned
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1})$/, "$1-$2");
  }
  return value;
};

/**
 * Aplica máscara de telefone fixo: (00) 0000-0000
 */
export const maskTelefone = (value: string): string => {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 10) {
    return cleaned
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return value;
};

/**
 * Aplica máscara de celular: (00) 00000-0000
 */
export const maskCelular = (value: string): string => {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 11) {
    return cleaned
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
  }
  return value;
};

/**
 * Aplica máscara de CEP: 00000-000
 */
export const maskCEP = (value: string): string => {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 8) {
    return cleaned.replace(/(\d{5})(\d)/, "$1-$2");
  }
  return value;
};

/**
 * Aplica máscara de telefone automaticamente detectando se é celular ou fixo
 * Celular: (00) 00000-0000 (11 dígitos)
 * Fixo: (00) 0000-0000 (10 dígitos)
 */
export const maskTelefoneAuto = (value: string): string => {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 10) {
    return maskTelefone(value);
  } else if (cleaned.length <= 11) {
    return maskCelular(value);
  }
  return value;
};

/**
 * Remove máscara de um valor (remove todos os caracteres não numéricos)
 */
export const removeMask = (value: string): string => {
  return value.replace(/\D/g, "");
};
