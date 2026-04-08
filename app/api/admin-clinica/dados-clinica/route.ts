import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();

    if (!session?.user?.clinicaId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.clinicaId },
      select: {
        nome: true,
        cnpj: true,
        telefone: true,
        email: true,
        endereco: true,
        numero: true,
        bairro: true,
        cidade: true,
        estado: true,
        cep: true,
        site: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Clínica não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ clinica: tenant });
  } catch (error) {
    console.error("Erro ao buscar dados da clínica:", error);
    return NextResponse.json(
      { error: "Erro ao buscar dados da clínica" },
      { status: 500 }
    );
  }
}
