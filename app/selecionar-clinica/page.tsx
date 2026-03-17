"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TenantSelectionModal } from "@/components/tenant-selection-modal";
import { Loader2 } from "lucide-react";
import Image from "next/image";

export default function SelecionarClinicaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/login");
      return;
    }

    if (!session.user.requiresTenantSelection) {
      router.push("/dashboard");
      return;
    }

    setShowModal(true);
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#0f1f5c] via-[#1E4ED8] to-[#3b82f6]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <p className="text-white/70 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#0f1f5c] via-[#1E4ED8] to-[#3b82f6]">
      {/* Círculos decorativos no fundo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -right-32 top-1/3 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-blue-300/10 blur-3xl" />
      </div>

      {/* Padrão de grade sutil */}
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Logo no topo */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2">
        <Image
          src="/LogotipoemFundoTransparente.webp"
          alt="Prontivus"
          width={140}
          height={42}
          className="h-auto opacity-90"
          priority
        />
      </div>

      {/* Modal */}
      <TenantSelectionModal
        open={showModal}
        onOpenChange={(open) => {
          // Não permite fechar o modal sem selecionar uma clínica
          if (!open) return;
          setShowModal(open);
        }}
      />

      {/* Rodapé */}
      <p className="absolute bottom-6 text-xs text-white/40">
        © 2026 Prontivus. Todos os direitos reservados.
      </p>
    </div>
  );
}
