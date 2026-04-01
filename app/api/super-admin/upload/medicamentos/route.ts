import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { parseExcelFile, normalizeColumnName } from "@/lib/excel-utils";

function toStr(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

function toBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (value === null || value === undefined) return false;
  const s = String(value).trim().toLowerCase();
  return (
    s === "true" ||
    s === "1" ||
    s === "sim" ||
    s === "s" ||
    s === "yes" ||
    s === "y" ||
    s === "verdadeiro" ||
    s === "ativo" ||
    s === "active"
  );
}

function normalizeStatus(value: unknown): string {
  const raw = toStr(value);
  if (!raw) return "active";
  const s = raw.toLowerCase();
  if (["inativo", "inactive", "0", "false", "desativado"].includes(s)) return "inactive";
  return "active";
}

async function checkAuthorization() {
  const session = await getSession();
  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }),
    };
  }
  if (session.user.tipo !== TipoUsuario.SUPER_ADMIN) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Acesso negado" }, { status: 403 }),
    };
  }
  return { authorized: true as const };
}

/**
 * POST /api/super-admin/upload/medicamentos
 * Upload em massa de Medicamentos via Excel (.xlsx/.xls)
 *
 * Colunas esperadas:
 * - active_ingredient
 * - commercial_name
 * - pharmaceutical_form
 * - concentration
 * - presentation
 * - unit
 * - therapeutic_class
 * - prescription_type
 * - control_type
 * - pregnancy_risk
 * - pediatric_use
 * - hepatic_alert
 * - renal_alert
 * - high_risk
 * - status (active|inactive)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const formData = (await request.formData()) as any;
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "Arquivo não fornecido" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const rows = parseExcelFile(buffer);
    if (rows.length === 0) {
      return NextResponse.json({ error: "Arquivo Excel vazio" }, { status: 400 });
    }

    const normalizedRows = rows.map((row) => {
      const normalized: any = {};
      for (const [key, value] of Object.entries(row)) {
        normalized[normalizeColumnName(key)] = value;
      }
      return normalized;
    });

    const erros: string[] = [];
    let criados = 0;
    let atualizados = 0;
    let ignorados = 0;

    for (let i = 0; i < normalizedRows.length; i++) {
      const row = normalizedRows[i];
      const linha = i + 2;

      try {
        const nomeComercial = toStr(row.commercial_name || row.nome_comercial || row.nome);
        const principioAtivo = toStr(row.active_ingredient || row.principio_ativo || row.principioativo);

        if (!nomeComercial) {
          erros.push(`Linha ${linha}: commercial_name (nome comercial) é obrigatório`);
          ignorados++;
          continue;
        }

        const status = normalizeStatus(row.status);
        const data: any = {
          clinicaId: null,
          nome: nomeComercial,
          principioAtivo: principioAtivo ?? null,
          pharmaceuticalForm: toStr(row.pharmaceutical_form) ?? null,
          concentracao: toStr(row.concentration) ?? null,
          apresentacao: toStr(row.presentation) ?? null,
          unidade: toStr(row.unit) ?? null,
          therapeuticClass: toStr(row.therapeutic_class) ?? null,
          prescriptionType: toStr(row.prescription_type) ?? null,
          controlType: toStr(row.control_type) ?? null,
          pregnancyRisk: toBool(row.pregnancy_risk),
          pediatricUse: toBool(row.pediatric_use),
          hepaticAlert: toBool(row.hepatic_alert),
          renalAlert: toBool(row.renal_alert),
          highRisk: toBool(row.high_risk),
          status,
          ativo: status === "active",
        };

        // Chave "natural" aproximada para evitar duplicados (já que numeroRegistro pode ser null)
        const existente = await prisma.medicamento.findFirst({
          where: {
            clinicaId: null,
            nome: data.nome,
            principioAtivo: data.principioAtivo,
            concentracao: data.concentracao,
            apresentacao: data.apresentacao,
            unidade: data.unidade,
          },
          select: { id: true },
        });

        if (existente) {
          await prisma.medicamento.update({
            where: { id: existente.id },
            data,
          });
          atualizados++;
        } else {
          await prisma.medicamento.create({ data });
          criados++;
        }
      } catch (error: any) {
        erros.push(`Linha ${linha}: ${error?.message || "Erro desconhecido"}`);
        ignorados++;
      }
    }

    const importados = criados + atualizados;
    return NextResponse.json({
      success: importados,
      criados,
      atualizados,
      ignorados,
      total: rows.length,
      erros: erros.slice(0, 50),
    });
  } catch (error: any) {
    console.error("Erro ao processar upload de medicamentos:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao processar arquivo Excel" },
      { status: 500 }
    );
  }
}

