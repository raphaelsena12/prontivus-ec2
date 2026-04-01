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

function parseDateFlexible(value: unknown): Date | null {
  const s = toStr(value);
  if (!s) return null;

  // dd/mm/yyyy
  const m1 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m1) {
    const [, dd, mm, yyyy] = m1;
    const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
    return isNaN(d.getTime()) ? null : d;
  }

  // yyyy-mm-dd
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m2) {
    const d = new Date(`${s}T00:00:00.000Z`);
    return isNaN(d.getTime()) ? null : d;
  }

  // Fallback: Date.parse
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function normalizeTipoProcedimento(value: unknown): string | null {
  const s = toStr(value);
  if (!s) return null;
  const v = s.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (v.includes("CONSULT")) return "CONSULTA";
  if (v.includes("EXAME")) return "EXAME";
  if (v.includes("PROCEDIMENTO") && v.includes("AMB")) return "PROCEDIMENTO_AMBULATORIAL";
  if (v.includes("CIRURG")) return "CIRURGIA";
  if (v.includes("OUTRO")) return "OUTROS";

  // Se já vier no formato do enum do sistema, manter
  if (
    ["CONSULTA", "EXAME", "PROCEDIMENTO_AMBULATORIAL", "CIRURGIA", "OUTROS"].includes(v)
  ) {
    return v;
  }

  return null;
}

function normalizeCategoriaExame(value: unknown): string | null {
  const s = toStr(value);
  if (!s) return null;
  const v = s.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (v.includes("LAB")) return "LABORATORIAL";
  if (v.includes("IMAG")) return "IMAGEM";
  if (v.includes("ANATOM")) return "ANATOMOPATOLOGICO";
  if (v.includes("FUNC")) return "FUNCIONAL";
  if (v.includes("GENET")) return "GENETICO";
  if (v.includes("OUTRO")) return "OUTROS";

  if (["LABORATORIAL", "IMAGEM", "ANATOMOPATOLOGICO", "FUNCIONAL", "GENETICO", "OUTROS"].includes(v)) {
    return v;
  }

  return null;
}

