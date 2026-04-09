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

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(date));
}

/** Converte uma data UTC para string "YYYY-MM-DD" no fuso de São Paulo */
export function formatDateToInput(date: Date | string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date(date));
}

/** Calcula idade com base em data de nascimento, usando timezone de Brasília */
export function calcularIdade(dataNascimento: string | Date): number {
  const [hy, hm, hd] = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" })
    .format(new Date())
    .split("-")
    .map(Number);
  const [ny, nm, nd] = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" })
    .format(new Date(dataNascimento))
    .split("-")
    .map(Number);
  let idade = hy - ny;
  if (hm < nm || (hm === nm && hd < nd)) idade--;
  return idade;
}

export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
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
 * Mascara o CPF para exibição parcial (LGPD).
 * Ex: 39246119800 → 392.461.***-**
 */
export function maskCPF(cpf: string | null | undefined): string {
  if (!cpf) return "-";
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return cpf;
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.***-**`;
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
