import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const updateCodigoTussSchema = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória").max(500).optional(),
  descricaoDetalhada: z.string().optional(),
  tipoProcedimento: z
    .enum([
      "CONSULTA",
      "EXAME",
      "PROCEDIMENTO_AMBULATORIAL",
      "CIRURGIA",
      "OUTROS",
    ])
    .optional(),
  grupoId: z.string().uuid().optional().nullable(),
  dataVigenciaInicio: z.string().transform((str) => new Date(str)).optional(),
  dataVigenciaFim: z
    .string()
    .transform((str) => new Date(str))
    .optional()
    .nullable(),
  ativo: z.boolean().optional(),
  observacoes: z.string().optional(),
  especialidadesIds: z.array(z.string().uuid()).optional(),
});

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

  if (
    session.user.tipo !== TipoUsuario.ADMIN_CLINICA &&
    session.user.tipo !== TipoUsuario.SECRETARIA
  ) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Acesso negado" }, { status: 403 }),
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

// PATCH /api/admin-clinica/codigos-tuss/[id]
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
    const body = await request.json();
    const validation = updateCodigoTussSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verificar se código TUSS existe
    const codigoTussExistente = await prisma.codigoTuss.findUnique({
      where: { id },
    });

    if (!codigoTussExistente) {
      return NextResponse.json(
        { error: "Código TUSS não encontrado" },
        { status: 404 }
      );
    }

    // Atualizar código TUSS
    const updateData: any = {};
    if (data.descricao !== undefined) updateData.descricao = data.descricao;
    if (data.descricaoDetalhada !== undefined)
      updateData.descricaoDetalhada = data.descricaoDetalhada;
    if (data.tipoProcedimento !== undefined)
      updateData.tipoProcedimento = data.tipoProcedimento;
    if (data.grupoId !== undefined) updateData.grupoId = data.grupoId;
    if (data.dataVigenciaInicio !== undefined)
      updateData.dataVigenciaInicio = data.dataVigenciaInicio;
    if (data.dataVigenciaFim !== undefined)
      updateData.dataVigenciaFim = data.dataVigenciaFim;
    if (data.ativo !== undefined) updateData.ativo = data.ativo;
    if (data.observacoes !== undefined) updateData.observacoes = data.observacoes;

    const codigoTuss = await prisma.codigoTuss.update({
      where: { id },
      data: updateData,
      include: {
        grupo: true,
        tussEspecialidades: {
          include: {
            especialidade: true,
          },
        },
      },
    });

    // Atualizar especialidades se fornecidas
    if (data.especialidadesIds !== undefined) {
      // Remover todas as especialidades existentes
      await prisma.tussEspecialidade.deleteMany({
        where: { codigoTussId: id },
      });

      // Adicionar novas especialidades
      if (data.especialidadesIds.length > 0) {
        await Promise.all(
          data.especialidadesIds.map((especialidadeId: string) =>
            prisma.tussEspecialidade.create({
              data: {
                codigoTussId: id,
                especialidadeId,
              },
            })
          )
        );
      }
    }

    const codigoTussCompleto = await prisma.codigoTuss.findUnique({
      where: { id },
      include: {
        grupo: true,
        tussEspecialidades: {
          include: {
            especialidade: true,
          },
        },
      },
    });

    return NextResponse.json({ codigoTuss: codigoTussCompleto });
  } catch (error) {
    console.error("Erro ao atualizar código TUSS:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar código TUSS" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin-clinica/codigos-tuss/[id]
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

    const codigoTuss = await prisma.codigoTuss.findUnique({
      where: { id },
    });

    if (!codigoTuss) {
      return NextResponse.json(
        { error: "Código TUSS não encontrado" },
        { status: 404 }
      );
    }

    await prisma.codigoTuss.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Código TUSS excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar código TUSS:", error);
    return NextResponse.json(
      { error: "Erro ao deletar código TUSS" },
      { status: 500 }
    );
  }
}

