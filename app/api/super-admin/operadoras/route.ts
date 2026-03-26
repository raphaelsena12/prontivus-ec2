import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { z } from "zod";

const operadoraSchema = z.object({
  codigoAns: z.string().min(1, "Código ANS é obrigatório"),
  razaoSocial: z.string().min(3, "Razão social é obrigatória"),
  nomeFantasia: z.string().optional().nullable(),
  cnpj: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  email: z.string().email("Email inválido").optional().nullable().or(z.literal("")),
  cep: z.string().optional().nullable(),
  endereco: z.string().optional().nullable(),
  numero: z.string().optional().nullable(),
  complemento: z.string().optional().nullable(),
  bairro: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  estado: z.string().optional().nullable(),
  pais: z.string().optional().nullable(),
  ativo: z.boolean().optional().default(true),
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

// GET /api/super-admin/operadoras
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const ativo = searchParams.get("ativo");

    const where: any = {
      clinicaId: null, // catálogo global
      ...(search && {
        OR: [
          { codigoAns: { contains: search, mode: "insensitive" as const } },
          { razaoSocial: { contains: search, mode: "insensitive" as const } },
          { nomeFantasia: { contains: search, mode: "insensitive" as const } },
          { cnpj: { contains: search } },
        ],
      }),
      ...(ativo !== null && { ativo: ativo === "true" }),
    };

    let operadoras: any[] = [];
    try {
      // Caminho padrão (Prisma Client atual)
      operadoras = await prisma.operadora.findMany({
        where,
        orderBy: { razaoSocial: "asc" },
      });
    } catch (e: any) {
      // Fallback defensivo para casos em que o dev server ainda esteja com Prisma Client antigo em cache
      // e rejeite `clinicaId: null` com "Argument clinicaId must not be null".
      let query = Prisma.sql`
        SELECT *
        FROM "operadoras"
        WHERE "clinicaId" IS NULL
      `;

      if (ativo !== null) {
        query = Prisma.sql`${query} AND "ativo" = ${ativo === "true"}`;
      }

      if (search) {
        const like = `%${search}%`;
        query = Prisma.sql`${query} AND (
          "codigoAns" ILIKE ${like}
          OR "razaoSocial" ILIKE ${like}
          OR "nomeFantasia" ILIKE ${like}
          OR "cnpj" ILIKE ${like}
        )`;
      }

      query = Prisma.sql`${query} ORDER BY "razaoSocial" ASC`;
      operadoras = await prisma.$queryRaw<any[]>(query);
    }

    return NextResponse.json({ operadoras });
  } catch (error) {
    console.error("Erro ao listar operadoras (super-admin):", error);
    return NextResponse.json({ error: "Erro ao listar operadoras" }, { status: 500 });
  }
}

// POST /api/super-admin/operadoras
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const body = await request.json();
    const validation = operadoraSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Dados inválidos", details: validation.error.issues }, { status: 400 });
    }

    const data = validation.data;
    let operadora: any;
    try {
      operadora = await prisma.operadora.create({
        data: {
          clinicaId: null,
          codigoAns: data.codigoAns,
          razaoSocial: data.razaoSocial,
          nomeFantasia: data.nomeFantasia ?? null,
          cnpj: data.cnpj ?? null,
          telefone: data.telefone ?? null,
          email: data.email ? data.email : null,
          cep: data.cep ?? null,
          endereco: data.endereco ?? null,
          numero: data.numero ?? null,
          complemento: data.complemento ?? null,
          bairro: data.bairro ?? null,
          cidade: data.cidade ?? null,
          estado: data.estado ?? null,
          pais: data.pais ?? "Brasil",
          ativo: data.ativo ?? true,
        },
      });
    } catch (e: any) {
      // Fallback defensivo: inserção via SQL (caso client antigo em cache ainda rejeite clinicaId null)
      const rows = await prisma.$queryRaw<any[]>(
        Prisma.sql`
          INSERT INTO "operadoras" (
            "clinicaId","codigoAns","razaoSocial","nomeFantasia","cnpj","telefone","email",
            "cep","endereco","numero","complemento","bairro","cidade","estado","pais","ativo","createdAt","updatedAt"
          ) VALUES (
            NULL,
            ${data.codigoAns},
            ${data.razaoSocial},
            ${data.nomeFantasia ?? null},
            ${data.cnpj ?? null},
            ${data.telefone ?? null},
            ${data.email ? data.email : null},
            ${data.cep ?? null},
            ${data.endereco ?? null},
            ${data.numero ?? null},
            ${data.complemento ?? null},
            ${data.bairro ?? null},
            ${data.cidade ?? null},
            ${data.estado ?? null},
            ${data.pais ?? "Brasil"},
            ${data.ativo ?? true},
            NOW(),
            NOW()
          )
          RETURNING *
        `
      );
      operadora = rows[0];
    }

    return NextResponse.json({ operadora }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar operadora (super-admin):", error);
    return NextResponse.json({ error: "Erro ao criar operadora" }, { status: 500 });
  }
}

