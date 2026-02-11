import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const updateTussValorSchema = z.object({
  codigoTussId: z.string().uuid().optional(),
  operadoraId: z.string().uuid().optional().nullable(),
  planoSaudeId: z.string().uuid().optional().nullable(),
  tipoConsultaId: z.string().uuid().optional().nullable(),
  valor: z.number().positive("Valor deve ser positivo").optional(),
  dataVigenciaInicio: z.string().transform((str) => new Date(str)).optional(),
  dataVigenciaFim: z
    .union([z.string(), z.null()])
    .optional()
    .transform((val) => (val && val !== "" ? new Date(val) : null)),
  ativo: z.boolean().optional(),
  observacoes: z.string().optional().nullable(),
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

  if (session.user.tipo !== TipoUsuario.ADMIN_CLINICA) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso negado. Apenas Admin Clínica." },
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

// PATCH /api/admin-clinica/tuss-valores/[id]
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
    const validation = updateTussValorSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verificar se valor existe e pertence à clínica
    const valorExistente = await prisma.tussValor.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId,
      },
    });

    if (!valorExistente) {
      return NextResponse.json(
        { error: "Valor TUSS não encontrado" },
        { status: 404 }
      );
    }

    // Verificar se operadora pertence à clínica (se fornecida)
    if (data.operadoraId) {
      const operadora = await prisma.operadora.findFirst({
        where: {
          id: data.operadoraId,
          clinicaId: auth.clinicaId,
        },
      });

      if (!operadora) {
        return NextResponse.json(
          { error: "Operadora não encontrada ou não pertence à clínica" },
          { status: 404 }
        );
      }
    }

    // Verificar se plano pertence à operadora (se fornecido)
    if (data.planoSaudeId && data.operadoraId) {
      const plano = await prisma.planoSaude.findFirst({
        where: {
          id: data.planoSaudeId,
          operadoraId: data.operadoraId,
        },
      });

      if (!plano) {
        return NextResponse.json(
          { error: "Plano não encontrado ou não pertence à operadora" },
          { status: 404 }
        );
      }
    }

    // Atualizar valor
    const updateData: any = {};
    if (data.codigoTussId !== undefined) updateData.codigoTussId = data.codigoTussId;
    if (data.operadoraId !== undefined) updateData.operadoraId = data.operadoraId;
    if (data.planoSaudeId !== undefined) updateData.planoSaudeId = data.planoSaudeId;
    if (data.tipoConsultaId !== undefined) updateData.tipoConsultaId = data.tipoConsultaId;
    if (data.valor !== undefined) updateData.valor = data.valor;
    if (data.dataVigenciaInicio !== undefined) updateData.dataVigenciaInicio = data.dataVigenciaInicio;
    if (data.dataVigenciaFim !== undefined) updateData.dataVigenciaFim = data.dataVigenciaFim;
    if (data.ativo !== undefined) updateData.ativo = data.ativo;
    if (data.observacoes !== undefined) updateData.observacoes = data.observacoes;

    const valor = await prisma.tussValor.update({
      where: { id },
      data: updateData,
      include: {
        codigoTuss: true,
        operadora: true,
        planoSaude: true,
        tipoConsulta: true,
      },
    });

    return NextResponse.json({ valor });
  } catch (error) {
    console.error("Erro ao atualizar valor TUSS:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar valor TUSS" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin-clinica/tuss-valores/[id]
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

    const valor = await prisma.tussValor.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId,
      },
    });

    if (!valor) {
      return NextResponse.json(
        { error: "Valor TUSS não encontrado" },
        { status: 404 }
      );
    }

    await prisma.tussValor.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Valor TUSS excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar valor TUSS:", error);
    return NextResponse.json(
      { error: "Erro ao deletar valor TUSS" },
      { status: 500 }
    );
  }
}

