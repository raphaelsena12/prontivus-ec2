/**
 * Importa CADMEDICO.csv (export Firebird — ver Copia/exportar_tabelas_csv.py) para Usuario + Medico na clínica Elos.
 *
 * CRM gravado como: `{NUMEROCR limpo}-{UF}-LM{CD_MEDICO}` para mapear 1:1 o CD_MEDICO das fichas (import-fichas-atendimento.ts).
 *
 * E-mail: `{nome-slug}@clinicaelos.com.br` (ajustável com IMPORT_EMAIL_DOMAIN). Colisões viram sufixo + CD ou contador.
 *
 * Senha inicial: IMPORT_MEDICO_PASSWORD (default Import@Elos2026!) — usuários ficam com primeiroAcesso=true.
 *
 * Uso:
 *   npx tsx scripts/import-medicos-cadmedico.ts
 *   $env:ONLY_TIPOS="CRM,CMR,CROO"   # opcional: só alguns TIPCODIGO (senão importa FLG_ATIVO=T com nome)
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../lib/generated/prisma/client";
import { TipoUsuario } from "../lib/generated/prisma/enums";
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
const CSV_MED = process.env.CSV_MEDICO || path.join(ROOT, "CADMEDICO.csv");
const TENANT_QUERY = process.env.TENANT_NOME || "Clinica Elos";
const IMPORT_PWD = process.env.IMPORT_MEDICO_PASSWORD || "Import@Elos2026!";
const DOMAIN = (process.env.IMPORT_EMAIL_DOMAIN || "clinicaelos.com.br").toLowerCase();
const ONLY_TIPOS = process.env.ONLY_TIPOS?.split(",")
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);

function digitsOnly(s: string | undefined): string {
  return (s || "").replace(/\D/g, "");
}

function normCdMedico(raw: string | undefined): string {
  const t = (raw || "").trim();
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? String(n) : t;
}

function normNome(raw: string | undefined): string {
  return (raw || "")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parte local do e-mail: só letras/números, minúsculas (ex.: JOÃO SILVA → joaosilva). */
function slugifyEmailLocal(nome: string): string {
  const ascii = nome
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  const compact = ascii.replace(/[^a-z0-9]+/g, "");
  return compact.slice(0, 48);
}