function parseBooleanFlexible(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const s = toStr(value);
  if (!s) return false;
  const v = s.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return ["SIM", "S", "TRUE", "1", "YES", "Y"].includes(v);
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
 * POST /api/super-admin/upload/codigos-tuss
 * Upload em massa do Catálogo TUSS via Excel (.xlsx/.xls)
 *
 * Colunas aceitas (nomes podem variar; normalizamos):
 * Layout novo (ANS Tabela 22 / tela "códigos_tuss" do anexo):
 * - codigo (ou codigo_tuss / código do termo)
 * - descricao_tuss (ou termo / descricao)
 * - sip_grupo
 * - categoria_prontivus
 * - categoria_sadt
 * - usa_guia_sadt (SIM/NÃO)
 * - subgrupo_tuss
 * - grupo_tuss
 * - capitulo_tuss
 * - fonte_ans_tabela22
 *
 * Layout antigo (ainda aceito):
 * - Tipo (CONSULTA / EXAME / PROCEDIMENTO_AMBULATORIAL / CIRURGIA / OUTROS)
 * - Categoria (apenas para EXAME: LABORATORIAL / IMAGEM / ANATOMOPATOLOGICO / FUNCIONAL / GENETICO / OUTROS)
 * - Data de início de vigência
 * - Data de fim de vigência (opcional)
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
        const codigo =
          toStr(
            row.codigo_do_termo ||
              row.codigo_termo ||
              row.codigodotermo ||
              row.codigo ||
              row.codigo_tuss ||
              row.codigotuss ||
              row.tuss
          )?.replace(/\s+/g, "");

        const descricao = toStr(
          row.descricao_tuss ||
            row.descricao ||
            row.termo ||
            row.desc
        );
        // Tipo e Categoria podem vir vazios na planilha; Tipo tem default para manter integridade do modelo
        const tipoProcedimento =
          normalizeTipoProcedimento(row.tipo || row.tipo_procedimento) || "OUTROS";
        const categoriaExame = normalizeCategoriaExame(row.categoria || row.categoria_exame);

        const sipGrupo = toStr(row.sip_grupo || row.sipgrupo);
        const categoriaProntivus = toStr(row.categoria_prontivus || row.categoriaprontivus);
        const categoriaSadt = toStr(row.categoria_sadt || row.categoriasadt);
        const usaGuiaSadt = parseBooleanFlexible(row.usa_guia_sadt || row.usaguiasadt);
        const subgrupoTuss = toStr(row.subgrupo_tuss || row.subgrupotuss);
        const grupoTuss = toStr(row.grupo_tuss || row.grupotuss);
        const capituloTuss = toStr(row.capitulo_tuss || row.capitulotuss);
        const fonteAnsTabela22 = toStr(
          row.fonte_ans_tabela22 || row.fonteans_tabela22 || row.fonteans || row.fonte
        );

        const dataInicio = parseDateFlexible(
          row.data_de_inicio_de_vigencia ||
            row.data_inicio_de_vigencia ||
            row.inicio_vigencia ||
            row.data_vigencia_inicio ||
            row.datavigenciainicio
        );

        const dataFim = parseDateFlexible(
          row.data_de_fim_de_vigencia ||
            row.data_fim_de_vigencia ||
            row.fim_vigencia ||
            row.data_vigencia_fim ||
            row.datavigenciafim
        );

        if (!codigo) {
          erros.push(`Linha ${linha}: "Código do Termo" é obrigatório`);
          ignorados++;
          continue;
        }

        if (!descricao) {
          erros.push(`Linha ${linha}: "Termo" é obrigatório`);
          ignorados++;
          continue;
        }

        // Obs: tipoProcedimento sempre terá valor (default OUTROS). Só bloqueamos se vier um tipo
        // preenchido mas inválido (normalize retornaria null e cairia no default). Nesse cenário,
        // o comportamento desejado é aceitar (como OUTROS), conforme solicitado.

        // No layout novo (tabela 22) pode não existir vigência; aplicar defaults seguros
        const dataInicioFinal = dataInicio ?? new Date("2000-01-01T00:00:00.000Z");
        const dataFimFinal = dataFim ?? null;

        if (dataFimFinal && dataFimFinal < dataInicioFinal) {
          erros.push(`Linha ${linha}: "Data de fim de vigência" não pode ser menor que a data de início`);
          ignorados++;
          continue;
        }

        // Somente EXAME aceita categoriaExame; nos demais, forçar null
        const categoriaFinal = tipoProcedimento === "EXAME" ? categoriaExame : null;

        const existente = await prisma.codigoTuss.findUnique({
          where: { codigoTuss: codigo },
          select: { id: true },
        });

        if (existente) {
          await prisma.codigoTuss.update({
            where: { id: existente.id },
            data: {
              descricao,
              tipoProcedimento,
              categoriaExame: categoriaFinal,
              sipGrupo,
              categoriaProntivus,
              categoriaSadt,
              usaGuiaSadt,
              subgrupoTuss,
              grupoTuss,
              capituloTuss,
              fonteAnsTabela22,
              dataVigenciaInicio: dataInicioFinal,
              dataVigenciaFim: dataFimFinal,
              ativo: true,
            },
          });
          atualizados++;
        } else {
          await prisma.codigoTuss.create({
            data: {
              codigoTuss: codigo,
              descricao,
              tipoProcedimento,
              categoriaExame: categoriaFinal,
              sipGrupo,
              categoriaProntivus,
              categoriaSadt,
              usaGuiaSadt,
              subgrupoTuss,
              grupoTuss,
              capituloTuss,
              fonteAnsTabela22,
              dataVigenciaInicio: dataInicioFinal,
              dataVigenciaFim: dataFimFinal,
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
    console.error("Erro ao processar upload de códigos TUSS:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao processar arquivo Excel" },
      { status: 500 }
    );
  }
}

