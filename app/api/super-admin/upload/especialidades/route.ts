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
 * POST /api/super-admin/upload/especialidades
 * Upload em massa de Especialidades via Excel (.xlsx/.xls)
 *
 * Colunas esperadas:
 * - CODIGO (ou COD)
 * - NOME
 * - DESCRICAO (opcional)
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
        const descricao = toStr(row.descricao || row.desc);

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

        const existente = await prisma.especialidadeMedica.findUnique({
          where: { codigo },
          select: { id: true },
        });

        if (existente) {
          await prisma.especialidadeMedica.update({
            where: { id: existente.id },
            data: {
              nome,
              descricao,
              ativo: true,
            },
          });
          atualizados++;
        } else {
          await prisma.especialidadeMedica.create({
            data: {
              codigo,
              nome,
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
      // `UploadExcelDialog` mostra `${data.success || data.criados}`; aqui `success` é o total numérico importado
      success: importados,
      criados,
      atualizados,
      ignorados,
      total: rows.length,
      erros: erros.slice(0, 50),
    });
  } catch (error: any) {
    console.error("Erro ao processar upload de especialidades:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao processar arquivo Excel" },
      { status: 500 }
    );
  }
}

