/**
 * Corrige medicoId em Consultas (e Prontuários ligados) já importadas, usando o CSV FICHAATENDIMENTO
 * e o mesmo mapeamento CD_MEDICO → Médico (-LM{CD} no CRM) do import-fichas / import-medicos.
 *
 * Identifica cada consulta pelo prefixo LEGACY_FICHA nas observações (igual ao import).
 *
 * Uso:
 *   npx tsx scripts/repair-consultas-medico-legacy.ts
 *   $env:DRY_RUN="1"; npx tsx scripts/repair-consultas-medico-legacy.ts
 *   $env:LIMIT="2000"; npx tsx scripts/repair-consultas-medico-legacy.ts
 *   $env:FILTER_CD_UNIDADE="1"; npx tsx scripts/repair-consultas-medico-legacy.ts
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { parse as parseStream } from "csv-parse";
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

const ROOT = path.join(__dirname, "..", "..", "Copia", "export_csv");
const CSV_FICHA = process.env.CSV_FICHA || path.join(ROOT, "FICHAATENDIMENTO.csv");
const CSV_MEDICO = process.env.CSV_MEDICO || path.join(ROOT, "CADMEDICO.csv");
const TENANT_QUERY = process.env.TENANT_NOME || "Clinica Elos";
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : undefined;
const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
const BATCH = Math.min(80, parseInt(process.env.REPAIR_BATCH || "40", 10));

function digitsOnly(s: string | undefined): string {
  return (s || "").replace(/\D/g, "");
}

function legacyTag(u: string, n: string, data: string, hora: string): string {
  return `LEGACY_FICHA:u=${u};n=${n};d=${data};t=${hora}`;
}

function extractLegacyTag(obs: string | null | undefined): string | null {
  if (!obs) return null;
  const start = obs.indexOf("LEGACY_FICHA:");
  if (start < 0) return null;
  const from = obs.slice(start);
  const idx = from.indexOf("\n\n");
  return (idx === -1 ? from : from.slice(0, idx)).trim();
}

function normCdMedicoLegacy(raw: string | undefined): string {
  const t = (raw || "").trim();
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? String(n) : t;
}

async function findTenant() {
  const q = TENANT_QUERY.trim();
  const byId = await prisma.tenant.findUnique({ where: { id: q } });
  if (byId) return byId;
  let t = await prisma.tenant.findFirst({
    where: { nome: { contains: q, mode: "insensitive" } },
  });
  if (t) return t;
  if (/elos/i.test(q)) {
    t = await prisma.tenant.findFirst({
      where: { nome: { contains: "Elos", mode: "insensitive" } },
    });
    if (t) return t;
  }
  throw new Error(`Tenant não encontrado: "${TENANT_QUERY}"`);
}

function buildCdMedicoToCrmDigits(): Map<string, string> {
  if (!fs.existsSync(CSV_MEDICO)) return new Map();
  const raw = fs.readFileSync(CSV_MEDICO, "utf8");
  const rows = parse(raw, {
    bom: true,
    columns: true,
    delimiter: ";",
    relax_quotes: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, string>[];

  const map = new Map<string, string>();
  for (const r of rows) {
    const cd = (r.CD_MEDICO || "").trim();
    const crm = digitsOnly(r.NUMEROCR);
    if (cd && crm.length >= 4) map.set(normCdMedicoLegacy(cd), crm);
  }
  return map;
}

async function main() {
  console.log("CSV ficha:", CSV_FICHA);
  console.log("DRY_RUN:", DRY_RUN);
  if (!fs.existsSync(CSV_FICHA)) throw new Error(`Arquivo não encontrado: ${CSV_FICHA}`);

  const tenant = await findTenant();
  const clinicaId = tenant.id;
  console.log("Tenant:", tenant.nome, "|", clinicaId);

  const medicosAll = await prisma.medico.findMany({
    where: { clinicaId },
    select: { id: true, crm: true, ativo: true },
    orderBy: { createdAt: "asc" },
  });
  if (medicosAll.length === 0) throw new Error("Nenhum médico na clínica.");

  const medicosAtivos = medicosAll.filter((m) => m.ativo);
  const defaultMedicoId = medicosAtivos[0]?.id ?? medicosAll[0].id;

  const legacyCdToMedicoId = new Map<string, string>();
  for (const m of medicosAll) {
    const mt = m.crm.match(/-LM(\d+)$/i);
    if (mt) legacyCdToMedicoId.set(mt[1], m.id);
  }

  const crmDigitsToMedicoId = new Map<string, string>();
  for (const m of medicosAtivos) {
    const d = digitsOnly(m.crm);
    if (d.length >= 4 && !crmDigitsToMedicoId.has(d)) crmDigitsToMedicoId.set(d, m.id);
  }

  const cdToCrmDigits = buildCdMedicoToCrmDigits();

  function resolveMedicoId(cdMedicoRaw: string | undefined): string {
    const cd = normCdMedicoLegacy(cdMedicoRaw);
    if (!cd) return defaultMedicoId;
    const byLm = legacyCdToMedicoId.get(cd);
    if (byLm) return byLm;
    const crmLeg = cdToCrmDigits.get(cd);
    if (crmLeg) {
      const id = crmDigitsToMedicoId.get(crmLeg);
      if (id) return id;
    }
    return defaultMedicoId;
  }

  console.log("Médicos LM(CD):", legacyCdToMedicoId.size, "| fallback:", defaultMedicoId);

  const consultas = await prisma.consulta.findMany({
    where: { clinicaId, observacoes: { contains: "LEGACY_FICHA:" } },
    select: { id: true, medicoId: true, observacoes: true },
  });

  const tagToConsulta = new Map<string, { id: string; medicoId: string }>();
  let dupTags = 0;
  for (const c of consultas) {
    const tag = extractLegacyTag(c.observacoes);
    if (!tag) continue;
    if (tagToConsulta.has(tag)) dupTags++;
    else tagToConsulta.set(tag, { id: c.id, medicoId: c.medicoId });
  }
  console.log("Consultas com LEGACY_FICHA:", consultas.length);
  console.log("Tags únicas indexadas:", tagToConsulta.size, dupTags ? `(avisos tag duplicada no banco: ${dupTags})` : "");

  const filterUnidade = process.env.FILTER_CD_UNIDADE?.trim();
  if (filterUnidade) console.log("FILTER_CD_UNIDADE:", filterUnidade);

  let csvRows = 0;
  let matched = 0;
  let updated = 0;
  let alreadyOk = 0;
  let notFound = 0;

  type Job = { consultaId: string; medicoId: string };
  const queue: Job[] = [];

  const flush = async () => {
    if (queue.length === 0 || DRY_RUN) {
      queue.length = 0;
      return;
    }
    const chunk = queue.splice(0, queue.length);
    await prisma.$transaction(async (tx) => {
      for (const { consultaId, medicoId } of chunk) {
        await tx.consulta.update({
          where: { id: consultaId },
          data: { medicoId },
        });
        await tx.prontuario.updateMany({
          where: { consultaId },
          data: { medicoId },
        });
      }
    });
  };

  const stream = fs.createReadStream(CSV_FICHA, { encoding: "utf8" }).pipe(
    parseStream({
      bom: true,
      columns: true,
      delimiter: ";",
      relax_quotes: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }),
  );

  for await (const row of stream as AsyncIterable<Record<string, string>>) {
    const r = row;
    if (filterUnidade && (r.CD_UNIDADE || "").trim() !== filterUnidade) continue;

    if (LIMIT != null && csvRows >= LIMIT) break;
    csvRows++;

    const u = (r.CD_UNIDADE || "").trim();
    const n = (r.NFICHA || "").trim();
    const data = (r.DATA || "").trim();
    const hora = (r.HORA || "").trim();
    const tag = legacyTag(u, n, data, hora);

    const hit = tagToConsulta.get(tag);
    if (!hit) {
      notFound++;
      continue;
    }
    matched++;

    const newMedicoId = resolveMedicoId(r.CD_MEDICO);
    if (newMedicoId === hit.medicoId) {
      alreadyOk++;
      continue;
    }

    updated++;
    queue.push({ consultaId: hit.id, medicoId: newMedicoId });

    if (queue.length >= BATCH) await flush();

    if (csvRows % 5000 === 0) {
      console.log("…", { csvRows, matched, updated, alreadyOk, notFound });
      await flush();
    }
  }

  await flush();

  console.log("---");
  console.log("Linhas CSV consideradas (após filtro unidade):", csvRows);
  console.log("Tags encontradas no banco:", matched);
  console.log("Já com médico correto:", alreadyOk);
  console.log("Atualizadas (consulta + prontuário):", DRY_RUN ? `(dry-run) ${updated} seriam` : updated);
  console.log("CSV sem consulta correspondente (tag):", notFound);
  if (LIMIT != null) console.log("Modo LIMIT=", LIMIT);
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
