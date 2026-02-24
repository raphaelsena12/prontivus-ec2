import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { parseExcelFile, normalizeColumnName, parseDate, cleanCPF, cleanPhone } from "@/lib/excel-utils";
import { gerarNumeroProntuario } from "@/lib/paciente-helpers";

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

  if (session.user.tipo !== TipoUsuario.ADMIN_CLINICA && session.user.tipo !== TipoUsuario.SECRETARIA) {
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

    // Obter o próximo número de prontuário inicial (globalmente único)
    let proximoNumeroProntuario = await gerarNumeroProntuario();

    // Normalizar nomes das colunas
    const normalizedRows = rows.map((row) => {
      const normalized: any = {};
      for (const [key, value] of Object.entries(row)) {
        normalized[normalizeColumnName(key)] = value;
      }
      return normalized;
    });

    for (let i = 0; i < normalizedRows.length; i++) {
      const row = normalizedRows[i];
      const linha = i + 2; // +2 porque linha 1 é cabeçalho e começamos do 0

      try {
        // Campos obrigatórios
        const nome = row.nome || row.name;
        const cpf = cleanCPF(row.cpf);
        const dataNascimento = parseDate(row.data_nascimento || row.data_nasc || row.dt_nascimento || row.dt_nasc);
        const sexo = (row.sexo || row.genero || "").toString().toUpperCase().substring(0, 1);

        if (!nome) {
          erros.push(`Linha ${linha}: Nome é obrigatório`);
          ignorados++;
          continue;
        }

        if (!cpf) {
          erros.push(`Linha ${linha}: CPF inválido ou não fornecido`);
          ignorados++;
          continue;
        }

        if (!dataNascimento) {
          erros.push(`Linha ${linha}: Data de nascimento inválida`);
          ignorados++;
          continue;
        }

        if (!["M", "F", "O"].includes(sexo)) {
          erros.push(`Linha ${linha}: Sexo deve ser M, F ou O`);
          ignorados++;
          continue;
        }

        // Verificar se CPF já existe
        const pacienteExistente = await prisma.paciente.findFirst({
          where: {
            cpf: cpf,
            clinicaId: auth.clinicaId!,
          },
        });

        if (pacienteExistente) {
          ignorados++;
          continue; // Ignorar duplicados silenciosamente
        }

        // Criar paciente com número de prontuário
        await prisma.paciente.create({
          data: {
            clinicaId: auth.clinicaId!,
            nome: nome.toString().trim(),
            cpf: cpf,
            rg: row.rg ? row.rg.toString().trim() : null,
            dataNascimento: dataNascimento,
            sexo: sexo === "O" ? "OUTRO" : sexo,
            email: row.email ? row.email.toString().trim() : null,
            telefone: cleanPhone(row.telefone || row.tel),
            celular: cleanPhone(row.celular || row.cell),
            cep: row.cep ? row.cep.toString().replace(/\D/g, "") : null,
            endereco: row.endereco || row.endereco_completo ? (row.endereco || row.endereco_completo).toString().trim() : null,
            numero: row.numero || row.num ? row.numero?.toString().trim() || row.num?.toString().trim() : null,
            complemento: row.complemento ? row.complemento.toString().trim() : null,
            bairro: row.bairro ? row.bairro.toString().trim() : null,
            cidade: row.cidade ? row.cidade.toString().trim() : null,
            estado: row.estado || row.uf ? (row.estado || row.uf).toString().trim().substring(0, 2).toUpperCase() : null,
            nomeMae: row.nome_mae || row.mae ? (row.nome_mae || row.mae).toString().trim() : null,
            nomePai: row.nome_pai || row.pai ? (row.nome_pai || row.pai).toString().trim() : null,
            profissao: row.profissao ? row.profissao.toString().trim() : null,
            estadoCivil: row.estado_civil || row.estado_civil_abrev ? (row.estado_civil || row.estado_civil_abrev).toString().trim().toUpperCase() : null,
            observacoes: row.observacoes || row.obs ? (row.observacoes || row.obs).toString().trim() : null,
            ativo: true,
            numeroProntuario: proximoNumeroProntuario++,
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
      erros: erros.slice(0, 50), // Limitar a 50 erros
    });
  } catch (error: any) {
    console.error("Erro ao processar upload de pacientes:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao processar arquivo Excel" },
      { status: 500 }
    );
  }
}
