import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { parseExcelFile, normalizeColumnName, parseDecimal } from "@/lib/excel-utils";

async function checkAuthorization() {
  const session = await getSession();

  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      ),
    };
  }

  if (session.user.tipo !== TipoUsuario.ADMIN_CLINICA) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      ),
    };
  }

  const clinicaId = await getUserClinicaId();

  if (!clinicaId) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, clinicaId };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const formData = await request.formData();
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
        const medicamentoNome = row.medicamento || row.nome_medicamento || row.nome;

        if (!medicamentoNome) {
          erros.push(`Linha ${linha}: Nome do medicamento é obrigatório`);
          ignorados++;
          continue;
        }

        // Buscar ou criar medicamento
        let medicamento = await prisma.medicamento.findFirst({
          where: {
            nome: medicamentoNome.toString().trim(),
            clinicaId: auth.clinicaId!,
          },
        });

        if (!medicamento) {
          // Criar medicamento se não existir
          medicamento = await prisma.medicamento.create({
            data: {
              clinicaId: auth.clinicaId!,
              nome: medicamentoNome.toString().trim(),
              ativo: true,
            },
          });
        }

        // Verificar se estoque já existe
        const estoqueExistente = await prisma.estoqueMedicamento.findUnique({
          where: {
            medicamentoId: medicamento.id,
          },
        });

        if (estoqueExistente) {
          // Atualizar estoque existente
          await prisma.estoqueMedicamento.update({
            where: {
              medicamentoId: medicamento.id,
            },
            data: {
              quantidadeAtual: parseInt(row.quantidade_atual || row.quantidade || "0") || 0,
              quantidadeMinima: parseInt(row.quantidade_minima || row.minimo || "0") || 0,
              quantidadeMaxima: row.quantidade_maxima || row.maximo ? parseInt(row.quantidade_maxima || row.maximo) : null,
              unidade: row.unidade || "UN",
              localizacao: row.localizacao || row.local ? (row.localizacao || row.local).toString().trim() : null,
            },
          });
          criados++;
          continue;
        }

        // Criar estoque
        await prisma.estoqueMedicamento.create({
          data: {
            clinicaId: auth.clinicaId!,
            medicamentoId: medicamento.id,
            quantidadeAtual: parseInt(row.quantidade_atual || row.quantidade || "0") || 0,
            quantidadeMinima: parseInt(row.quantidade_minima || row.minimo || "0") || 0,
            quantidadeMaxima: row.quantidade_maxima || row.maximo ? parseInt(row.quantidade_maxima || row.maximo) : null,
            unidade: row.unidade || "UN",
            localizacao: row.localizacao || row.local ? (row.localizacao || row.local).toString().trim() : null,
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
    console.error("Erro ao processar upload de estoque:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao processar arquivo Excel" },
      { status: 500 }
    );
  }
}
