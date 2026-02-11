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
import { Shield, Lock, Eye, EyeOff } from "lucide-react";

export function ConfiguracoesSeguranca() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    senhaMinima: 8,
    exigirMaiuscula: true,
    exigirMinuscula: true,
    exigirNumero: true,
    exigirEspecial: true,
    expiracaoSenha: 90,
    tentativasLogin: 5,
    bloqueioTemporario: true,
    tempoBloqueio: 30,
    auditoriaAtiva: true,
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        "/api/super-admin/configuracoes/seguranca",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao salvar configurações");
      }

      toast.success("Configurações de segurança salvas com sucesso!");
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
          <CardTitle>Configurações de Segurança</CardTitle>
          <CardDescription>
            Configure políticas de senha e segurança do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="senhaMinima">Tamanho Mínimo da Senha</Label>
              <Input
                id="senhaMinima"
                type="number"
                min="6"
                max="32"
                value={formData.senhaMinima}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    senhaMinima: parseInt(e.target.value) || 8,
                  })
                }
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="exigirMaiuscula">
                    Exigir Letra Maiúscula
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Senha deve conter pelo menos uma letra maiúscula
                  </p>
                </div>
                <Switch
                  id="exigirMaiuscula"
                  checked={formData.exigirMaiuscula}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, exigirMaiuscula: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="exigirMinuscula">
                    Exigir Letra Minúscula
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Senha deve conter pelo menos uma letra minúscula
                  </p>
                </div>
                <Switch
                  id="exigirMinuscula"
                  checked={formData.exigirMinuscula}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, exigirMinuscula: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="exigirNumero">Exigir Número</Label>
                  <p className="text-sm text-muted-foreground">
                    Senha deve conter pelo menos um número
                  </p>
                </div>
                <Switch
                  id="exigirNumero"
                  checked={formData.exigirNumero}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, exigirNumero: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="exigirEspecial">
                    Exigir Caractere Especial
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Senha deve conter pelo menos um caractere especial (!@#$%...)
                  </p>
                </div>
                <Switch
                  id="exigirEspecial"
                  checked={formData.exigirEspecial}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, exigirEspecial: checked })
                  }
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="expiracaoSenha">
                Expiração de Senha (dias)
              </Label>
              <Input
                id="expiracaoSenha"
                type="number"
                min="0"
                value={formData.expiracaoSenha}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    expiracaoSenha: parseInt(e.target.value) || 0,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                0 = senha nunca expira
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tentativasLogin">
                Tentativas de Login Permitidas
              </Label>
              <Input
                id="tentativasLogin"
                type="number"
                min="3"
                max="10"
                value={formData.tentativasLogin}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    tentativasLogin: parseInt(e.target.value) || 5,
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="bloqueioTemporario">
                  Bloqueio Temporário após Tentativas
                </Label>
                <p className="text-sm text-muted-foreground">
                  Bloqueia conta após exceder tentativas
                </p>
              </div>
              <Switch
                id="bloqueioTemporario"
                checked={formData.bloqueioTemporario}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, bloqueioTemporario: checked })
                }
              />
            </div>

            {formData.bloqueioTemporario && (
              <div className="space-y-2">
                <Label htmlFor="tempoBloqueio">
                  Tempo de Bloqueio (minutos)
                </Label>
                <Input
                  id="tempoBloqueio"
                  type="number"
                  min="1"
                  value={formData.tempoBloqueio}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tempoBloqueio: parseInt(e.target.value) || 30,
                    })
                  }
                />
              </div>
            )}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auditoriaAtiva">Auditoria Ativa</Label>
              <p className="text-sm text-muted-foreground">
                Registra todas as ações importantes do sistema
              </p>
            </div>
            <Switch
              id="auditoriaAtiva"
              checked={formData.auditoriaAtiva}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, auditoriaAtiva: checked })
              }
            />
          </div>

          <Button onClick={handleSave} disabled={loading}>
            <Shield className="mr-2 h-4 w-4" />
            {loading ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}








