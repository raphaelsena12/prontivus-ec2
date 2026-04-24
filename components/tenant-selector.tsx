"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { TenantInfo } from "@/types/next-auth";
import { ChevronDown, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface TenantSelectorProps {
  className?: string;
  showLabel?: boolean;
}

function ClinicaAvatar({
  nome,
  logoUrl,
  size = "sm",
}: {
  nome: string;
  logoUrl?: string | null;
  size?: "sm" | "md";
}) {
  const [imgError, setImgError] = useState(false);
  const initials = nome
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const dim = size === "sm" ? 28 : 36;

  if (logoUrl && !imgError) {
    return (
      <div
        className={cn(
          "rounded-lg overflow-hidden flex-shrink-0 bg-primary/10",
          size === "sm" ? "w-7 h-7" : "w-9 h-9"
        )}
      >
        <Image
          src={logoUrl}
          alt={nome}
          width={dim}
          height={dim}
          className="w-full h-full object-cover"
          unoptimized
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg flex items-center justify-center flex-shrink-0 font-semibold text-white bg-primary",
        size === "sm" ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-xs"
      )}
    >
      {initials}
    </div>
  );
}

export function TenantSelector({ className }: TenantSelectorProps) {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const response = await fetch("/api/auth/tenants");
        if (response.ok) {
          const data = await response.json();
          setTenants(data.tenants || []);
        }
      } catch (error) {
        console.error("Erro ao buscar tenants:", error);
      } finally {
        setLoadingTenants(false);
      }
    };

    if (session) fetchTenants();
  }, [session]);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!session || loadingTenants) return null;

  const currentTenant = tenants.find((t) => t.id === session.user.clinicaId);
  const clinicaNome =
    currentTenant?.nome || session.user.clinicaNome || "Clínica";

  const handleTenantChange = async (tenantId: string) => {
    if (tenantId === session.user.clinicaId || isLoading) return;
    setOpen(false);
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/switch-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });

      if (response.ok) {
        await update({ switchTenant: tenantId });
        router.push("/dashboard");
        router.refresh();
      } else {
        const data = await response.json();
        console.error("Erro ao trocar clínica:", data.error);
      }
    } catch (error) {
      console.error("Erro ao trocar clínica:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasMultipleTenants = tenants.length > 1;

  // Caso simples: apenas uma clínica — exibir logo + nome, sem borda, sem fundo, sem dropdown.
  if (!hasMultipleTenants) {
    return (
      <div
        className={cn(
          "flex items-center gap-2.5 px-1 py-1 text-sm select-none",
          className
        )}
      >
        <ClinicaAvatar
          nome={clinicaNome}
          logoUrl={currentTenant?.logoUrl}
          size="sm"
        />
        <span className="truncate font-semibold text-foreground tracking-tight hidden sm:block">
          {clinicaNome}
        </span>
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={isLoading}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "group flex items-center gap-2.5 pl-1.5 pr-2.5 py-1.5 rounded-full text-sm font-medium transition-all w-auto max-w-[18rem]",
          "bg-muted/40 hover:bg-muted text-foreground border border-transparent hover:border-border/60",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          "cursor-pointer",
          open && "bg-muted border-border/60",
          isLoading && "opacity-60 cursor-wait"
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ClinicaAvatar
            nome={clinicaNome}
            logoUrl={currentTenant?.logoUrl}
            size="sm"
          />
        )}
        <span className="truncate flex-1 text-left hidden sm:block tracking-tight">
          {clinicaNome}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 flex-shrink-0",
            open && "rotate-180 text-foreground"
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            "absolute left-0 top-full mt-2 z-50",
            "w-80 rounded-xl shadow-lg ring-1 ring-black/5 border border-border/60 bg-popover",
            "overflow-hidden",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150"
          )}
        >
          <div className="px-4 pt-3 pb-2 border-b border-border/60">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
              Suas clínicas
            </p>
          </div>
          {/* Lista */}
          <div className="p-1.5 max-h-80 overflow-y-auto">
            {tenants.map((tenant) => {
              const isActive = tenant.id === session.user.clinicaId;
              return (
                <button
                  key={tenant.id}
                  onClick={() => handleTenantChange(tenant.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-all",
                    "hover:bg-muted focus:outline-none focus:bg-muted",
                    isActive && "bg-primary/10 hover:bg-primary/15"
                  )}
                >
                  <ClinicaAvatar
                    nome={tenant.nome}
                    logoUrl={tenant.logoUrl}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium truncate tracking-tight",
                        isActive ? "text-primary" : "text-foreground"
                      )}
                    >
                      {tenant.nome}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {tenant.tipo === "ADMIN_CLINICA"
                        ? "Administrador"
                        : tenant.tipo === "MEDICO"
                          ? "Médico"
                          : tenant.tipo === "SECRETARIA"
                            ? "Secretaria"
                            : tenant.tipo}
                    </p>
                  </div>
                  {isActive && (
                    <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3.5 w-3.5 text-primary" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
