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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
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
 * POST /api/super-admin/upload/especialidades-categorias-itens
 * Upload em massa de vínculos Especialidade ↔ Categoria via Excel (.xlsx/.xls)
 *
 * Colunas aceitas (uma das combinações):
 * - ESPECIALIDADE_ID + CATEGORIA_ID (UUID)
 * - ESPECIALIDADE_CODIGO + CATEGORIA_CODIGO
 *
 * Também aceitamos aliases comuns:
 * - especialidade_id / categoria_id
 * - area_id como alias de categoria_id (compatibilidade com planilhas legadas)
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
    let ignorados = 0;

    for (let i = 0; i < normalizedRows.length; i++) {
      const row = normalizedRows[i];
      const linha = i + 2;

      try {
        const especialidadeIdRaw = toStr(row.especialidade_id || row.especialidadeid);
        const categoriaIdRaw = toStr(row.categoria_id || row.categoriaid || row.area_id || row.areaid);

        const especialidadeCodigo = toStr(row.especialidade_codigo || row.especialidade_cod || row.especialidade);
        const categoriaCodigo = toStr(row.categoria_codigo || row.categoria_cod || row.categoria || row.area_codigo || row.area_cod);

        // Observação: planilhas legadas podem trazer "especialidade_id"/"area_id" como NÚMERO (na prática, código),
        // não como UUID do banco. Aqui tratamos assim:
        // - se for UUID => usa como ID
        // - caso contrário => resolve por codigo
        let resolvedEspecialidadeId: string | null =
          especialidadeIdRaw && isUuid(especialidadeIdRaw) ? especialidadeIdRaw : null;
        let resolvedCategoriaId: string | null =
          categoriaIdRaw && isUuid(categoriaIdRaw) ? categoriaIdRaw : null;

        if (!resolvedEspecialidadeId) {
          const codigoParaResolver = (especialidadeCodigo || especialidadeIdRaw)?.trim();
          if (!codigoParaResolver) {
            erros.push(`Linha ${linha}: Informe ESPECIALIDADE_ID (UUID) ou ESPECIALIDADE_CODIGO (ou especialidade_id numérico como código)`);
            ignorados++;
            continue;
          }
          const esp = await prisma.especialidadeMedica.findUnique({
            where: { codigo: codigoParaResolver.toUpperCase() },
            select: { id: true },
          });
          if (!esp) {
            erros.push(`Linha ${linha}: Especialidade não encontrada para código "${codigoParaResolver}"`);
            ignorados++;
            continue;
          }
          resolvedEspecialidadeId = esp.id;
        }

        if (!resolvedCategoriaId) {
          const codigoParaResolver = (categoriaCodigo || categoriaIdRaw)?.trim();
          if (!codigoParaResolver) {
            erros.push(`Linha ${linha}: Informe CATEGORIA_ID/AREA_ID (UUID) ou CATEGORIA_CODIGO (ou area_id numérico como código)`);
            ignorados++;
            continue;
          }
          const cat = await prisma.especialidadeCategoria.findUnique({
            where: { codigo: codigoParaResolver.toUpperCase() },
            select: { id: true },
          });
          if (!cat) {
            erros.push(`Linha ${linha}: Categoria não encontrada para código "${codigoParaResolver}"`);
            ignorados++;
            continue;
          }
          resolvedCategoriaId = cat.id;
        }

        const existe = await prisma.especialidadeCategoriaItem.findFirst({
          where: { especialidadeId: resolvedEspecialidadeId, categoriaId: resolvedCategoriaId },
          select: { id: true },
        });
        if (existe) {
          ignorados++;
          continue;
        }

        await prisma.especialidadeCategoriaItem.create({
          data: { especialidadeId: resolvedEspecialidadeId, categoriaId: resolvedCategoriaId },
        });
        criados++;
      } catch (error: any) {
        erros.push(`Linha ${linha}: ${error?.message || "Erro desconhecido"}`);
        ignorados++;
      }
    }

    return NextResponse.json({
      success: criados,
      criados,
      ignorados,
      total: rows.length,
      erros: erros.slice(0, 50),
    });
  } catch (error: any) {
    console.error("Erro ao processar upload de vínculos especialidade↔categoria:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao processar arquivo Excel" },
      { status: 500 }
    );
  }
}

