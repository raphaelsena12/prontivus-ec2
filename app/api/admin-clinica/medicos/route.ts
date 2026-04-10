import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";
import { zodValidationErrorPayload } from "@/lib/zod-validation-error";

const medicoEspecialidadeItemSchema = z.object({
  especialidadeId: z.string().uuid("especialidadeId inválido"),
  categoriaId: z.string().uuid("categoriaId inválido").nullable().optional(),
  rqe: z.string().min(1, "RQE é obrigatório"),
});

const medicoSchema = z.object({
  usuarioId: z.string().uuid("ID de usuário inválido"),
  crm: z.string().regex(/^\d{4,10}$/, "CRM deve conter apenas números (4 a 10 dígitos)"),
  ufCrm: z.string().regex(/^[A-Z]{2}$/, "UF do CRM deve ter 2 letras maiúsculas (ex: SP)"),
  codigoCbo: z.string().regex(/^\d{6}$/, "Código CBO-S deve ter exatamente 6 dígitos numéricos"),
  especialidades: z.array(medicoEspecialidadeItemSchema).min(1, "Adicione ao menos 1 especialidade"),
  limiteMaximoRetornosPorDia: z.number().int().min(0).nullable().optional(),
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

  return { authorized: true, clinicaId, userTipo: session.user.tipo };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const ativo = searchParams.get("ativo");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Para telas da SECRETARIA, o padrão esperado é listar apenas médicos ativos
    // mesmo que o frontend antigo não envie ?ativo=true.
    const ativoBool =
      ativo === null
        ? (auth.userTipo === TipoUsuario.SECRETARIA ? true : null)
        : ativo === "true";

    // Observação: "ativo" no produto costuma significar tanto o registro de médico quanto o usuário associado.
    // Ex.: quando o usuário é desativado (Usuario.ativo=false), ele não deve aparecer para agendamento,
    // mesmo que Medico.ativo ainda esteja true por legado.
    const where = {
      clinicaId: auth.clinicaId,
      ...(ativoBool !== null && {
        ativo: ativoBool,
        ...(ativoBool === true
          ? {
              usuario: {
                ativo: true,
                // Se existir vínculo por tenant (multi-tenant), respeitar também o ativo do usuário NO tenant.
                // Mantém compatibilidade: se não houver registro em UsuarioTenant para esse tenant, não bloqueia.
                OR: [
                  { usuariosTenants: { none: { tenantId: auth.clinicaId } } },
                  { usuariosTenants: { some: { tenantId: auth.clinicaId, ativo: true } } },
                ],
              },
            }
          : {}),
      }),
      ...(search && {
        OR: [
          { crm: { contains: search, mode: "insensitive" as const } },
          { especialidade: { contains: search, mode: "insensitive" as const } },
          { usuario: { nome: { contains: search, mode: "insensitive" as const } } },
        ],
      }),
    };

    const [medicos, total] = await Promise.all([
      prisma.medico.findMany({
        where,
        select: {
          id: true,
          createdAt: true,
          ativo: true,
          crm: true,
          especialidade: true,
          rqe: true,
          medicoEspecialidades: {
            select: {
              id: true,
              rqe: true,
              especialidade: { select: { id: true, codigo: true, nome: true } },
              categoria: { select: { id: true, codigo: true, nome: true } },
            },
          },
          usuario: {
            select: {
              id: true,
              nome: true,
              email: true,
              telefone: true,
              avatar: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.medico.count({ where }),
    ]);

    return NextResponse.json({
      medicos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erro ao listar médicos:", error);
    return NextResponse.json(
      { error: "Erro ao listar médicos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await request.json();
    const validation = medicoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        zodValidationErrorPayload(validation.error.issues),
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verificar se usuário existe e pertence à clínica
    const usuario = await prisma.usuario.findFirst({
      where: {
        id: data.usuarioId,
        clinicaId: auth.clinicaId,
        tipo: TipoUsuario.MEDICO,
      },
    });

    if (!usuario) {
      return NextResponse.json(
        { error: "Usuário médico não encontrado" },
        { status: 404 }
      );
    }

    // Verificar se CRM já existe
    const medicoExistente = await prisma.medico.findFirst({
      where: {
        crm: data.crm,
        clinicaId: auth.clinicaId,
      },
    });

    if (medicoExistente) {
      return NextResponse.json(
        { error: "CRM já cadastrado" },
        { status: 409 }
      );
    }

    const especialidadePrincipal = await prisma.especialidadeMedica.findUnique({
      where: { id: data.especialidades[0].especialidadeId },
      select: { nome: true },
    });

    const medico = await prisma.medico.create({
      data: {
        usuarioId: data.usuarioId,
        crm: data.crm,
        ufCrm: data.ufCrm,
        codigoCbo: data.codigoCbo,
        // legado: manter uma especialidade "principal" em texto
        especialidade: especialidadePrincipal?.nome || "Especialidade",
        // legado: manter rqe "principal" se possível
        rqe: null,
        limiteMaximoRetornosPorDia: data.limiteMaximoRetornosPorDia ?? null,
        clinicaId: auth.clinicaId!,
        medicoEspecialidades: {
          create: data.especialidades.map((it) => ({
            especialidadeId: it.especialidadeId,
            categoriaId: it.categoriaId ?? null,
            rqe: it.rqe,
          })),
        },
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            telefone: true,
            avatar: true,
          },
        },
        medicoEspecialidades: {
          select: {
            id: true,
            rqe: true,
            especialidade: { select: { id: true, codigo: true, nome: true } },
            categoria: { select: { id: true, codigo: true, nome: true } },
          },
        },
      },
    });

    return NextResponse.json({ medico }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar médico:", error);
    return NextResponse.json(
      { error: "Erro ao criar médico" },
      { status: 500 }
    );
  }
}

