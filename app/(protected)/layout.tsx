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

  // Buscar avatar diretamente do banco (não está mais no JWT para evitar cookie gigante)
  let avatarKey: string | null = null;
  try {
    const usr = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { avatar: true },
    });
    avatarKey = usr?.avatar ?? null;
  } catch {
    // Não bloquear o layout se falhar
  }

  return (
    <DashboardLayout
      user={{
        id: session.user.id,
        nome: session.user.nome,
        email: session.user.email,
        tipo: session.user.tipo,
        clinicaId: session.user.clinicaId,
        avatar: avatarKey,
        planoNome,
      }}
    >
      {children}
    </DashboardLayout>
  );
}
