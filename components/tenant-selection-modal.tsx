"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Building2, Check, Loader2, ArrowRight, Stethoscope, ShieldCheck, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { TenantInfo } from "@/types/next-auth";
import Image from "next/image";

interface TenantSelectionModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  tenants?: TenantInfo[];
  redirectTo?: string;
}

const roleConfig: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  ADMIN_CLINICA: {
    label: "Administrador",
    icon: ShieldCheck,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-100",
  },
  MEDICO: {
    label: "Médico",
    icon: Stethoscope,
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-100",
  },
  SECRETARIA: {
    label: "Secretária",
    icon: ClipboardList,
    color: "text-violet-600",
    bg: "bg-violet-50 border-violet-100",
  },
};

function ClinicInitials({ name }: { name: string }) {
  const words = name.trim().split(/\s+/);
  const initials =
    words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();

  return (
    <span className="text-2xl font-bold tracking-tight text-white select-none">
      {initials}
    </span>
  );
}

export function TenantSelectionModal({
  open,
  onOpenChange,
  tenants: propTenants,
  redirectTo = "/dashboard",
}: TenantSelectionModalProps) {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [tenants, setTenants] = useState<TenantInfo[]>(propTenants || []);

  useEffect(() => {
    if (!propTenants && session) {
      const fetchTenants = async () => {
        try {
          const response = await fetch("/api/auth/tenants");
          if (response.ok) {
            const data = await response.json();
            setTenants(data.tenants || []);
          }
        } catch (error) {
          console.error("Erro ao buscar tenants:", error);
        }
      };
      fetchTenants();
    }
  }, [propTenants, session]);

  // Quando em loading de sucesso, renderiza o card com loading
  // independente do estado `open` (evita flash do fundo azul)
  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom right, #ffffff 0%, #f0f7ff 25%, #dbeafe 50%, #93c5fd 75%, #1E4ED8 100%)' }} />
        <div className="relative w-full max-w-lg">
          <div className="relative overflow-hidden rounded-2xl border border-white/30 bg-white/90 shadow-2xl backdrop-blur-sm">
            <div className="relative overflow-hidden bg-gradient-to-br from-[#1E4ED8] to-[#1a3fb8] px-8 py-7">
              <div className="relative flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Selecione a Clínica</h2>
                  <p className="mt-0.5 text-sm text-blue-100/80">Bem-vindo! Selecione a clínica desejada:</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#1E4ED8]" />
              <p className="text-sm font-medium text-gray-600">Entrando na clínica...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!open || tenants.length === 0) return null;

  const handleConfirm = async () => {
    if (!selectedTenant) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/switch-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: selectedTenant }),
      });

      if (response.ok) {
        await update({ switchTenant: selectedTenant });
        setIsSuccess(true);
        window.location.href = redirectTo;
      } else {
        const data = await response.json();
        console.error("Erro ao selecionar clínica:", data.error);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Erro ao selecionar clínica:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
      {/* Fundo idêntico ao login */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom right, #ffffff 0%, #f0f7ff 25%, #dbeafe 50%, #93c5fd 75%, #1E4ED8 100%)',
        }}
      />
      {/* Círculos decorativos */}
      <div
        className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #1E4ED8 0%, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full opacity-15 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #1E4ED8 0%, transparent 70%)' }}
      />

      {/* Card principal */}
      <div className="relative w-full max-w-lg animate-in fade-in zoom-in-95 duration-200">
        {/* Gradiente decorativo no topo */}
        <div className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

        <div className="relative overflow-hidden rounded-2xl border border-white/30 bg-white/90 shadow-2xl backdrop-blur-sm">
          {/* Header */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#1E4ED8] to-[#1a3fb8] px-8 py-7">
            {/* Círculos decorativos */}
            <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
            <div className="pointer-events-none absolute -bottom-12 -left-6 h-32 w-32 rounded-full bg-white/5" />

            <div className="relative flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Selecione a Clínica
                </h2>
                <p className="mt-0.5 text-sm text-blue-100/80">
                  Bem-vindo! Selecione a clínica desejada:
                </p>
              </div>
            </div>
          </div>

          {/* Lista de clínicas */}
          <div className="max-h-[380px] overflow-y-auto p-4">
            <div className="space-y-2.5">
              {tenants.map((tenant) => {
                const role = roleConfig[tenant.tipo] || {
                  label: tenant.tipo,
                  icon: Building2,
                  color: "text-gray-600",
                  bg: "bg-gray-50 border-gray-100",
                };
                const RoleIcon = role.icon;
                const isSelected = selectedTenant === tenant.id;

                return (
                  <button
                    key={tenant.id}
                    type="button"
                    onClick={() => setSelectedTenant(tenant.id)}
                    className={cn(
                      "group relative w-full overflow-hidden rounded-xl border-2 p-4 text-left transition-all duration-200",
                      isSelected
                        ? "border-[#1E4ED8] bg-blue-50/70 shadow-md shadow-blue-100"
                        : "border-gray-100 bg-white hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-sm"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      {/* Logo / Avatar da clínica */}
                      <div
                        className={cn(
                          "relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 transition-all duration-200",
                          isSelected
                            ? "border-[#1E4ED8]/30 shadow-sm"
                            : "border-gray-100 group-hover:border-blue-200"
                        )}
                      >
                        {tenant.logoUrl ? (
                          <Image
                            src={tenant.logoUrl}
                            alt={`Logo ${tenant.nome}`}
                            fill
                            unoptimized
                            className="object-cover"
                            sizes="56px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1E4ED8] to-[#1a3fb8]">
                            <ClinicInitials name={tenant.nome} />
                          </div>
                        )}
                      </div>

                      {/* Informações */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "truncate font-semibold transition-colors",
                            isSelected ? "text-[#1E4ED8]" : "text-gray-900"
                          )}
                        >
                          {tenant.nome}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <div
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                              role.bg,
                              role.color
                            )}
                          >
                            <RoleIcon className="h-3 w-3" />
                            {role.label}
                          </div>
                        </div>
                      </div>

                      {/* Check / Arrow */}
                      <div
                        className={cn(
                          "ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-200",
                          isSelected
                            ? "bg-[#1E4ED8] text-white scale-110"
                            : "bg-gray-100 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-500"
                        )}
                      >
                        {isSelected ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <ArrowRight className="h-3.5 w-3.5" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer com botão */}
          <div className="border-t border-blue-100 bg-blue-50/40 px-4 py-4">
            <Button
              onClick={handleConfirm}
              disabled={!selectedTenant || isLoading}
              className={cn(
                "w-full h-11 font-semibold text-white transition-all duration-200",
                selectedTenant
                  ? "bg-[#1E4ED8] shadow-lg shadow-blue-200 hover:bg-[#1a3fb8] hover:shadow-xl hover:shadow-blue-200"
                  : "bg-gray-300 cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  Acessar Clínica
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
