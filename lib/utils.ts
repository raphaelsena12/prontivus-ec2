import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(date: Date | null | undefined): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(dateObj);
}

export function formatCNPJ(cnpj: string | null | undefined): string {
  if (!cnpj) return "-";
  const cleaned = cnpj.replace(/\D/g, "");
  return cleaned.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}

export function formatCPF(cpf: string | null | undefined): string {
  if (!cpf) return "-";
  const cleaned = cpf.replace(/\D/g, "");
  return cleaned.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}

/**
 * Normaliza uma string removendo acentos, espaços e caracteres especiais
 * para uso em emails ou URLs
 */
export function normalizeString(str: string): string {
  return str
    .normalize("NFD") // Decompõe caracteres acentuados
    .replace(/[\u0300-\u036f]/g, "") // Remove diacríticos (acentos)
    .toLowerCase() // Converte para minúsculas
    .trim() // Remove espaços no início e fim
    .replace(/\s+/g, "") // Remove espaços
    .replace(/[^a-z0-9]/g, "") // Remove caracteres especiais, mantém apenas letras e números
    .substring(0, 50); // Limita o tamanho para evitar emails muito longos
}

/**
 * Gera um email personalizado para o médico no formato: medico@clinicanome.prontivus.com
 * @param medicoNome Nome do médico
 * @param clinicaNome Nome da clínica
 * @returns Email no formato normalizado
 */
export function gerarEmailMedico(medicoNome: string, clinicaNome: string): string {
  const medicoNormalizado = normalizeString(medicoNome);
  const clinicaNormalizada = normalizeString(clinicaNome);
  
  // Se o nome do médico estiver vazio após normalização, usar "medico"
  const prefixoMedico = medicoNormalizado || "medico";
  
  // Se o nome da clínica estiver vazio após normalização, usar "clinica"
  const prefixoClinica = clinicaNormalizada || "clinica";
  
  return `${prefixoMedico}@${prefixoClinica}.prontivus.com`;
}
