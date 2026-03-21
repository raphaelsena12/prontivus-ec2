/**
 * Lista pacientes com mais registros em prontuarios.
 * Opcional: TENANT_ID=<uuid> ou TENANT_NOME (ex.: Elos) para filtrar uma clínica.
 *
 *   npx tsx scripts/top-pacientes-prontuarios.ts
 *   TENANT_NOME=Elos npx tsx scripts/top-pacientes-prontuarios.ts
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

let tenantId = process.env.TENANT_ID?.trim();
const tenantNome = process.env.TENANT_NOME?.trim();
const limit = Math.min(Math.max(Number(process.env.LIMIT) || 15, 1), 100);

async function resolveTenantId(): Promise<string | undefined> {
  if (tenantId) return tenantId;
  if (!tenantNome) return undefined;
  const rows = await prisma.$queryRawUnsafe<{ id: string; nome: string }[]>(
    `SELECT id, nome FROM tenants WHERE nome ILIKE $1 ORDER BY nome LIMIT 5`,
    `%${tenantNome.replace(/%/g, "\\%")}%`
  );
  if (rows.length === 0) {
    console.error(`Nenhum tenant encontrado para TENANT_NOME=${tenantNome}`);
    return undefined;
  }
  if (rows.length > 1) {
    console.error("Vários tenants; defina TENANT_ID ou refine TENANT_NOME:");
    for (const r of rows) console.error(`  ${r.id}  ${r.nome}`);
    return undefined;
  }
  return rows[0]!.id;
}

async function main() {
  tenantId = await resolveTenantId();
  if (tenantNome && !tenantId) {
    process.exitCode = 1;
    return;
  }
  const where = tenantId
    ? prisma.$queryRawUnsafe<
        {
          pacienteId: string;
          nome: string | null;
          numeroProntuario: string | null;
          clinicaId: string;
          total: bigint;
        }[]
      >(
        `SELECT p."pacienteId", pac.nome, pac."numeroProntuario", p."clinicaId",
                COUNT(*)::bigint AS total
         FROM "prontuarios" p
         JOIN "pacientes" pac ON pac."id" = p."pacienteId"
         WHERE p."clinicaId" = $1
         GROUP BY p."pacienteId", pac.nome, pac."numeroProntuario", p."clinicaId"
         ORDER BY total DESC
         LIMIT $2`,
        tenantId,
        limit
      )
    : prisma.$queryRawUnsafe<
        {
          pacienteId: string;
          nome: string | null;
          numeroProntuario: string | null;
          clinicaId: string;
          total: bigint;
        }[]
      >(
        `SELECT p."pacienteId", pac.nome, pac."numeroProntuario", p."clinicaId",
                COUNT(*)::bigint AS total
         FROM "prontuarios" p
         JOIN "pacientes" pac ON pac."id" = p."pacienteId"
         GROUP BY p."pacienteId", pac.nome, pac."numeroProntuario", p."clinicaId"
         ORDER BY total DESC
         LIMIT $1`,
        limit
      );

  const rows = await where;
  if (rows.length === 0) {
    console.log(
      tenantId
        ? "Nenhum prontuário encontrado para este tenant (importe fichas / consultas ou verifique o ambiente)."
        : "Nenhum prontuário no banco."
    );
  }
  for (const r of rows) {
    console.log(
      `${String(r.total).padStart(5)} pront. | ${r.pacienteId} | nº ${r.numeroProntuario ?? "-"} | ${r.nome ?? "?"} | clinica ${r.clinicaId}`
    );
  }
  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
