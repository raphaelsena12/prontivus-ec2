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
 * POST /api/super-admin/upload/cids
 * Upload em massa de CIDs via Excel (.xlsx/.xls)
 *
 * Colunas esperadas:
 * - CID (ou CODIGO)
 * - DESCRICAO
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

    // Normalizar nomes das colunas (CID, DESCRIÇÃO, etc.)
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
      const linha = i + 2; // +2 porque a linha 1 é cabeçalho

      try {
        const codigoRaw =
          row.cid ||
          row.codigo ||
          row.cod ||
          row.cid_codigo ||
          row.codigo_cid;
        const descricaoRaw = row.descricao || row.desc || row.descricao_cid;

        const codigo = toStr(codigoRaw)?.toUpperCase();
        const descricao = toStr(descricaoRaw);

        if (!codigo) {
          erros.push(`Linha ${linha}: CID é obrigatório (coluna "CID")`);
          ignorados++;
          continue;
        }

        if (!descricao || descricao.length < 3) {
          erros.push(`Linha ${linha}: Descrição é obrigatória (mín. 3 caracteres)`);
          ignorados++;
          continue;
        }

        // Como clinicaId é NULL, não dá para confiar 100% no @@unique([clinicaId, codigo]) no Postgres
        // (NULLs não entram na unicidade). Então fazemos findFirst + update/create.
        const existente = await prisma.cid.findFirst({
          where: { clinicaId: null, codigo },
          select: { id: true },
        });

        if (existente) {
          await prisma.cid.update({
            where: { id: existente.id },
            data: {
              descricao,
              ativo: true,
            },
          });
          atualizados++;
        } else {
          await prisma.cid.create({
            data: {
              clinicaId: null,
              codigo,
              descricao,
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
      // OBS: o `UploadExcelDialog` usa `data.success || data.criados`, então aqui retornamos o total numérico.
      success: importados,
      criados,
      atualizados,
      ignorados,
      total: rows.length,
      erros: erros.slice(0, 50),
    });
  } catch (error: any) {
    console.error("Erro ao processar upload de CIDs:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao processar arquivo Excel" },
      { status: 500 }
    );
  }
}

