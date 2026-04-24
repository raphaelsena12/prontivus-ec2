import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";
import { zodValidationErrorPayload } from "@/lib/zod-validation-error";
import { auditLogFromRequest, getChangedFields } from "@/lib/audit-log";

// Schema de validação para atualização
const updatePacienteSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").optional(),
  cpf: z.string().min(11, "CPF inválido").optional(),
  rg: z.string().optional(),
  dataNascimento: z.string().transform((str) => new Date(str)).optional(),
  sexo: z.enum(["M", "F", "OUTRO"]).optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefone: z.string().optional(),
  celular: z.string().optional(),
  cep: z.string().optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  profissao: z.string().optional(),
  estadoCivil: z.enum(["SOLTEIRO", "CASADO", "DIVORCIADO", "VIUVO"]).optional(),
  observacoes: z.string().optional(),
  alergias: z.string().nullable().optional(),
  medicamentosEmUso: z.string().nullable().optional(),
  ativo: z.boolean().optional(),
});

// Helper para verificar autorização
async function checkAuthorization(options?: { allowSecretaria?: boolean }) {
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

  const allowSecretaria = options?.allowSecretaria === true;
  const isAdminClinica = session.user.tipo === TipoUsuario.ADMIN_CLINICA;
  const isSecretaria = session.user.tipo === TipoUsuario.SECRETARIA;

  if (!isAdminClinica && !(allowSecretaria && isSecretaria)) {
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

// GET /api/admin-clinica/pacientes/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization({ allowSecretaria: true });
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    const paciente = await prisma.paciente.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId,
      },
    });

    if (!paciente) {
      return NextResponse.json(
        { error: "Paciente não encontrado" },
        { status: 404 }
      );
    }

    auditLogFromRequest(request, {
      action: "VIEW",
      resource: "Paciente",
      resourceId: id,
      details: { pacienteNome: paciente.nome },
    });

    return NextResponse.json({ paciente });
  } catch (error) {
    console.error("Erro ao buscar paciente:", error);
    return NextResponse.json(
      { error: "Erro ao buscar paciente" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin-clinica/pacientes/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization({ allowSecretaria: true });
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    // Verificar se paciente existe e pertence à clínica
    const pacienteExistente = await prisma.paciente.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId,
      },
    });

    if (!pacienteExistente) {
      return NextResponse.json(
        { error: "Paciente não encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = updatePacienteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        zodValidationErrorPayload(validation.error.issues),
        { status: 400 }
      );
    }

    const data = validation.data;
    const updateData: any = { ...data };

    // Se CPF foi alterado, verificar duplicidade (apenas em pacientes ativos)
    if (data.cpf) {
      const cpfLimpo = data.cpf.replace(/\D/g, "");
      const pacienteComCpf = await prisma.paciente.findFirst({
        where: {
          cpf: cpfLimpo,
          clinicaId: auth.clinicaId,
          id: { not: id },
          ativo: true,
        },
      });

      if (pacienteComCpf) {
        return NextResponse.json(
          { error: "CPF já cadastrado para outro paciente" },
          { status: 409 }
        );
      }

      updateData.cpf = cpfLimpo;
    }

    if (data.email === "") {
      updateData.email = null;
    }

    const paciente = await prisma.paciente.update({
      where: { id },
      data: updateData,
    });

    const camposAlterados = getChangedFields(pacienteExistente as any, updateData);
    auditLogFromRequest(request, {
      action: "UPDATE",
      resource: "Paciente",
      resourceId: id,
      details: {
        pacienteNome: pacienteExistente.nome,
        camposAlterados,
      },
    });

    return NextResponse.json({ paciente });
  } catch (error) {
    console.error("Erro ao atualizar paciente:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar paciente" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin-clinica/pacientes/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization({ allowSecretaria: false });
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    // Verificar se paciente existe e pertence à clínica
    const paciente = await prisma.paciente.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId,
      },
    });

    if (!paciente) {
      return NextResponse.json(
        { error: "Paciente não encontrado" },
        { status: 404 }
      );
    }

    // Verificar se paciente já está desativado
    if (!paciente.ativo) {
      return NextResponse.json(
        { error: "Paciente já está desativado" },
        { status: 400 }
      );
    }

    // Soft delete - apenas desativar
    const pacienteAtualizado = await prisma.paciente.update({
      where: { id },
      data: { ativo: false },
    });

    auditLogFromRequest(request, {
      action: "DELETE",
      resource: "Paciente",
      resourceId: id,
      details: {
        pacienteNome: paciente.nome,
        operacao: "Inativação de paciente",
      },
    });

    return NextResponse.json({
      message: "Paciente desativado com sucesso",
      paciente: pacienteAtualizado
    });
  } catch (error) {
    console.error("Erro ao deletar paciente:", error);
    return NextResponse.json(
      { error: "Erro ao deletar paciente" },
      { status: 500 }
    );
  }
}















