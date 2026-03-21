/**
 * Importa FICHAATENDIMENTO (export Firebird/CSV) → Consulta + Prontuario no PostgreSQL.
 *
 * Ligação paciente: NMATRICULA (legado) → mesmo critério do import CADSOCIAL (CPF ou CPF sintético por linha).
 * Médico: CADMEDICO (NUMEROCR) → Medico.crm da clínica; sem match → médico padrão da clínica.
 * TUSS: primeiro código ativo ou DEFAULT_TUSS_CODE (ex.: 20101010).
 *
 * Os CSVs em Copia/export_csv vêm do Firebird (script Python em Copia/exportar_tabelas_csv.py — DB_CONFIG).
 * Opcional: FILTER_CD_UNIDADE=1 para importar só fichas dessa unidade (se existir mais de uma no CSV).
 *
 * Uso:
 *   npx tsx scripts/import-fichas-atendimento.ts
 *   $env:LIMIT="500"; npx tsx scripts/import-fichas-atendimento.ts   # teste
 *   $env:SKIP_EXISTING_LEGACY="1"; npx tsx scripts/import-fichas-atendimento.ts  # não duplicar
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
const CSV_SOCIAL = process.env.CSV_SOCIAL || path.join(ROOT, "CADSOCIAL.csv");
const CSV_MEDICO = process.env.CSV_MEDICO || path.join(ROOT, "CADMEDICO.csv");
const CSV_RECEITA = process.env.CSV_RECEITA || path.join(ROOT, "RECEITA.csv");
const CSV_RECEITA_ITEM = process.env.CSV_RECEITA_ITEM || path.join(ROOT, "RECEITA_ITEM.csv");

const TENANT_QUERY = process.env.TENANT_NOME || "Clinica Elos";
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : undefined;
const BATCH_TX = Math.min(250, Math.max(1, parseInt(process.env.BATCH_TX || "100", 10)));
/** Timeout da transação interativa Prisma (ms); lote grande + RDS lento precisa de mais tempo. */
const TX_TIMEOUT_MS = Math.min(
  600_000,
  Math.max(15_000, parseInt(process.env.TX_TIMEOUT_MS || "180000", 10))
);

function normalizeCpf(raw: string | undefined): string {
  if (!raw) return "";
  const d = raw.replace(/\D/g, "");
  if (d.length === 11) return d;
  if (d.length === 10) return d.padStart(11, "0");
  return d;
}

function syntheticCpf(lineNo: number): string {
  return `8${String(lineNo).padStart(10, "0")}`.slice(0, 11);
}

function digitsOnly(s: string | undefined): string {
  return (s || "").replace(/\D/g, "");
}

/** 001 / 1 / 0001031 → mesma matrícula legada. */
function normMatricula(raw: string | undefined): string {
  const t = (raw || "").trim();
  if (!t) return "";
  const n = parseInt(t, 10);
  if (Number.isFinite(n) && n >= 0) return String(n);
  return t;
}

async function findTenant() {
  const q = TENANT_QUERY.trim();
  const byId = await prisma.tenant.findUnique({ where: { id: q } });
  if (byId) return byId;
  let byNome = await prisma.tenant.findFirst({
    where: { nome: { contains: q, mode: "insensitive" } },
  });
  if (byNome) return byNome;
  if (/elos/i.test(q)) {
    byNome = await prisma.tenant.findFirst({
      where: { nome: { contains: "Elos", mode: "insensitive" } },
    });
    if (byNome) return byNome;
  }
  throw new Error(`Tenant não encontrado: "${TENANT_QUERY}"`);
}

/** NMATRICULA → CPF final (igual ao script de pacientes). */
function buildMatriculaToCpf(): Map<string, string> {
  const raw = fs.readFileSync(CSV_SOCIAL, "utf8");
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
  rows.forEach((rec, i) => {
    const lineNo = i + 2;
    const m = normMatricula(rec.NMATRICULA);
    if (!m) return;
    let cpf = normalizeCpf(rec.CPF);
    if (cpf.length !== 11) cpf = syntheticCpf(lineNo);
    map.set(m, cpf);
  });
  return map;
}

