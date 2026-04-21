/**
 * Calculadoras clínicas determinísticas.
 *
 * LLMs são pouco confiáveis em aritmética e podem errar doses, TFG, IMC, etc.
 * Todos os cálculos médicos devem passar por estas funções puras.
 *
 * Referências:
 * - TFG: CKD-EPI 2021 (sem raça), Inker CH et al. NEJM 2021.
 * - Cockcroft-Gault: Nephron 1976.
 * - Superfície corporal: Du Bois & Du Bois 1916.
 * - IMC: classificação OMS.
 */

export interface ImcResultado {
  valor: number;
  categoria:
    | "baixo_peso"
    | "eutrofico"
    | "sobrepeso"
    | "obesidade_1"
    | "obesidade_2"
    | "obesidade_3";
  descricao: string;
}

/**
 * Calcula IMC e classifica pela OMS.
 * @param pesoKg peso em quilogramas
 * @param alturaMetros altura em metros (ex: 1.70)
 */
export function calcularIMC(pesoKg: number, alturaMetros: number): ImcResultado | null {
  if (!(pesoKg > 0) || !(alturaMetros > 0) || alturaMetros > 3) return null;
  const valor = Math.round((pesoKg / (alturaMetros * alturaMetros)) * 10) / 10;
  let categoria: ImcResultado["categoria"];
  let descricao: string;
  if (valor < 18.5) {
    categoria = "baixo_peso";
    descricao = "Baixo peso";
  } else if (valor < 25) {
    categoria = "eutrofico";
    descricao = "Eutrófico";
  } else if (valor < 30) {
    categoria = "sobrepeso";
    descricao = "Sobrepeso";
  } else if (valor < 35) {
    categoria = "obesidade_1";
    descricao = "Obesidade grau I";
  } else if (valor < 40) {
    categoria = "obesidade_2";
    descricao = "Obesidade grau II";
  } else {
    categoria = "obesidade_3";
    descricao = "Obesidade grau III (mórbida)";
  }
  return { valor, categoria, descricao };
}

export interface TfgResultado {
  valor: number;
  estagio: "G1" | "G2" | "G3a" | "G3b" | "G4" | "G5";
  descricao: string;
}

/**
 * TFG estimada pela equação CKD-EPI 2021 (sem coeficiente de raça).
 * @param creatininaMgDl creatinina sérica em mg/dL
 * @param idade em anos
 * @param sexo 'M' ou 'F'
 */
export function calcularTFG_CKDEPI(
  creatininaMgDl: number,
  idade: number,
  sexo: "M" | "F"
): TfgResultado | null {
  if (!(creatininaMgDl > 0) || !(idade > 0) || idade > 130) return null;
  const k = sexo === "F" ? 0.7 : 0.9;
  const alpha = sexo === "F" ? -0.241 : -0.302;
  const multSexo = sexo === "F" ? 1.012 : 1.0;
  const ratio = creatininaMgDl / k;
  const minTerm = Math.min(ratio, 1) ** alpha;
  const maxTerm = Math.max(ratio, 1) ** -1.2;
  const tfg = 142 * minTerm * maxTerm * 0.9938 ** idade * multSexo;
  const valor = Math.round(tfg);

  let estagio: TfgResultado["estagio"];
  let descricao: string;
  if (valor >= 90) {
    estagio = "G1";
    descricao = "TFG normal ou aumentada";
  } else if (valor >= 60) {
    estagio = "G2";
    descricao = "TFG levemente reduzida";
  } else if (valor >= 45) {
    estagio = "G3a";
    descricao = "DRC estágio G3a — redução leve a moderada";
  } else if (valor >= 30) {
    estagio = "G3b";
    descricao = "DRC estágio G3b — redução moderada a grave";
  } else if (valor >= 15) {
    estagio = "G4";
    descricao = "DRC estágio G4 — redução grave";
  } else {
    estagio = "G5";
    descricao = "DRC estágio G5 — falência renal";
  }
  return { valor, estagio, descricao };
}

