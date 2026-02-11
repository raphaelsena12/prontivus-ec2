import { redirect } from "next/navigation";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { DashboardLayout } from "@/components/dashboard-layout";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Buscar planoNome se for ADMIN_CLINICA
  let planoNome: string | null = null;
  if (session.user.tipo === TipoUsuario.ADMIN_CLINICA) {
    const clinicaId = await getUserClinicaId();
    if (clinicaId) {
      const clinica = await prisma.tenant.findUnique({
        select: {
          id: true,
          planoId: true,
        },
        where: { id: clinicaId },
      });
      if (clinica) {
        const plano = await prisma.plano.findUnique({
          where: { id: clinica.planoId },
        });
        planoNome = plano?.nome || null;
      }
    }
  }

  return (
    <DashboardLayout
      user={{
        id: session.user.id,
        nome: session.user.nome,
        email: session.user.email,
        tipo: session.user.tipo,
        clinicaId: session.user.clinicaId,
        avatar: session.user.avatar,
        planoNome,
      }}
    >
      {children}
    </DashboardLayout>
  );
}
