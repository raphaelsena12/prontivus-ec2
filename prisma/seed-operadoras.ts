import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL não está definida no arquivo .env");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type AnsOperadoraListItem = {
  registro_ans: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  classificacao_sigla?: string;
  ativa: boolean;
};

type AnsOperadoraDetalhe = {
  registro_ans: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  ativa: boolean;
  classificacao_sigla?: string;
  endereco_logradouro?: string;
  endereco_numero?: string;
  endereco_bairro?: string;
  endereco_cep?: string;
  endereco_municipio_nome?: string;
  endereco_uf_sigla?: string;
  telefone_ddd?: string;
  telefone_numero?: string;
};

const ANS_BASE = "https://www.ans.gov.br/operadoras-entity/v1";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ANS API error ${res.status} em ${url}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

function norm(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase();
}

function isOdonto(sigla?: string) {
  return !!sigla && sigla.toUpperCase().startsWith("OD");
}

async function listarOperadorasAns(): Promise<AnsOperadoraListItem[]> {
  // Limites observados: size=100 ok; sort pode retornar 400; filtros podem ser bloqueados.
  const size = 100;
  const firstUrl = `${ANS_BASE}/operadoras/?page=1&size=${size}`;
  const first = await fetchJson<{ total_pages: number; content: AnsOperadoraListItem[] }>(firstUrl);

  const all: AnsOperadoraListItem[] = [...(first.content ?? [])];
  const totalPages = first.total_pages ?? 1;

  for (let page = 2; page <= totalPages; page++) {
    const url = `${ANS_BASE}/operadoras/?page=${page}&size=${size}`;
    const data = await fetchJson<{ content: AnsOperadoraListItem[] }>(url);
    all.push(...(data.content ?? []));
  }
  return all;
}

function acharOperadoraPorTermoNoCatalogo(catalogo: AnsOperadoraListItem[], termo: string) {
  const t = norm(termo);
  const candidatas = catalogo.filter((o) => o.ativa && !isOdonto(o.classificacao_sigla));
  return (
    candidatas.find((o) => norm(o.nome_fantasia ?? "").includes(t)) ??
    candidatas.find((o) => norm(o.razao_social).includes(t)) ??
    null
  );
}

async function importarOperadoraGlobalPorRegistro(registroAns: string) {
  const det = await fetchJson<AnsOperadoraDetalhe>(`${ANS_BASE}/operadoras/${registroAns}`);
  const telefone =
    det.telefone_ddd && det.telefone_numero ? `${det.telefone_ddd}${det.telefone_numero}` : null;

  const existente = await prisma.operadora.findFirst({
    where: { clinicaId: null, codigoAns: det.registro_ans },
  });

  const data = {
    clinicaId: null,
    codigoAns: det.registro_ans,
    razaoSocial: det.razao_social,
    nomeFantasia: det.nome_fantasia ?? null,
    cnpj: det.cnpj ?? null,
    telefone,
    email: null,
    cep: det.endereco_cep ?? null,
    endereco: det.endereco_logradouro ?? null,
    numero: det.endereco_numero ?? null,
    complemento: null,
    bairro: det.endereco_bairro ?? null,
    cidade: det.endereco_municipio_nome ?? null,
    estado: det.endereco_uf_sigla ?? null,
    pais: "Brasil",
    ativo: det.ativa ?? true,
  };

  if (existente) {
    return prisma.operadora.update({ where: { id: existente.id }, data });
  }
  return prisma.operadora.create({ data });
}

async function main() {
  console.log("🏥 Seed SOMENTE OPERADORAS — importando principais operadoras via ANS...");

  const PRINCIPAIS_TERMOS = [
    "BRADESCO SAUDE",
    "SULAMERICA",
    "AMIL",
    "HAPVIDA",
    "NOTREDAME INTERMEDICA",
    "PORTO SEGURO",
    "PREVENT SENIOR",
    "ASSIM SAUDE",
    "UNIMED",
    "ALLIANZ",
  ];

  const catalogoAns = await listarOperadorasAns();
  const importadas: any[] = [];

  for (const termo of PRINCIPAIS_TERMOS) {
    const item = acharOperadoraPorTermoNoCatalogo(catalogoAns, termo);
    if (!item) {
      console.warn(`⚠️ Não encontrei na ANS (ativa) para termo: ${termo}`);
      continue;
    }
    const op = await importarOperadoraGlobalPorRegistro(item.registro_ans);
    importadas.push(op);
    console.log(`✅ Operadora importada: ${op.codigoAns} - ${op.nomeFantasia ?? op.razaoSocial}`);
  }

  console.log("✅ Seed operadoras concluído:", { total: importadas.length });
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed de operadoras:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end().catch(() => {});
  });

