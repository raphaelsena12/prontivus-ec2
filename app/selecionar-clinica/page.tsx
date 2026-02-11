"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TenantSelectionModal } from "@/components/tenant-selection-modal";
import { Loader2 } from "lucide-react";

export default function SelecionarClinicaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (status === "loading") return;

    // Se não está autenticado, redirecionar para login
    if (!session) {
      router.push("/login");
      return;
    }

    // Se não precisa selecionar tenant, ir para dashboard
    if (!session.user.requiresTenantSelection) {
      router.push("/dashboard");
      return;
    }

    // Mostrar modal de seleção
    setShowModal(true);
  }, [session, status, router]);

  // Loading state
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <TenantSelectionModal
        open={showModal}
        onOpenChange={(open) => {
          if (!open) {
            // Se fechar sem selecionar, ir para dashboard mesmo assim
            // (vai usar o tenant padrão)
            router.push("/dashboard");
          }
          setShowModal(open);
        }}
      />
    </div>
  );
}
