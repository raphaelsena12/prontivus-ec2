import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId, getUserMedicoId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { getSignedUrlFromS3 } from "@/lib/s3-service";

export async function GET(request: NextRequest) {
  try {
    // Autenticação
    const session = await getSession();
    if (!session || session.user.tipo !== TipoUsuario.MEDICO) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const clinicaId = await getUserClinicaId();
    const medicoId = await getUserMedicoId();
    if (!clinicaId || !medicoId) {
      return NextResponse.json({ error: "Clínica ou médico não encontrado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const exameId = searchParams.get("exameId");

    if (!exameId) {
      return NextResponse.json({ error: "Exame ID é obrigatório" }, { status: 400 });
    }

    // Verificar se o exame pertence à clínica e ao médico
    const exame = await prisma.documentoGerado.findFirst({
      where: {
        id: exameId,
        clinicaId,
        medicoId,
        tipoDocumento: {
          in: ["exame-imagem", "exame-pdf"],
        },
      },
    });

    if (!exame || !exame.s3Key) {
      return NextResponse.json({ error: "Exame não encontrado" }, { status: 404 });
    }

    // Gerar URL assinada
    const url = await getSignedUrlFromS3(exame.s3Key, 3600); // 1 hora de validade

    return NextResponse.json({
      success: true,
      url,
    });
  } catch (error: any) {
    console.error("Erro ao obter URL do exame:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao obter URL do exame" },
      { status: 500 }
    );
  }
}
