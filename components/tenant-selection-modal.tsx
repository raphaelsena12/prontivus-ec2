"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TenantInfo } from "@/types/next-auth";

interface TenantSelectionModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  tenants?: TenantInfo[];
  redirectTo?: string;
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

  if (tenants.length === 0) return null;

  const handleConfirm = async () => {
    if (!selectedTenant) return;

    setIsLoading(true);
    try {
      // Validar no servidor
      const response = await fetch("/api/auth/switch-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: selectedTenant }),
      });

      if (response.ok) {
        // Atualizar sessão com tenant selecionado
        await update({ switchTenant: selectedTenant });
        onOpenChange?.(false);
        router.push(redirectTo);
        router.refresh();
      } else {
        const data = await response.json();
        console.error("Erro ao selecionar clínica:", data.error);
      }
    } catch (error) {
      console.error("Erro ao selecionar clínica:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para obter badge de papel
  const getRoleBadge = (tipo: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      ADMIN_CLINICA: {
        label: "Administrador",
        className: "bg-blue-100 text-blue-700",
      },
      MEDICO: { label: "Médico", className: "bg-green-100 text-green-700" },
      SECRETARIA: {
        label: "Secretária",
        className: "bg-purple-100 text-purple-700",
      },
    };
    return badges[tipo] || { label: tipo, className: "bg-gray-100 text-gray-700" };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Selecione a Clínica
          </DialogTitle>
          <DialogDescription>
            Você está associado a múltiplas clínicas. Selecione em qual deseja
            trabalhar agora.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-4 max-h-[400px] overflow-y-auto">
          {tenants.map((tenant) => {
            const badge = getRoleBadge(tenant.tipo);
            const isSelected = selectedTenant === tenant.id;

            return (
              <Card
                key={tenant.id}
                className={cn(
                  "cursor-pointer transition-all duration-200",
                  isSelected
                    ? "border-primary ring-2 ring-primary bg-primary/5"
                    : "hover:border-primary/50 hover:bg-accent/50"
                )}
                onClick={() => setSelectedTenant(tenant.id)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full",
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}
                    >
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{tenant.nome}</p>
                      <span
                        className={cn(
                          "inline-block mt-1 px-2 py-0.5 text-xs rounded-full",
                          badge.className
                        )}
                      >
                        {badge.label}
                      </span>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        <Button
          onClick={handleConfirm}
          disabled={!selectedTenant || isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Entrando...
            </>
          ) : (
            "Continuar"
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
