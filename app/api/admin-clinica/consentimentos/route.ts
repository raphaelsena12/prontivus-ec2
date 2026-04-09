import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { VERSAO_TERMO_ATUAL } from "@/lib/lgpd/termo-consentimento";

/**
 * GET /api/admin-clinica/consentimentos
 *
 * Lista o status de consentimento LGPD de todos os pacientes da clínica.
 * Query params: ?search=nome&status=aceito|pendente|revogado
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (session.user.tipo !== TipoUsuario.ADMIN_CLINICA) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const clinicaId = await getUserClinicaId();
    if (!clinicaId) {
      return NextResponse.json({ error: "Clínica não encontrada" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const statusFilter = searchParams.get("status") || "todos";

    // Buscar todos os pacientes ativos da clínica com seu consentimento mais recente
    const pacientes = await prisma.paciente.findMany({
      where: {
        clinicaId,
        ativo: true,
        ...(search && {
          OR: [
            { nome: { contains: search, mode: "insensitive" as const } },
            { cpf: { contains: search } },
          ],
        }),
      },
      select: {
        id: true,
        nome: true,
        cpf: true,
        email: true,
        celular: true,
        consentimentos: {
          where: {
            clinicaId,
            versaoTermo: VERSAO_TERMO_ATUAL,
          },
          orderBy: { aceitoEm: "desc" },
          take: 1,
          select: {
            id: true,
            versaoTermo: true,
            canalAceite: true,
            aceitoEm: true,
            revogadoEm: true,
          },
        },
      },
      orderBy: { nome: "asc" },
    });

    // Mapear para o formato esperado pelo frontend
    const result = pacientes.map((p) => {
      const consentimento = p.consentimentos[0] || null;
      let status: "aceito" | "pendente" | "revogado" = "pendente";

      if (consentimento) {
        status = consentimento.revogadoEm ? "revogado" : "aceito";
      }

      return {
        pacienteId: p.id,
        pacienteNome: p.nome,
        pacienteCpf: p.cpf,
        pacienteEmail: p.email,
        pacienteCelular: p.celular,
        status,
        canalAceite: consentimento?.canalAceite || null,
        aceitoEm: consentimento?.aceitoEm || null,
        revogadoEm: consentimento?.revogadoEm || null,
        versaoTermo: consentimento?.versaoTermo || null,
      };
    });

    // Filtrar por status se necessário
    const filtered =
      statusFilter === "todos"
        ? result
        : result.filter((r) => r.status === statusFilter);

    const stats = {
      total: result.length,
      aceitos: result.filter((r) => r.status === "aceito").length,
      pendentes: result.filter((r) => r.status === "pendente").length,
      revogados: result.filter((r) => r.status === "revogado").length,
    };

    return NextResponse.json({ pacientes: filtered, stats });
  } catch (error) {
    console.error("Erro ao listar consentimentos:", error);
    return NextResponse.json(
      { error: "Erro ao listar consentimentos" },
      { status: 500 }
    );
  }
}
