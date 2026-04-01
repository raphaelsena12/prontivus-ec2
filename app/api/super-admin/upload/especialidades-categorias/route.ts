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
 * POST /api/super-admin/upload/especialidades-categorias
 * Upload em massa de Categorias de Especialidade via Excel (.xlsx/.xls)
 *
 * Colunas esperadas:
 * - CODIGO (ou COD)
 * - NOME
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
        const codigo = toStr(row.codigo || row.cod);
        const nome = toStr(row.nome || row.name);

        if (!codigo) {
          erros.push(`Linha ${linha}: Código é obrigatório (coluna "CODIGO")`);
          ignorados++;
          continue;
        }

        if (!nome) {
          erros.push(`Linha ${linha}: Nome é obrigatório (coluna "NOME")`);
          ignorados++;
          continue;
        }

        const codigoNormalizado = codigo.trim().toUpperCase();

        const existente = await prisma.especialidadeCategoria.findUnique({
          where: { codigo: codigoNormalizado },
          select: { id: true },
        });

        if (existente) {
          await prisma.especialidadeCategoria.update({
            where: { id: existente.id },
            data: {
              nome,
              ativo: true,
            },
          });
          atualizados++;
        } else {
          await prisma.especialidadeCategoria.create({
            data: {
              codigo: codigoNormalizado,
              nome,
              ativo: true,
            },
          });
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
    console.error("Erro ao processar upload de categorias de especialidade:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao processar arquivo Excel" },
      { status: 500 }
    );
  }
}

