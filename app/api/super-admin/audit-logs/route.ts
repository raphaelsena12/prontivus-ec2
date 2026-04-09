import { NextRequest, NextResponse } from "next/server";
import { getSession, isSuperAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const superAdmin = await isSuperAdmin();
    if (!superAdmin) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Filtros
    const action = searchParams.get("action") || undefined;
    const resource = searchParams.get("resource") || undefined;
    const userId = searchParams.get("userId") || undefined;
    const clinicaId = searchParams.get("clinicaId") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const where: any = {};
    if (action) where.action = action;
    if (resource) where.resource = resource;
    if (userId) where.userId = userId;
    if (clinicaId) where.clinicaId = clinicaId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Buscar nomes dos usuários para exibição
    const userIds = [...new Set(logs.map((l) => l.userId))];
    const usuarios = await prisma.usuario.findMany({
      where: { id: { in: userIds } },
      select: { id: true, nome: true, email: true, tipo: true },
    });
    const userMap = new Map(usuarios.map((u) => [u.id, u]));

    // Buscar nomes das clínicas
    const clinicaIds = [...new Set(logs.map((l) => l.clinicaId).filter(Boolean))] as string[];
    const clinicas = clinicaIds.length > 0
      ? await prisma.tenant.findMany({
          where: { id: { in: clinicaIds } },
          select: { id: true, nome: true },
        })
      : [];
    const clinicaMap = new Map(clinicas.map((c) => [c.id, c.nome]));

    const logsComNomes = logs.map((log) => {
      const user = userMap.get(log.userId);
      return {
        ...log,
        userName: user?.nome || "Desconhecido",
        userEmail: user?.email || "",
        clinicaNome: log.clinicaId ? clinicaMap.get(log.clinicaId) || "" : "",
      };
    });

    return NextResponse.json({
      logs: logsComNomes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erro ao buscar audit logs:", error);
    return NextResponse.json(
      { error: "Erro ao buscar audit logs" },
      { status: 500 }
    );
  }
}
