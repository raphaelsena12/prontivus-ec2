import { NextRequest, NextResponse } from "next/server";
import { getSession, isSuperAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { StatusClinica } from "@/lib/generated/prisma";
import { z } from "zod";

// Schema de validação para atualização
const updateClinicaSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").optional(),
  email: z.string().email("Email inválido").optional(),
  telefone: z.string().min(1, "Telefone é obrigatório").optional(),
  planoId: z.string().uuid("Plano inválido").optional(),
});

// Helper para verificar autorização
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

  const admin = await isSuperAdmin();

  if (!admin) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso negado. Apenas Super Admin." },
        { status: 403 }
      ),
    };
  }

  return { authorized: true };
}

// Helper para validar UUID
function isValidUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// PATCH /api/super-admin/clinicas/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    // Validar ID
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se clínica existe
    const clinicaExistente = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!clinicaExistente) {
      return NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 404 }
      );
    }

    // Buscar plano separadamente
    const planoExistente = await prisma.plano.findUnique({
      where: { id: clinicaExistente.planoId },
    });

    const body = await request.json();
    const validation = updateClinicaSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;
    const updateData: {
      nome?: string;
      email?: string;
      telefone?: string;
      planoId?: string;
      tokensMensaisDisponiveis?: number;
      telemedicineHabilitada?: boolean;
    } = {};

    // Se mudou de plano, buscar novo plano
    let novoPlano = null;
    if (data.planoId && data.planoId !== clinicaExistente.planoId) {
      novoPlano = await prisma.plano.findUnique({
        where: { id: data.planoId },
      });

      if (!novoPlano) {
        return NextResponse.json(
          { error: "Plano não encontrado" },
          { status: 404 }
        );
      }

      updateData.planoId = data.planoId;
      updateData.tokensMensaisDisponiveis = novoPlano.tokensMensais;
      updateData.telemedicineHabilitada = novoPlano.telemedicineHabilitada;
    }

    // Atualizar outros campos se fornecidos
    if (data.nome) updateData.nome = data.nome;
    if (data.email) updateData.email = data.email;
    if (data.telefone) updateData.telefone = data.telefone.replace(/\D/g, "");

    // Atualizar clínica
    const clinicaAtualizada = await prisma.tenant.update({
      where: { id },
      data: updateData,
    });

    // Buscar plano atualizado
    const planoAtualizado = novoPlano || planoExistente || await prisma.plano.findUnique({
      where: { id: clinicaAtualizada.planoId },
    });

    const formattedClinica = {
      id: clinicaAtualizada.id,
      nome: clinicaAtualizada.nome,
      cnpj: clinicaAtualizada.cnpj,
      email: clinicaAtualizada.email,
      telefone: clinicaAtualizada.telefone,
      status: clinicaAtualizada.status,
      tokensMensaisDisponiveis: clinicaAtualizada.tokensMensaisDisponiveis,
      tokensConsumidos: clinicaAtualizada.tokensConsumidos,
      telemedicineHabilitada: clinicaAtualizada.telemedicineHabilitada,
      dataContratacao: clinicaAtualizada.dataContratacao,
      dataExpiracao: clinicaAtualizada.dataExpiracao,
      plano: planoAtualizado ? {
        id: planoAtualizado.id,
        nome: planoAtualizado.nome,
        tokensMensais: planoAtualizado.tokensMensais,
        preco: Number(planoAtualizado.preco),
        telemedicineHabilitada: planoAtualizado.telemedicineHabilitada,
      } : null,
    };

    return NextResponse.json({
      clinica: formattedClinica,
      message: "Clínica atualizada com sucesso",
    });
  } catch (error) {
    console.error("Erro ao atualizar clínica:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar clínica" },
      { status: 500 }
    );
  }
}

// DELETE /api/super-admin/clinicas/[id] (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    // Validar ID
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se clínica existe
    const clinicaExistente = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!clinicaExistente) {
      return NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 404 }
      );
    }

    // Soft delete: mudar status para INATIVA e desativar usuários
    await prisma.$transaction([
      // Atualizar status da clínica
      prisma.tenant.update({
        where: { id },
        data: { status: StatusClinica.INATIVA },
      }),
      // Desativar todos os usuários da clínica
      prisma.usuario.updateMany({
        where: { clinicaId: id },
        data: { ativo: false },
      }),
    ]);

    return NextResponse.json({
      message: "Clínica desativada com sucesso",
    });
  } catch (error) {
    console.error("Erro ao desativar clínica:", error);
    return NextResponse.json(
      { error: "Erro ao desativar clínica" },
      { status: 500 }
    );
  }
}