/** Garante e-mail único no domínio configurado. */
function allocateEmail(
  nome: string,
  cdNorm: string,
  usedEmails: Set<string>,
): string {
  let base = slugifyEmailLocal(nome);
  if (base.length < 2) base = `medico${cdNorm}`;

  const tryLocal = (local: string) => {
    const full = `${local}@${DOMAIN}`.toLowerCase();
    if (usedEmails.has(full)) return null;
    usedEmails.add(full);
    return full;
  };

  let hit = tryLocal(base);
  if (hit) return hit;

  hit = tryLocal(`${base}${cdNorm}`);
  if (hit) return hit;

  hit = tryLocal(`${base}.${cdNorm}`);
  if (hit) return hit;

  for (let i = 2; i < 1000; i++) {
    hit = tryLocal(`${base}${cdNorm}${i}`);
    if (hit) return hit;
  }

  throw new Error(`Não foi possível gerar e-mail único para: ${nome} (cd=${cdNorm})`);
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

function especialidadePorTipo(tip: string | undefined): string {
  const u = (tip || "").trim().toUpperCase();
  if (u === "CRM" || u === "CMR") return "Clínica Geral";
  if (u.startsWith("CROO")) return "Odontologia";
  if (u === "COREN" || u === "CRN") return "Enfermagem";
  if (u === "CRP") return "Psicologia";
  if (u === "CRF") return "Farmácia";
  if (u === "OTI") return "Optometria";
  return "Outros";
}

function isEnfermeiroTipo(tip: string | undefined): boolean {
  const u = (tip || "").trim().toUpperCase();
  return u === "COREN" || u === "CRN";
}

function crmFromRow(row: Record<string, string>, cdNorm: string): string {
  const rawNum = (row.NUMEROCR || "").trim().replace(/\s/g, "");
  let num = digitsOnly(rawNum);
  if (!num) {
    const alnum = rawNum.replace(/[^a-zA-Z0-9]/g, "");
    num = alnum || `SVC`;
  }
  const uf = ((row.UFCR || "XX").trim().slice(0, 2) || "XX").toUpperCase();
  return `${num}-${uf}-LM${cdNorm}`;
}

function cpfForUsuario(row: Record<string, string>, cdNorm: string, usedCpfs: Set<string>): string {
  let c = digitsOnly(row.CPF);
  if (c.length !== 11) c = `7${cdNorm.padStart(10, "0")}`.slice(0, 11);
  while (usedCpfs.has(c)) {
    const n = BigInt("1" + c) + 1n;
    c = n.toString().slice(-11).padStart(11, "0");
  }
  usedCpfs.add(c);
  return c;
}

async function main() {
  console.log("CSV:", CSV_MED);
  if (!fs.existsSync(CSV_MED)) throw new Error(`Arquivo não encontrado: ${CSV_MED}`);

  const tenant = await findTenant();
  const clinicaId = tenant.id;
  console.log("Tenant:", tenant.nome, "|", clinicaId);

  const raw = fs.readFileSync(CSV_MED, "utf8");
  const rows = parse(raw, {
    bom: true,
    columns: true,
    delimiter: ";",
    relax_quotes: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, string>[];

  const senhaHash = await bcrypt.hash(IMPORT_PWD, 10);

  const existingCpfs = new Set(
    (await prisma.usuario.findMany({ select: { cpf: true } })).map((u) => digitsOnly(u.cpf)),
  );
  const usedCpfs = new Set(existingCpfs);

  const usedEmails = new Set(
    (await prisma.usuario.findMany({ select: { email: true } })).map((u) => u.email.toLowerCase()),
  );

  const crmExistentes = new Set(
    (await prisma.medico.findMany({ where: { clinicaId }, select: { crm: true } })).map((m) => m.crm),
  );

  let createdU = 0;
  let createdM = 0;
  let skipped = 0;
  let skippedTipo = 0;

  for (const row of rows) {
    const nome = normNome(row.NOME);
    if (!nome) {
      skipped++;
      continue;
    }

    const ativo = (row.FLG_ATIVO || "T").trim().toUpperCase() !== "F";

    const tip = (row.TIPCODIGO || "").trim().toUpperCase();
    if (ONLY_TIPOS?.length) {
      const ok = ONLY_TIPOS.some((o) => tip === o || tip.startsWith(o));
      if (!ok) {
        skippedTipo++;
        continue;
      }
    }

    const cdNorm = normCdMedico(row.CD_MEDICO);
    if (!cdNorm) {
      skipped++;
      continue;
    }

    const crm = crmFromRow(row, cdNorm);

    if (crmExistentes.has(crm)) {
      skipped++;
      continue;
    }

    const email = allocateEmail(nome, cdNorm, usedEmails);

    let usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) {
      const cpf = cpfForUsuario(row, cdNorm, usedCpfs);
      usuario = await prisma.usuario.create({
        data: {
          email,
          senha: senhaHash,
          nome,
          cpf,
          tipo: TipoUsuario.MEDICO,
          clinicaId,
          telefone: (row.FONE || "").trim() || null,
          ativo,
          primeiroAcesso: true,
          isEnfermeiro: isEnfermeiroTipo(row.TIPCODIGO),
        },
      });
      createdU++;
    } else {
      const jaMedico = await prisma.medico.findFirst({
        where: { clinicaId, usuarioId: usuario.id },
      });
      if (jaMedico) {
        skipped++;
        continue;
      }
    }

    try {
      await prisma.usuarioTenant.upsert({
        where: {
          usuarioId_tenantId: { usuarioId: usuario.id, tenantId: clinicaId },
        },
        create: {
          usuarioId: usuario.id,
          tenantId: clinicaId,
          tipo: TipoUsuario.MEDICO,
          ativo,
          isPrimary: false,
        },
        update: { ativo },
      });
    } catch {
      /* tabela pode não existir em versões antigas */
    }

    await prisma.medico.create({
      data: {
        clinicaId,
        usuarioId: usuario.id,
        crm,
        especialidade: especialidadePorTipo(row.TIPCODIGO),
        ativo,
      },
    });
    crmExistentes.add(crm);
    createdM++;
  }

  console.log("---");
  console.log("Usuários criados:", createdU);
  console.log("Médicos criados:", createdM);
  console.log("Linhas ignoradas (vazias / CRM já existia / sem CD / usuário já médico):", skipped);
  console.log("Ignoradas por ONLY_TIPOS:", skippedTipo);
  console.log(`Domínio e-mail: @${DOMAIN}`);
  console.log(`Senha inicial (todos): ${IMPORT_PWD} — altere após o primeiro acesso.`);
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
