"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Coins, Info } from "lucide-react";

export function ConfiguracoesTokens() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    alertaUsoPercentual: 80,
    alertaUsoAbsoluto: 0,
    resetarTokensMensalmente: true,
    permitirExcederLimite: false,
    bloqueioAutomatico: true,
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/super-admin/configuracoes/tokens", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao salvar configurações");
      }

      toast.success("Configurações de tokens salvas com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar configurações");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Tokens</CardTitle>
          <CardDescription>
            Configure as políticas de uso e consumo de tokens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="resetarMensalmente">
                  Resetar Tokens Mensalmente
                </Label>
                <p className="text-sm text-muted-foreground">
                  Tokens são resetados no início de cada mês
                </p>
              </div>
              <Switch
                id="resetarMensalmente"
                checked={formData.resetarTokensMensalmente}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    resetarTokensMensalmente: checked,
                  })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="permitirExceder">
                  Permitir Exceder Limite
                </Label>
                <p className="text-sm text-muted-foreground">
                  Permite uso além do limite mensal (cobrança adicional)
                </p>
              </div>
              <Switch
                id="permitirExceder"
                checked={formData.permitirExcederLimite}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    permitirExcederLimite: checked,
                  })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="bloqueioAutomatico">
                  Bloqueio Automático ao Esgotar
                </Label>
                <p className="text-sm text-muted-foreground">
                  Bloqueia funcionalidades quando tokens se esgotam
                </p>
              </div>
              <Switch
                id="bloqueioAutomatico"
                checked={formData.bloqueioAutomatico}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    bloqueioAutomatico: checked,
                  })
                }
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="alertaPercentual">
                Alerta de Uso (% do Limite)
              </Label>
              <Input
                id="alertaPercentual"
                type="number"
                min="0"
                max="100"
                value={formData.alertaUsoPercentual}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    alertaUsoPercentual: parseInt(e.target.value) || 0,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Enviar alerta quando atingir esta porcentagem do limite mensal
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alertaAbsoluto">
                Alerta de Uso (Quantidade Absoluta)
              </Label>
              <Input
                id="alertaAbsoluto"
                type="number"
                min="0"
                value={formData.alertaUsoAbsoluto}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    alertaUsoAbsoluto: parseInt(e.target.value) || 0,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Enviar alerta quando atingir esta quantidade (0 = desabilitado)
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Sobre Tokens
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Tokens são consumidos ao usar funcionalidades de IA como
                  transcrição e análise médica. Cada plano possui um limite
                  mensal de tokens.
                </p>
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={loading}>
            <Coins className="mr-2 h-4 w-4" />
            {loading ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}








