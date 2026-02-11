import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { parseExcelFile, normalizeColumnName, cleanCPF } from "@/lib/excel-utils";
import bcrypt from "bcryptjs";

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
        const nome = row.nome || row.name;
        const email = row.email;
        const cpf = cleanCPF(row.cpf);
        const crm = row.crm;
        const especialidade = row.especialidade || row.especialidade_medica;

        if (!nome) {
          erros.push(`Linha ${linha}: Nome é obrigatório`);
          ignorados++;
          continue;
        }

        if (!email) {
          erros.push(`Linha ${linha}: Email é obrigatório`);
          ignorados++;
          continue;
        }

        if (!cpf) {
          erros.push(`Linha ${linha}: CPF inválido ou não fornecido`);
          ignorados++;
          continue;
        }

        if (!crm) {
          erros.push(`Linha ${linha}: CRM é obrigatório`);
          ignorados++;
          continue;
        }

        if (!especialidade) {
          erros.push(`Linha ${linha}: Especialidade é obrigatória`);
          ignorados++;
          continue;
        }

        // Buscar ou criar usuário
        let usuario = await prisma.usuario.findUnique({
          where: { email: email.toString().trim() },
        });

        if (!usuario) {
          // Verificar se CPF já existe
          const cpfExistente = await prisma.usuario.findUnique({
            where: { cpf: cpf },
          });

          if (cpfExistente) {
            erros.push(`Linha ${linha}: CPF já cadastrado para outro usuário`);
            ignorados++;
            continue;
          }

          // Criar usuário médico
          const senhaHash = await bcrypt.hash("Senha@123", 10);
          usuario = await prisma.usuario.create({
            data: {
              nome: nome.toString().trim(),
              email: email.toString().trim(),
              cpf: cpf,
              telefone: row.telefone ? row.telefone.toString().replace(/\D/g, "") : null,
              tipo: TipoUsuario.MEDICO,
              senha: senhaHash,
              clinicaId: auth.clinicaId!,
              ativo: true,
              primeiroAcesso: true,
            },
          });
        }

        // Verificar se médico já existe nesta clínica
        const medicoExistente = await prisma.medico.findFirst({
          where: {
            clinicaId: auth.clinicaId!,
            usuarioId: usuario.id,
          },
        });

        if (medicoExistente) {
          ignorados++;
          continue;
        }

        // Criar médico
        await prisma.medico.create({
          data: {
            clinicaId: auth.clinicaId!,
            usuarioId: usuario.id,
            crm: crm.toString().trim(),
            especialidade: especialidade.toString().trim(),
            limiteMaximoRetornosPorDia: row.limite_retornos || row.limite ? parseInt(row.limite_retornos || row.limite) : null,
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
    console.error("Erro ao processar upload de médicos:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao processar arquivo Excel" },
      { status: 500 }
    );
  }
}
