import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseExcelFile, normalizeColumnName } from "@/lib/excel-utils";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";

function toStr(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

function normalizeTussCodigo(value: unknown): string | null {
  const s = toStr(value);
  if (!s) return null;
  // Mantém apenas dígitos (evita " 123.45 " etc). Se o seu TUSS tiver letras, ajuste aqui.
  const digits = s.replace(/\D/g, "");
  return digits.length ? digits : null;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) {
      return auth.response;
    }

    const formData = (await request.formData()) as any;
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Arquivo não fornecido" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const rows = parseExcelFile(buffer);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Arquivo Excel vazio" },
        { status: 400 }
      );
    }

    const erros: string[] = [];
    let criados = 0;
    let ignorados = 0;

    const normalizedRows = rows.map((row) => {
      const normalized: any = {};
      for (const [key, value] of Object.entries(row)) {
        normalized[normalizeColumnName(key)] = value;
      }
      return normalized;
    });

    for (let i = 0; i < normalizedRows.length; i++) {
      const row = normalizedRows[i];
      const linha = i + 2;

      try {
        const nome = row.nome || row.name || row.exame;
        const codigoTuss = normalizeTussCodigo(
          row.codigo_tuss ||
            row.codigotuss ||
            row.tuss ||
            row.codigo ||
            row.codugo_tuss // cobre planilhas com "Códugo TUSS"
        );

        if (!nome) {
          erros.push(`Linha ${linha}: Nome é obrigatório`);
          ignorados++;
          continue;
        }

        // Verificar se exame já existe
        const exameExistente = await prisma.exame.findFirst({
          where: {
            nome: nome.toString().trim(),
            clinicaId: auth.clinicaId!,
          },
        });

        if (exameExistente) {
          ignorados++;
          continue;
        }

        // TUSS: sem validações bloqueantes durante o upload.
        // Se o código existir no catálogo, vincula; se não existir, cria o exame sem vincular.
        const codigoTussEncontrado = codigoTuss
          ? await prisma.codigoTuss.findUnique({
              where: { codigoTuss },
              select: { id: true, categoriaExame: true },
            })
          : null;

        const tipoRow = toStr(row.tipo);
        const tipoFinal =
          (tipoRow ? tipoRow.toUpperCase() : null) ||
          (codigoTussEncontrado?.categoriaExame ? String(codigoTussEncontrado.categoriaExame) : null);

        // Criar exame
        await prisma.exame.create({
          data: {
            clinicaId: auth.clinicaId!,
            nome: nome.toString().trim(),
            descricao: row.descricao || row.desc ? (row.descricao || row.desc).toString().trim() : null,
            tipo: tipoFinal,
            codigoTussId: codigoTussEncontrado?.id ?? null,
            ativo: true,
          },
        });

        criados++;
      } catch (error: any) {
        erros.push(`Linha ${linha}: ${error.message || "Erro desconhecido"}`);
        ignorados++;
      }
    }

    return NextResponse.json({
      success: true,
      criados,
      ignorados,
      total: rows.length,
      erros: erros.slice(0, 50),
    });
  } catch (error: any) {
    console.error("Erro ao processar upload de exames:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao processar arquivo Excel" },
      { status: 500 }
    );
  }
}
