import "dotenv/config";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { parse as parseStream } from "csv-parse";
import { PrismaClient } from "../lib/generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não está definida");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const ROOT = path.join(__dirname, "..", "..", "Copia", "export_csv");
const CSV_FICHA = process.env.CSV_FICHA || path.join(ROOT, "FICHAATENDIMENTO.csv");
const CSV_RECEITA = process.env.CSV_RECEITA || path.join(ROOT, "RECEITA.csv");
const CSV_RECEITA_ITEM = process.env.CSV_RECEITA_ITEM || path.join(ROOT, "RECEITA_ITEM.csv");
const TENANT_QUERY = process.env.TENANT_NOME || "Clinica Elos";
const CHUNK = Math.min(2000, Math.max(100, parseInt(process.env.CHUNK || "500", 10)));

function normFicha(raw: string | undefined): string {
  const t = (raw || "").trim();
  if (!t) return "";
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? String(n) : t;
}
function fichaKey(cdUnidade: string | undefined, nFicha: string | undefined): string {
  const u = (cdUnidade || "").trim();
  const n = normFicha(nFicha);
  return u && n ? `${u}|${n}` : "";
}
function parseTagKey(obs: string | null | undefined): string {
  const tag = (obs || "").split("\n\n")[0] || "";
  const m = tag.match(/^LEGACY_FICHA:u=([^;]+);n=([^;]+);/);
  if (!m) return "";
  return fichaKey(m[1], m[2]);
}

type LegacyReceitaItem = {
  medicamento: string;
  posologia: string;
  dosagem: string | null;
  duracao: string | null;
};
type FichaExtra = {
  ciap: string | null;
  receitaTexto: string | null;
};

async function findTenantId() {
  const q = TENANT_QUERY.trim();
  const byId = await prisma.tenant.findUnique({ where: { id: q } });
  if (byId) return byId.id;
  const byNome = await prisma.tenant.findFirst({
    where: { nome: { contains: q, mode: "insensitive" } },
    select: { id: true },
  });
  if (!byNome) throw new Error(`Tenant não encontrado: ${TENANT_QUERY}`);
  return byNome.id;
}

