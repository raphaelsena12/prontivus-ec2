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

function toBool(value: unknown): boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value;
  const s = String(value).trim().toLowerCase();
  if (["true", "1", "sim", "s", "yes", "y", "verdadeiro", "ativo", "active"].includes(s)) return true;
  if (["false", "0", "nao", "não", "n", "no", "falso", "inativo", "inactive"].includes(s)) return false;
  return null;
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
 * POST /api/super-admin/upload/operadoras
 * Upload em massa de Operadoras via Excel (.xlsx/.xls)
 *
 * Colunas aceitas (nomes são normalizados; pode vir PT/EN):
 * - codigo_ans | codigoans | ans
 * - razao_social | razaosocial
 * - nome_fantasia | nomefantasia | fantasia
 * - cnpj
 * - telefone
 * - email
 * - cep
 * - endereco | logradouro
 * - numero
 * - complemento
 * - bairro
 * - cidade
 * - estado | uf
 * - pais
 * - ativo
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const formData = (await request.formData()) as any;
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "Arquivo não fornecido" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const rows = parseExcelFile(buffer);
    if (rows.length === 0) return NextResponse.json({ error: "Arquivo Excel vazio" }, { status: 400 });

    const normalizedRows = rows.map((row) => {
      const normalized: Record<string, unknown> = {};
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
        const codigoAns = toStr(row.codigo_ans ?? row.codigoans ?? row.ans);
        const razaoSocial = toStr(row.razao_social ?? row.razaosocial ?? row.razao);

        if (!codigoAns) {
          erros.push(`Linha ${linha}: codigo_ans (Código ANS) é obrigatório`);
          ignorados++;
          continue;
        }
        if (!razaoSocial) {
          erros.push(`Linha ${linha}: razao_social (Razão Social) é obrigatória`);
          ignorados++;
          continue;
        }

        const ativoParsed = toBool(row.ativo);
        const data = {
          clinicaId: null as any,
          codigoAns,
          razaoSocial,
          nomeFantasia: toStr(row.nome_fantasia ?? row.nomefantasia ?? row.fantasia),
          cnpj: toStr(row.cnpj),
          telefone: toStr(row.telefone),
          email: toStr(row.email),
          cep: toStr(row.cep),
          endereco: toStr(row.endereco ?? row.logradouro),
          numero: toStr(row.numero),
          complemento: toStr(row.complemento),
          bairro: toStr(row.bairro),
          cidade: toStr(row.cidade),
          estado: toStr(row.estado ?? row.uf),
          pais: toStr(row.pais) ?? "Brasil",
          ativo: ativoParsed ?? true,
        };

        const existente = await prisma.operadora.findFirst({
          where: { clinicaId: null, codigoAns },
          select: { id: true },
        });

        if (existente) {
          await prisma.operadora.update({
            where: { id: existente.id },
            data,
          });
          atualizados++;
        } else {
          await prisma.operadora.create({ data });
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
    console.error("Erro ao processar upload de operadoras:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao processar arquivo Excel" },
      { status: 500 }
    );
  }
}

