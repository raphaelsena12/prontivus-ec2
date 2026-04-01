import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
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
  categoriaExame: z
    .enum([
      "LABORATORIAL",
      "IMAGEM",
      "ANATOMOPATOLOGICO",
      "FUNCIONAL",
      "GENETICO",
      "OUTROS",
    ])
    .optional()
    .nullable(),
  sipGrupo: z.string().optional().nullable(),
  categoriaProntivus: z.string().optional().nullable(),
  categoriaSadt: z.string().optional().nullable(),
  usaGuiaSadt: z.boolean().optional(),
  subgrupoTuss: z.string().optional().nullable(),
  grupoTuss: z.string().optional().nullable(),
  capituloTuss: z.string().optional().nullable(),
  fonteAnsTabela22: z.string().optional().nullable(),
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
      response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }),
    };
  }
  if (session.user.tipo !== TipoUsuario.SUPER_ADMIN) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Acesso negado" }, { status: 403 }),
    };
  }
  return { authorized: true };
}

// PATCH /api/super-admin/codigos-tuss/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

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

    const codigoTussExistente = await prisma.codigoTuss.findUnique({
      where: { id },
    });
    if (!codigoTussExistente) {
      return NextResponse.json(
        { error: "Código TUSS não encontrado" },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (data.descricao !== undefined) updateData.descricao = data.descricao;
    if (data.descricaoDetalhada !== undefined)
      updateData.descricaoDetalhada = data.descricaoDetalhada;
    if (data.tipoProcedimento !== undefined)
      updateData.tipoProcedimento = data.tipoProcedimento;
    if (data.categoriaExame !== undefined || data.tipoProcedimento !== undefined) {
      const tipo = data.tipoProcedimento ?? codigoTussExistente.tipoProcedimento;
      updateData.categoriaExame = tipo === "EXAME" ? (data.categoriaExame ?? null) : null;
    }
    if (data.grupoId !== undefined) updateData.grupoId = data.grupoId;
    if (data.sipGrupo !== undefined) updateData.sipGrupo = data.sipGrupo;
    if (data.categoriaProntivus !== undefined)
      updateData.categoriaProntivus = data.categoriaProntivus;
    if (data.categoriaSadt !== undefined) updateData.categoriaSadt = data.categoriaSadt;
    if (data.usaGuiaSadt !== undefined) updateData.usaGuiaSadt = data.usaGuiaSadt;
    if (data.subgrupoTuss !== undefined) updateData.subgrupoTuss = data.subgrupoTuss;
    if (data.grupoTuss !== undefined) updateData.grupoTuss = data.grupoTuss;
    if (data.capituloTuss !== undefined) updateData.capituloTuss = data.capituloTuss;
    if (data.fonteAnsTabela22 !== undefined)
      updateData.fonteAnsTabela22 = data.fonteAnsTabela22;
    if (data.dataVigenciaInicio !== undefined)
      updateData.dataVigenciaInicio = data.dataVigenciaInicio;
    if (data.dataVigenciaFim !== undefined)
      updateData.dataVigenciaFim = data.dataVigenciaFim;
    if (data.ativo !== undefined) updateData.ativo = data.ativo;
    if (data.observacoes !== undefined) updateData.observacoes = data.observacoes;

    await prisma.codigoTuss.update({
      where: { id },
      data: updateData,
    });

    if (data.especialidadesIds !== undefined) {
      await prisma.tussEspecialidade.deleteMany({
        where: { codigoTussId: id },
      });

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
    console.error("Erro ao atualizar código TUSS (super-admin):", error);
    return NextResponse.json(
      { error: "Erro ao atualizar código TUSS" },
      { status: 500 }
    );
  }
}

// DELETE /api/super-admin/codigos-tuss/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

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

    // Importante: Consultas/Guias NÃO devem ser deletadas. O banco deve estar com FK ON DELETE SET NULL
    // (ver migration), para permitir excluir o CódigoTuss sem cascata.
    // Podemos remover dependências "catálogo" (tabelas auxiliares) sem risco para histórico.
    await prisma.$transaction(async (tx) => {
      await tx.tussValor.deleteMany({ where: { codigoTussId: id } });
      await tx.tussOperadora.deleteMany({ where: { codigoTussId: id } });
      await tx.tussEspecialidade.deleteMany({ where: { codigoTussId: id } });
      await tx.codigoTuss.delete({ where: { id } });
    });

    return NextResponse.json({ message: "Código TUSS excluído com sucesso" });
  } catch (error: any) {
    console.error("Erro ao deletar código TUSS (super-admin):", error);
    // Prisma FK violation
    if (error?.code === "P2003") {
      return NextResponse.json(
        {
          error:
            "Não foi possível excluir este Código TUSS por restrição de chave estrangeira. Aplique a migration que define ON DELETE SET NULL para Consultas/Guias e tente novamente.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Erro ao deletar código TUSS" },
      { status: 500 }
    );
  }
}