/** CD_MEDICO (legado) → dígitos do CRM no cadastro antigo. */
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
    if (cd && crm.length >= 4) map.set(cd, crm);
  }
  return map;
}

function parseDateTime(data: string, hora: string): Date | null {
  const d = (data || "").trim().slice(0, 10);
  const h = (hora || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const time = /^\d{1,2}:\d{2}:\d{2}/.test(h) ? h.slice(0, 8).padStart(8, "0") : "12:00:00";
  const iso = `${d}T${time}`;
  const dt = new Date(iso);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function parseOptionalDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const s = raw.trim().slice(0, 19);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Prisma aceita number para campos Decimal no create. */
function dec(s: string | undefined): number | null {
  if (s == null || s.trim() === "") return null;
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function int(s: string | undefined): number | null {
  if (s == null || s.trim() === "") return null;
  const n = parseInt(s.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

/** Primeiro grupo de dígitos (evita "120/80" ou "85-90" virar número absurdo). */
function intFirst(s: string | undefined): number | null {
  if (s == null || s.trim() === "") return null;
  const m = s.trim().match(/^(\d+)/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}

/** Garante valor dentro de NUMERIC(precision, scale) do PostgreSQL (evita P2020 overflow). */
function fitDecimal(n: number | null, precision: number, scale: number): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  const maxIntDigits = precision - scale;
  const maxVal = 10 ** maxIntDigits - 10 ** (-scale);
  if (n > maxVal || n < -maxVal) return null;
  const f = 10 ** scale;
  return Math.round(n * f) / f;
}

/** Peso: se parecer gramas (ex.: 78000), converte para kg. */
function normalizarPesoKg(n: number | null): number | null {
  if (n == null) return null;
  if (n > 500 && n < 1_000_000) return n / 1000;
  return n;
}

/** Altura: valores 100–280 tratados como cm → metros (schema Decimal 4,2 máx 99,99). */
function normalizarAlturaM(n: number | null): number | null {
  if (n == null) return null;
  if (n > 99.99 && n <= 280) return n / 100;
  return n;
}

function legacyTag(u: string, n: string, data: string, hora: string): string {
  return `LEGACY_FICHA:u=${u};n=${n};d=${data};t=${hora}`;
}

function normCdMedicoLegacy(raw: string | undefined): string {
  const t = (raw || "").trim();
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? String(n) : t;
}

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

type LegacyReceitaItem = {
  medicamento: string;
  posologia: string;
  dosagem: string | null;
  duracao: string | null;
};

function buildFichaLegacyReceitas() {
  const fichaToReceitaTexts = new Map<string, string[]>();
  const fichaToReceitaItens = new Map<string, LegacyReceitaItem[]>();
  const receitaKeyToFicha = new Map<string, string>();

  if (fs.existsSync(CSV_RECEITA)) {
    const raw = fs.readFileSync(CSV_RECEITA, "utf8");
    const rows = parse(raw, {
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
      const arr = fichaToReceitaTexts.get(fk) ?? [];
      if (!arr.includes(txt)) arr.push(txt);
      fichaToReceitaTexts.set(fk, arr);
    }
  }

  if (fs.existsSync(CSV_RECEITA_ITEM)) {
    const raw = fs.readFileSync(CSV_RECEITA_ITEM, "utf8");
    const rows = parse(raw, {
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
      const medicamento = medicamentoCod
        ? `MED-LEG-${medicamentoCod}`
        : "PRESCRICAO LEGADA";
      const posologia = (r.POSOLOGIA || "").trim() || "Uso conforme orientação médica";
      const dosagem =
        [(r.DOSE || "").trim(), (r.UNIDMEDIDA || "").trim()].filter(Boolean).join(" ") || null;
      const duracao =
        [(r.TRATAMENTO || "").trim(), (r.PERIODO || "").trim()].filter(Boolean).join(" / ") || null;

      const arr = fichaToReceitaItens.get(fk) ?? [];
      arr.push({ medicamento, posologia, dosagem, duracao });
      fichaToReceitaItens.set(fk, arr);
    }
  }

  return { fichaToReceitaTexts, fichaToReceitaItens };
}

async function main() {
  console.log("Ficha CSV:", CSV_FICHA);
  if (!fs.existsSync(CSV_FICHA)) throw new Error(`Arquivo não encontrado: ${CSV_FICHA}`);

  const tenant = await findTenant();
  const clinicaId = tenant.id;
  console.log("Tenant:", tenant.nome, "|", clinicaId);

  const matriculaToCpf = buildMatriculaToCpf();
  console.log("Matrículas no CADSOCIAL:", matriculaToCpf.size);

  const pacientes = await prisma.paciente.findMany({
    where: { clinicaId },
    select: { id: true, cpf: true },
  });
  const cpfToPacienteId = new Map(pacientes.map((p) => [digitsOnly(p.cpf), p.id]));
  console.log("Pacientes na clínica:", pacientes.length);

  const medicos = await prisma.medico.findMany({
    where: { clinicaId, ativo: true },
    select: { id: true, crm: true },
    orderBy: { createdAt: "asc" },
  });
  const medicosAll = await prisma.medico.findMany({
    where: { clinicaId },
    select: { id: true, crm: true, ativo: true },
    orderBy: { createdAt: "asc" },
  });
  if (medicosAll.length === 0) throw new Error("Nenhum médico na clínica. Rode import-medicos-cadmedico ou cadastre um.");
  const defaultMedicoId = medicos[0]?.id ?? medicosAll[0].id;

  /** CRM importado como `...-LM{CD_MEDICO}` (ver import-medicos-cadmedico.ts). */
  const legacyCdToMedicoId = new Map<string, string>();
  for (const m of medicosAll) {
    const mt = m.crm.match(/-LM(\d+)$/i);
    if (mt) legacyCdToMedicoId.set(mt[1], m.id);
  }

  const crmDigitsToMedicoId = new Map<string, string>();
  for (const m of medicosAll.filter((x) => x.ativo === true)) {
    const d = digitsOnly(m.crm);
    if (d.length >= 4 && !crmDigitsToMedicoId.has(d)) crmDigitsToMedicoId.set(d, m.id);
  }
  console.log("Médicos LM(CD):", legacyCdToMedicoId.size, "| CRM dígitos:", crmDigitsToMedicoId.size, "| fallback:", defaultMedicoId);

  const cdToCrmDigits = buildCdMedicoToCrmDigits();
  const legacyReceitas = buildFichaLegacyReceitas();
  console.log(
    "Legado receita:",
    legacyReceitas.fichaToReceitaTexts.size,
    "fichas texto |",
    legacyReceitas.fichaToReceitaItens.size,
    "fichas item"
  );

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

  let tussId: string | null = null;
  const code = process.env.DEFAULT_TUSS_CODE?.trim();
  if (code) {
    const t = await prisma.codigoTuss.findFirst({ where: { codigoTuss: code, ativo: true } });
    tussId = t?.id ?? null;
  }
  if (!tussId) {
    const t = await prisma.codigoTuss.findFirst({
      where: { ativo: true, tipoProcedimento: "CONSULTA" },
      orderBy: { codigoTuss: "asc" },
    });
    tussId = t?.id ?? null;
  }
  if (!tussId) throw new Error("Nenhum CodigoTuss ativo encontrado.");
  console.log("TUSS:", tussId);

  const filterUnidade = process.env.FILTER_CD_UNIDADE?.trim();
  if (filterUnidade) console.log("FILTER_CD_UNIDADE:", filterUnidade);

  const legacySkip = new Set<string>();
  if (process.env.SKIP_EXISTING_LEGACY === "1") {
    const ex = await prisma.consulta.findMany({
      where: { clinicaId, observacoes: { startsWith: "LEGACY_FICHA:" } },
      select: { observacoes: true },
    });
    for (const e of ex) {
      const tag = e.observacoes?.split("\n\n")[0]?.trim();
      if (tag?.startsWith("LEGACY_FICHA:")) legacySkip.add(tag);
    }
    console.log("SKIP_EXISTING_LEGACY: tags já no banco:", legacySkip.size);
  }

  let processed = 0;
  let inserted = 0;
  let skippedNoPaciente = 0;
  let skippedNoData = 0;
  let skippedDuplicate = 0;

  type Pending = {
    consulta: {
      clinicaId: string;
      pacienteId: string;
      medicoId: string;
      dataHora: Date;
      dataHoraFim: Date | null;
      status: string;
      inicioAtendimento: Date | null;
      fimAtendimento: Date | null;
      observacoes: string;
      codigoTussId: string;
      pressaoSistolica: number | null;
      pressaoDiastolica: number | null;
      frequenciaCardiaca: number | null;
      saturacaoO2: number | null;
      temperatura: number | null;
      peso: number | null;
      altura: number | null;
    };
    prontuario: {
      clinicaId: string;
      pacienteId: string;
      medicoId: string;
      anamnese: string | null;
      exameFisico: string | null;
      diagnostico: null;
      conduta: string | null;
      evolucao: null;
    };
    consultaCids: Array<{ code: string; description: string }>;
    consultaPrescricoes: Array<{
      medicamento: string;
      dosagem: string | null;
      posologia: string;
      duracao: string | null;
    }>;
  };

  const pending: Pending[] = [];

  const flushBatch = async () => {
    if (pending.length === 0) return;
    const chunk = pending.splice(0, pending.length);
    await prisma.$transaction(
      async (tx) => {
        for (const { consulta: c, prontuario: pr, consultaCids, consultaPrescricoes } of chunk) {
          const created = await tx.consulta.create({ data: c });
          await tx.prontuario.create({
            data: { ...pr, consultaId: created.id },
          });
          if (consultaCids.length > 0) {
            await tx.consultaCid.createMany({
              data: consultaCids.map((x) => ({
                clinicaId: c.clinicaId,
                consultaId: created.id,
                code: x.code,
                description: x.description,
              })),
            });
          }
          if (consultaPrescricoes.length > 0) {
            await tx.consultaPrescricao.createMany({
              data: consultaPrescricoes.map((x) => ({
                clinicaId: c.clinicaId,
                consultaId: created.id,
                medicamento: x.medicamento,
                dosagem: x.dosagem,
                posologia: x.posologia,
                duracao: x.duracao,
              })),
            });
          }
        }
      },
      { timeout: TX_TIMEOUT_MS, maxWait: 120_000 }
    );
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
    if (LIMIT != null && inserted >= LIMIT) break;

    const r = row;
    if (filterUnidade && (r.CD_UNIDADE || "").trim() !== filterUnidade) continue;

    processed++;
    const nmat = normMatricula(r.NMATRICULA);
    if (!nmat) {
      skippedNoPaciente++;
      continue;
    }

    const cpf = matriculaToCpf.get(nmat);
    if (!cpf) {
      skippedNoPaciente++;
      continue;
    }

    const pacienteId = cpfToPacienteId.get(cpf);
    if (!pacienteId) {
      skippedNoPaciente++;
      continue;
    }

    const dataHora = parseDateTime(r.DATA || "", r.HORA || "");
    if (!dataHora) {
      skippedNoData++;
      continue;
    }

    const u = (r.CD_UNIDADE || "").trim();
    const n = (r.NFICHA || "").trim();
    const tag = legacyTag(u, n, (r.DATA || "").trim(), (r.HORA || "").trim());
    if (legacySkip.has(tag)) {
      skippedDuplicate++;
      continue;
    }

    const medicoId = resolveMedicoId(r.CD_MEDICO);

    const pSisRaw = intFirst(r.PRESSAO1);
    const pDiaRaw = intFirst(r.PRESSAO2);
    const pSis =
      pSisRaw != null && pSisRaw >= 0 && pSisRaw <= 300 ? pSisRaw : null;
    const pDia =
      pDiaRaw != null && pDiaRaw >= 0 && pDiaRaw <= 200 ? pDiaRaw : null;
    const bpmRaw = intFirst(r.BPM);
    const bpm =
      bpmRaw != null && bpmRaw >= 0 && bpmRaw <= 500 ? bpmRaw : null;
    const sat = fitDecimal(dec(r.SATURACAO), 5, 2);
    const temp = fitDecimal(dec(r.TEMPERATURA), 4, 1);
    const peso = fitDecimal(normalizarPesoKg(dec(r.PESO)), 5, 2);
    const altura = fitDecimal(normalizarAlturaM(dec(r.ESTATURA)), 4, 2);
    const obsParts = [tag];
    if ((r.OBSERVACAO || "").trim()) obsParts.push((r.OBSERVACAO || "").trim());
    const observacoes = obsParts.join("\n\n");

    const pos = (r.POSCONSULTA || "").trim();
    const receita = (r.RECEITA || "").trim();
    const anamnese =
      [pos, receita ? `— Receita / prescrição —\n${receita}` : ""].filter(Boolean).join("\n\n") || null;

    const inicioAt = parseOptionalDate(r.HR_ABRIU_CONSULTA);
    const fimAt = parseOptionalDate(r.HR_CONCLUIU_CONSULTA);
    const fk = fichaKey(u, n);

    const ciap = (r.CD_CIAP_S || "").trim();
    const consultaCids =
      ciap.length > 0
        ? [{ code: ciap, description: "CIAP legado (FICHAATENDIMENTO.CD_CIAP_S)" }]
        : [];

    const consultaPrescricoes: Pending["consultaPrescricoes"] = [];
    const legacyItens = fk ? legacyReceitas.fichaToReceitaItens.get(fk) ?? [] : [];
    for (const it of legacyItens) consultaPrescricoes.push(it);
    if (consultaPrescricoes.length === 0 && receita) {
      consultaPrescricoes.push({
        medicamento: "PRESCRICAO LEGADA",
        dosagem: null,
        posologia: receita,
        duracao: null,
      });
    }
    const legacyReceitaTexts = fk ? legacyReceitas.fichaToReceitaTexts.get(fk) ?? [] : [];
    for (const txt of legacyReceitaTexts) {
      if (consultaPrescricoes.some((x) => x.posologia === txt)) continue;
      consultaPrescricoes.push({
        medicamento: "PRESCRICAO LEGADA",
        dosagem: null,
        posologia: txt,
        duracao: null,
      });
    }

    pending.push({
      consulta: {
        clinicaId,
        pacienteId,
        medicoId,
        dataHora,
        dataHoraFim: fimAt ?? inicioAt ?? null,
        status: "REALIZADA",
        inicioAtendimento: inicioAt,
        fimAtendimento: fimAt,
        observacoes,
        codigoTussId: tussId!,
        pressaoSistolica: pSis,
        pressaoDiastolica: pDia,
        frequenciaCardiaca: bpm,
        saturacaoO2: sat,
        temperatura: temp,
        peso,
        altura,
      },
      prontuario: {
        clinicaId,
        pacienteId,
        medicoId,
        anamnese,
        exameFisico: (r.DESCEXCLI || "").trim() || null,
        diagnostico: null,
        conduta: (r.CONDUTA || "").trim() || null,
        evolucao: null,
      },
      consultaCids,
      consultaPrescricoes,
    });

    inserted++;

    if (pending.length >= BATCH_TX) await flushBatch();

    if (processed % 2500 === 0) {
      console.log("…", { processed, inserted, skippedNoPaciente, skippedNoData, skippedDuplicate });
      await flushBatch();
    }
  }

  await flushBatch();

  console.log("---");
  console.log("Processadas (linhas/registros CSV):", processed);
  console.log("Inseridas (consultas+prontuários):", inserted);
  console.log("Ignoradas (sem paciente / matrícula desconhecida):", skippedNoPaciente);
  console.log("Ignoradas (sem data/hora válida):", skippedNoData);
  console.log("Ignoradas (já importadas LEGACY_FICHA):", skippedDuplicate);
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

