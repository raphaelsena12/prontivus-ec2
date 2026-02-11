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
        const codigo = row.codigo || row.cod;
        const nome = row.nome || row.name;
        const valor = parseDecimal(row.valor || row.preco || row.valor_procedimento);

        if (!codigo) {
          erros.push(`Linha ${linha}: Código é obrigatório`);
          ignorados++;
          continue;
        }

        if (!nome) {
          erros.push(`Linha ${linha}: Nome é obrigatório`);
          ignorados++;
          continue;
        }

        if (valor === null || valor === undefined) {
          erros.push(`Linha ${linha}: Valor é obrigatório`);
          ignorados++;
          continue;
        }

        // Verificar se procedimento já existe
        const procedimentoExistente = await prisma.procedimento.findFirst({
          where: {
            codigo: codigo.toString().trim(),
            clinicaId: auth.clinicaId!,
          },
        });

        if (procedimentoExistente) {
          ignorados++;
          continue;
        }

        // Criar procedimento
        await prisma.procedimento.create({
          data: {
            clinicaId: auth.clinicaId!,
            codigo: codigo.toString().trim(),
            nome: nome.toString().trim(),
            descricao: row.descricao || row.desc ? (row.descricao || row.desc).toString().trim() : null,
            valor: valor,
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
    console.error("Erro ao processar upload de procedimentos:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao processar arquivo Excel" },
      { status: 500 }
    );
  }
}