function buildReceitaMaps() {
  const receitaKeyToFicha = new Map<string, string>();
  const fichaToReceitaText = new Map<string, string[]>();
  const fichaToItens = new Map<string, LegacyReceitaItem[]>();

  if (fs.existsSync(CSV_RECEITA)) {
    const rows = parse(fs.readFileSync(CSV_RECEITA, "utf8"), {
      bom: true,
      columns: true,
      delimiter: ";",
      relax_quotes: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as Record<string, string>[];
    for (const r of rows) {
      const fk = fichaKey(r.CD_UNIDADE, r.NFICHA);
      if (!fk) continue;
      const recKey = `${(r.CD_UNIDADE || "").trim()}|${(r.ANO_RECEITA || "").trim()}|${(r.CD_RECEITA || "").trim()}`;
      receitaKeyToFicha.set(recKey, fk);
      const txt = (r.RECEITA || "").trim();
      if (!txt) continue;
      const arr = fichaToReceitaText.get(fk) ?? [];
      if (!arr.includes(txt)) arr.push(txt);
      fichaToReceitaText.set(fk, arr);
    }
  }

  if (fs.existsSync(CSV_RECEITA_ITEM)) {
    const rows = parse(fs.readFileSync(CSV_RECEITA_ITEM, "utf8"), {
      bom: true,
      columns: true,
      delimiter: ";",
      relax_quotes: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as Record<string, string>[];
    for (const r of rows) {
      const recKey = `${(r.CD_UNIDADE || "").trim()}|${(r.ANO_RECEITA || "").trim()}|${(r.CD_RECEITA || "").trim()}`;
      const fk = receitaKeyToFicha.get(recKey);
      if (!fk) continue;
      const medicamentoCod = (r.CD_MEDICAMENTO || "").trim() || (r.CADPRO || "").trim();
      const medicamento = medicamentoCod ? `MED-LEG-${medicamentoCod}` : "PRESCRICAO LEGADA";
      const posologia = (r.POSOLOGIA || "").trim() || "Uso conforme orientação médica";
      const dosagem = [(r.DOSE || "").trim(), (r.UNIDMEDIDA || "").trim()].filter(Boolean).join(" ") || null;
      const duracao = [(r.TRATAMENTO || "").trim(), (r.PERIODO || "").trim()].filter(Boolean).join(" / ") || null;
      const arr = fichaToItens.get(fk) ?? [];
      arr.push({ medicamento, posologia, dosagem, duracao });
      fichaToItens.set(fk, arr);
    }
  }

  return { fichaToReceitaText, fichaToItens };
}

async function buildFichaExtraMap(targetKeys: Set<string>) {
  const out = new Map<string, FichaExtra>();
  if (targetKeys.size === 0) return out;

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
    const key = fichaKey(row.CD_UNIDADE, row.NFICHA);
    if (!key || !targetKeys.has(key) || out.has(key)) continue;
    out.set(key, {
      ciap: (row.CD_CIAP_S || "").trim() || null,
      receitaTexto: (row.RECEITA || "").trim() || null,
    });
    if (out.size === targetKeys.size) break;
  }
  return out;
}

async function main() {
  const clinicaId = await findTenantId();
  console.log("Tenant:", clinicaId);

  const consultas = await prisma.consulta.findMany({
    where: { clinicaId, observacoes: { startsWith: "LEGACY_FICHA:" } },
    select: { id: true, observacoes: true },
  });
  console.log("Consultas LEGACY:", consultas.length);
  if (consultas.length === 0) return;

  const keyByConsulta = new Map<string, string>();
  const targetKeys = new Set<string>();
  for (const c of consultas) {
    const k = parseTagKey(c.observacoes);
    if (!k) continue;
    keyByConsulta.set(c.id, k);
    targetKeys.add(k);
  }
  console.log("Chaves de ficha:", targetKeys.size);

  const receitaMaps = buildReceitaMaps();
  console.log("Receitas mapeadas:", receitaMaps.fichaToReceitaText.size, "| Itens mapeados:", receitaMaps.fichaToItens.size);

  const fichaExtra = await buildFichaExtraMap(targetKeys);
  console.log("Fichas extra encontradas:", fichaExtra.size);

  let processed = 0;
  let insertedCids = 0;
  let insertedPresc = 0;

  for (let i = 0; i < consultas.length; i += CHUNK) {
    const chunk = consultas.slice(i, i + CHUNK);
    const ids = chunk.map((x) => x.id);

    const existingCids = await prisma.consultaCid.findMany({
      where: { clinicaId, consultaId: { in: ids } },
      select: { consultaId: true },
    });
    const existingPresc = await prisma.consultaPrescricao.findMany({
      where: { clinicaId, consultaId: { in: ids } },
      select: { consultaId: true },
    });
    const hasCid = new Set(existingCids.map((x) => x.consultaId));
    const hasPresc = new Set(existingPresc.map((x) => x.consultaId));

    const cidsData: Array<{ clinicaId: string; consultaId: string; code: string; description: string }> = [];
    const prescData: Array<{
      clinicaId: string;
      consultaId: string;
      medicamento: string;
      dosagem: string | null;
      posologia: string;
      duracao: string | null;
    }> = [];

    for (const c of chunk) {
      const k = keyByConsulta.get(c.id);
      if (!k) continue;
      const extra = fichaExtra.get(k);

      if (!hasCid.has(c.id) && extra?.ciap) {
        cidsData.push({
          clinicaId,
          consultaId: c.id,
          code: extra.ciap,
          description: "CIAP legado (FICHAATENDIMENTO.CD_CIAP_S)",
        });
      }

      if (!hasPresc.has(c.id)) {
        const itens = receitaMaps.fichaToItens.get(k) ?? [];
        for (const it of itens) {
          prescData.push({
            clinicaId,
            consultaId: c.id,
            medicamento: it.medicamento,
            dosagem: it.dosagem,
            posologia: it.posologia,
            duracao: it.duracao,
          });
        }
        if (itens.length === 0) {
          const textos = receitaMaps.fichaToReceitaText.get(k) ?? [];
          const baseTxt = extra?.receitaTexto ? [extra.receitaTexto, ...textos] : textos;
          const unicos = [...new Set(baseTxt.filter(Boolean))];
          for (const t of unicos) {
            prescData.push({
              clinicaId,
              consultaId: c.id,
              medicamento: "PRESCRICAO LEGADA",
              dosagem: null,
              posologia: t,
              duracao: null,
            });
          }
        }
      }
    }

    if (cidsData.length > 0) await prisma.consultaCid.createMany({ data: cidsData });
    if (prescData.length > 0) await prisma.consultaPrescricao.createMany({ data: prescData });

    processed += chunk.length;
    insertedCids += cidsData.length;
    insertedPresc += prescData.length;
    if (processed % (CHUNK * 4) === 0) {
      console.log("…", { processed, insertedCids, insertedPresc });
    }
  }

  console.log("---");
  console.log("Consultas processadas:", processed);
  console.log("CIDs inseridos:", insertedCids);
  console.log("Prescrições inseridas:", insertedPresc);
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

