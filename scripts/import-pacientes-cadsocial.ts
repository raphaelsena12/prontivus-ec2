/**
 * Importa pacientes de CADSOCIAL.csv (export SSA) para um Tenant (clínica).
 * Uso: npx tsx scripts/import-pacientes-cadsocial.ts
 * Opcional: CSV_PATH=... TENANT_NOME="Clinica Elos"
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import readline from "readline";
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

const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const CSV_PATH =
  process.env.CSV_PATH ||
  path.join(__dirname, "..", "..", "Copia", "export_csv", "CADSOCIAL.csv");

const TENANT_QUERY = process.env.TENANT_NOME || "Clinica Elos";

function normalizeCpf(raw: string | undefined): string {
  if (!raw) return "";
  const d = raw.replace(/\D/g, "");
  if (d.length === 11) return d;
  if (d.length === 10) return d.padStart(11, "0");
  return d;
}

/** CPF sintético único por linha (11 dígitos) quando o export não traz CPF válido. Prefixo 8 evita colisão com CPFs reais comuns. */
function syntheticCpf(lineNo: number): string {
  return `8${String(lineNo).padStart(10, "0")}`.slice(0, 11);
}

function parseDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const s = raw.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + "T12:00:00.000Z");
  return Number.isNaN(d.getTime()) ? null : d;
}

function mapSexo(s: string | undefined): string {
  const u = (s || "").trim().toUpperCase();
  if (u === "M" || u === "F") return u;
  return "O";
}

async function findTenant() {
  const q = TENANT_QUERY.trim();

  const byId = await prisma.tenant.findUnique({
    where: { id: q },
  });
  if (byId) return byId;

  let byNome = await prisma.tenant.findFirst({
    where: { nome: { contains: q, mode: "insensitive" } },
  });
  if (byNome) return byNome;

  // Ex.: busca "Clinica Elos" → banco "Clínica Médica Elos"
  if (/elos/i.test(q)) {
    byNome = await prisma.tenant.findFirst({
      where: { nome: { contains: "Elos", mode: "insensitive" } },
    });
    if (byNome) return byNome;
  }

  const list = await prisma.tenant.findMany({
    select: { id: true, nome: true },
    take: 30,
    orderBy: { nome: "asc" },
  });
  console.error("Tenants disponíveis (amostra):", list);
  throw new Error(`Tenant não encontrado para: "${TENANT_QUERY}"`);
}

type Row = Record<string, string>;

function rowToObject(headers: string[], cols: string[]): Row {
  const r: Row = {};
  for (let i = 0; i < headers.length; i++) {
    r[headers[i]] = cols[i] ?? "";
  }
  return r;
}

async function main() {
  console.log("CSV:", CSV_PATH);
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`Arquivo não encontrado: ${CSV_PATH}`);
  }

  const tenant = await findTenant();
  console.log("Tenant:", tenant.nome, "| id:", tenant.id);

  const existing = await prisma.paciente.findMany({
    where: { clinicaId: tenant.id },
    select: { cpf: true },
  });
  const cpfSeen = new Set(existing.map((p) => p.cpf.replace(/\D/g, "")));

  const rl = readline.createInterface({
    input: fs.createReadStream(CSV_PATH, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let lineNo = 0;
  let headers: string[] = [];
  let inserted = 0;
  let skipped = 0;
  let skippedNoNome = 0;
  let skippedNoNasc = 0;
  const batch: Parameters<typeof prisma.paciente.createMany>[0]["data"] = [];
  const BATCH = 250;

  const flush = async () => {
    if (batch.length === 0) return;
    const res = await prisma.paciente.createMany({ data: batch });
    inserted += res.count;
    batch.length = 0;
  };

  for await (const line of rl) {
    lineNo++;
    const cols = line.split(";").map((c) => c.trim());

    if (lineNo === 1) {
      headers = cols;
      continue;
    }

    if (cols.length < 5 || !cols[4]) continue;

    const o = rowToObject(headers, cols);
    const nome = (o.NOME || "").trim();
    if (!nome) {
      skippedNoNome++;
      continue;
    }

    const dt = parseDate(o.DATANASCIMENTO);
    if (!dt) {
      skippedNoNasc++;
      continue;
    }

    let cpf = normalizeCpf(o.CPF);
    if (cpf.length !== 11) {
      cpf = syntheticCpf(lineNo);
    }

    if (cpfSeen.has(cpf)) {
      skipped++;
      continue;
    }
    cpfSeen.add(cpf);

    const ativo = (o.ATIVO || "T").trim().toUpperCase() !== "F";
    const obsParts = [o.ALERTA].filter(Boolean);
    const observacoes = obsParts.join("\n").trim() || null;

    batch.push({
      clinicaId: tenant.id,
      nome,
      cpf,
      rg: (o.RG || "").trim() || null,
      dataNascimento: dt,
      sexo: mapSexo(o.SEXO),
      email: (o.EMAIL || "").trim() || null,
      telefone: (o.FONE || "").trim() || null,
      celular: (o.CELULAR || "").trim() || null,
      cep: (o.CEP || "").replace(/\D/g, "").slice(0, 8) || null,
      endereco: (o.ENDERECO || "").trim() || null,
      numero: (o.NUMERO || "").trim() || null,
      complemento: (o.COMPLEMENTO || "").trim() || null,
      bairro: null,
      cidade: null,
      estado: (o.UFRG || "").trim().slice(0, 2) || null,
      nomeMae: (o.MAE || "").trim() || null,
      nomePai: (o.PAI || "").trim() || null,
      profissao: (o.PROFISSAO || "").trim() || null,
      estadoCivil: (o.ESTADO_CIVIL || "").trim() || null,
      observacoes,
      ativo,
      numeroProntuario: null,
    });

    if (batch.length >= BATCH) await flush();
  }

  await flush();

  console.log("---");
  console.log("Inseridos:", inserted);
  console.log("Ignorados (CPF já existia na clínica):", skipped);
  console.log("Ignorados (sem nome):", skippedNoNome);
  console.log("Ignorados (sem data nasc. válida):", skippedNoNasc);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
