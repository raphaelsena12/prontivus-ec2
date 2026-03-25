import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;

    const body = await request.json().catch(() => ({}));
    const confirmText = String(body?.confirmText || "").trim().toUpperCase();

    if (confirmText !== "LIMPAR") {
      return NextResponse.json(
        { error: 'Confirmação inválida. Digite "LIMPAR" para confirmar.' },
        { status: 400 }
      );
    }

    const result = await prisma.exame.deleteMany({
      where: { clinicaId: auth.clinicaId! },
    });

    return NextResponse.json({
      success: true,
      deleted: result.count,
    });
  } catch (error: any) {
    console.error("Erro ao limpar exames:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao limpar exames" },
      { status: 500 }
    );
  }
}

