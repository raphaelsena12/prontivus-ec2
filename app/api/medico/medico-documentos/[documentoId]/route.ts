import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";

// DELETE /api/medico/medico-documentos/[documentoId]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ documentoId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    if (session.user.tipo !== TipoUsuario.MEDICO) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const clinicaId = await getUserClinicaId();
    if (!clinicaId) return NextResponse.json({ error: "Clínica não encontrada" }, { status: 403 });

    const medico = await prisma.medico.findFirst({
      where: { usuarioId: session.user.id, clinicaId },
      select: { id: true },
    });
    if (!medico) return NextResponse.json({ error: "Registro de médico não encontrado" }, { status: 404 });

    const { documentoId } = await params;
    const documento = await prisma.medicoDocumento.findFirst({
      where: { id: documentoId, clinicaId, medicoId: medico.id },
      select: { id: true },
    });
    if (!documento) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });

    await prisma.medicoDocumento.delete({ where: { id: documentoId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao deletar documento do médico:", error);
    return NextResponse.json({ error: error.message || "Erro ao deletar documento" }, { status: 500 });
  }
}

