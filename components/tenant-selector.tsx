"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { TenantInfo } from "@/types/next-auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TenantSelectorProps {
  className?: string;
  showLabel?: boolean;
}

export function TenantSelector({
  className,
  showLabel = false,
}: TenantSelectorProps) {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);

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

    if (session) {
      fetchTenants();
    }
  }, [session]);

  // Não exibir se não tiver sessão ou se tiver apenas 1 tenant
  if (!session || loadingTenants || tenants.length <= 1) {
    // Se tiver apenas 1 tenant, mostrar apenas o nome
    if (session?.user?.clinicaNome) {
      return (
        <div className={cn("flex items-center gap-2 text-sm", className)}>
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            {session.user.clinicaNome}
          </span>
        </div>
      );
    }
    return null;
  }

  const handleTenantChange = async (tenantId: string) => {
    if (tenantId === session.user.clinicaId) return;

    setIsLoading(true);
    try {
      // Validar no servidor
      const response = await fetch("/api/auth/switch-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });

      if (response.ok) {
        // Atualizar sessão com novo tenant
        await update({ switchTenant: tenantId });
        // Redirecionar para dashboard para aplicar novo contexto
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

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showLabel && (
        <span className="text-sm text-muted-foreground">Clínica:</span>
      )}
      <Select
        value={session.user.clinicaId || ""}
        onValueChange={handleTenantChange}
        disabled={isLoading}
      >
        <SelectTrigger
          className={cn(
            "w-[200px] border-none bg-transparent shadow-none hover:bg-accent",
            isLoading && "opacity-50 cursor-wait"
          )}
        >
          <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="Selecione a clínica">
            {session.user.clinicaNome || "Selecione"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {tenants.map((tenant) => (
            <SelectItem
              key={tenant.id}
              value={tenant.id}
              className="cursor-pointer"
            >
              <div className="flex flex-col">
                <span>{tenant.nome}</span>
                <span className="text-xs text-muted-foreground">
                  {tenant.tipo}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
