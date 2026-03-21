/**
 * Atualiza e-mails de médicos já cadastrados na clínica Elos para o formato
 * `{nome-slug}@clinicaelos.com.br` (mesma lógica do import-medicos-cadmedico.ts).
 *
 * Por padrão só altera contas que parecem import legado:
 *   - e-mail contendo legacy-import.invalid, ou
 *   - e-mail começando com legado.cd
 *
 * FORCE_ALL_MEDICOS_ELOS=1 — reescreve todos os médicos da clínica para o domínio IMPORT_EMAIL_DOMAIN
 * (cuidado: sobrescreve e-mails personalizados).
 *
 *   npx tsx scripts/update-medicos-emails-elos.ts
 *   DRY_RUN=1 npx tsx scripts/update-medicos-emails-elos.ts
 */
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

const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const TENANT_QUERY = process.env.TENANT_NOME || "Clinica Elos";
const DOMAIN = (process.env.IMPORT_EMAIL_DOMAIN || "clinicaelos.com.br").toLowerCase();
const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
const FORCE_ALL = process.env.FORCE_ALL_MEDICOS_ELOS === "1" || process.env.FORCE_ALL_MEDICOS_ELOS === "true";

function normNome(raw: string | undefined): string {
  return (raw || "")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugifyEmailLocal(nome: string): string {
  const ascii = nome
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  const compact = ascii.replace(/[^a-z0-9]+/g, "");
  return compact.slice(0, 48);
}

function allocateEmail(nome: string, cdNorm: string, usedEmails: Set<string>): string {
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

function cdFromCrmOrFallback(crm: string, usuarioId: string): string {
  const m = crm.match(/-LM(\d+)$/i);
  if (m) return m[1];
  return usuarioId.replace(/-/g, "").slice(0, 10) || "0";
}

function shouldUpdateEmail(email: string): boolean {
  const e = email.toLowerCase();
  if (FORCE_ALL) return !e.endsWith(`@${DOMAIN}`);
  return e.includes("legacy-import") || e.startsWith("legado.");
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

async function main() {
  console.log("DRY_RUN:", DRY_RUN, "| FORCE_ALL:", FORCE_ALL, "| DOMAIN:", DOMAIN);

  const tenant = await findTenant();
  const clinicaId = tenant.id;
  console.log("Tenant:", tenant.nome, "|", clinicaId);

  const medicos = await prisma.medico.findMany({
    where: { clinicaId },
    include: {
      usuario: { select: { id: true, email: true, nome: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const usedEmails = new Set(
    (await prisma.usuario.findMany({ select: { email: true } })).map((u) => u.email.toLowerCase()),
  );

  let updated = 0;
  let skipped = 0;

  for (const m of medicos) {
    const u = m.usuario;
    const oldEmail = u.email;
    if (!shouldUpdateEmail(oldEmail)) {
      skipped++;
      continue;
    }

    const nome = normNome(u.nome);
    if (!nome) {
      console.warn("Sem nome, ignorando:", u.id, oldEmail);
      skipped++;
      continue;
    }

    const cdNorm = cdFromCrmOrFallback(m.crm, u.id);

    usedEmails.delete(oldEmail.toLowerCase());

    let newEmail: string;
    try {
      newEmail = allocateEmail(nome, cdNorm, usedEmails);
    } catch (err) {
      usedEmails.add(oldEmail.toLowerCase());
      console.error(err);
      skipped++;
      continue;
    }

    if (newEmail.toLowerCase() === oldEmail.toLowerCase()) {
      skipped++;
      continue;
    }

    console.log(`${oldEmail} → ${newEmail}`);
    if (!DRY_RUN) {
      await prisma.usuario.update({
        where: { id: u.id },
        data: { email: newEmail },
      });
    }
    updated++;
  }

  console.log("---");
  console.log("Atualizados:", DRY_RUN ? `(dry-run) ${updated}` : updated);
  console.log("Ignorados (já no formato ou fora do critério):", skipped);
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