/**
 * Clearance de creatinina pela equação de Cockcroft-Gault.
 * Ainda usado para ajuste de dose de muitos medicamentos.
 * @param creatininaMgDl creatinina sérica em mg/dL
 * @param idade em anos
 * @param pesoKg peso em kg
 * @param sexo 'M' ou 'F'
 */
export function calcularClearanceCockcroftGault(
  creatininaMgDl: number,
  idade: number,
  pesoKg: number,
  sexo: "M" | "F"
): number | null {
  if (!(creatininaMgDl > 0) || !(idade > 0) || !(pesoKg > 0)) return null;
  const base = ((140 - idade) * pesoKg) / (72 * creatininaMgDl);
  const clearance = sexo === "F" ? base * 0.85 : base;
  return Math.round(clearance);
}

/**
 * Superfície corporal pela fórmula de Du Bois.
 * Usada para ajuste de dose em oncologia.
 */
export function calcularSuperficieCorporal(pesoKg: number, alturaMetros: number): number | null {
  if (!(pesoKg > 0) || !(alturaMetros > 0)) return null;
  const alturaCm = alturaMetros * 100;
  const sc = 0.007184 * pesoKg ** 0.425 * alturaCm ** 0.725;
  return Math.round(sc * 100) / 100;
}

/**
 * Classificação de pressão arterial (Diretriz SBC 2020).
 */
export function classificarPA(sistolica: number, diastolica: number): string | null {
  if (!(sistolica > 0) || !(diastolica > 0)) return null;
  if (sistolica < 120 && diastolica < 80) return "Ótima";
  if (sistolica < 130 && diastolica < 85) return "Normal";
  if (sistolica < 140 && diastolica < 90) return "Pré-hipertensão";
  if (sistolica < 160 && diastolica < 100) return "Hipertensão estágio 1";
  if (sistolica < 180 && diastolica < 110) return "Hipertensão estágio 2";
  return "Hipertensão estágio 3 (crise hipertensiva se sintomas)";
}

/**
 * Categoria pediátrica por idade.
 */
export function classificarFaixaEtariaPediatrica(idadeAnos: number): string | null {
  if (idadeAnos < 0) return null;
  if (idadeAnos < 1 / 12) return "Recém-nascido";
  if (idadeAnos < 2) return "Lactente";
  if (idadeAnos < 6) return "Pré-escolar";
  if (idadeAnos < 10) return "Escolar";
  if (idadeAnos < 20) return "Adolescente";
  return "Adulto";
}

export interface SinalVital {
  label: string;
  value: string | number;
  unit?: string;
}

/**
 * Enriquece um conjunto de sinais vitais com classificações e cálculos derivados.
 * Retorna um texto pronto para ser injetado em prompts ou exibido ao médico.
 */
export function resumirSinaisVitais(sinais: SinalVital[]): string[] {
  const resumo: string[] = [];
  const mapa = new Map(sinais.map((s) => [s.label.toLowerCase(), s]));

  const getNumero = (chaves: string[]): number | null => {
    for (const c of chaves) {
      const s = mapa.get(c);
      if (!s) continue;
      const n = typeof s.value === "number" ? s.value : parseFloat(String(s.value).replace(",", "."));
      if (!isNaN(n)) return n;
    }
    return null;
  };

  const peso = getNumero(["peso"]);
  const alturaCm = getNumero(["altura"]);
  if (peso && alturaCm) {
    const alturaM = alturaCm > 3 ? alturaCm / 100 : alturaCm;
    const imc = calcularIMC(peso, alturaM);
    if (imc) resumo.push(`IMC: ${imc.valor} kg/m² (${imc.descricao})`);
  }

  const pas = getNumero(["pa sistólica", "pa sistolica", "pas"]);
  const pad = getNumero(["pa diastólica", "pa diastolica", "pad"]);
  if (pas && pad) {
    const pa = classificarPA(pas, pad);
    if (pa) resumo.push(`PA: ${pas}/${pad} mmHg — ${pa}`);
  }

  return resumo;
}
