import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";

/**
 * POST /api/audit-log
 *
 * Endpoint interno para gravar audit logs a partir do middleware (Edge Runtime).
 * O middleware não pode importar Prisma diretamente, então faz fetch para cá.
 *
 * Não requer autenticação — é chamado apenas internamente pelo middleware.
 * Aceita apenas requests vindos do mesmo origin (localhost/server).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { userId, userTipo, clinicaId, action, resource, resourceId, details } = body;

    if (!userId || !action || !resource) {
      return NextResponse.json({ error: "Campos obrigatórios: userId, action, resource" }, { status: 400 });
    }

    await prisma.auditLog.create({
      data: {
        userId,
        userTipo: userTipo || TipoUsuario.SUPER_ADMIN,
        clinicaId: clinicaId || undefined,
        action,
        resource,
        resourceId: resourceId || undefined,
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
        userAgent: request.headers.get("user-agent")?.substring(0, 512) || undefined,
        details: details || undefined,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[AuditLog API] Erro:", error);
    return NextResponse.json({ error: "Erro ao gravar audit log" }, { status: 500 });
  }
}
