import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ documentoId: string }> }
) {
  try {
    const session = await getSession();
    if (
      !session ||
      (session.user.tipo !== TipoUsuario.SECRETARIA &&
        session.user.tipo !== TipoUsuario.ADMIN_CLINICA)
    ) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const clinicaId = await getUserClinicaId();
    if (!clinicaId) {
      return NextResponse.json({ error: "Clínica não encontrada" }, { status: 403 });
    }

    const { documentoId } = await params;

    const documento = await prisma.documentoGerado.findFirst({
      where: {
        id: documentoId,
        clinicaId,
        tipoDocumento: { in: ["exame-imagem", "exame-pdf", "exame-documento"] },
      },
    });

    if (!documento) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
    }

    await prisma.documentoGerado.delete({ where: { id: documentoId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao deletar documento:", error);
    return NextResponse.json({ error: "Erro ao deletar documento" }, { status: 500 });
  }
}
