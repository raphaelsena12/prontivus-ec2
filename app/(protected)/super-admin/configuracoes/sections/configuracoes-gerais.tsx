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
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Globe } from "lucide-react";

export function ConfiguracoesGerais() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nomeSistema: "Prontivus",
    descricaoSistema: "Sistema de gestão médica",
    modoManutencao: false,
    mensagemManutencao: "Sistema em manutenção. Volte em breve.",
    urlLogo: "",
    urlFavicon: "",
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/super-admin/configuracoes/gerais", {
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

      toast.success("Configurações gerais salvas com sucesso!");
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
          <CardTitle>Configurações Gerais do Sistema</CardTitle>
          <CardDescription>
            Configure informações básicas e aparência do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nomeSistema">Nome do Sistema *</Label>
              <Input
                id="nomeSistema"
                value={formData.nomeSistema}
                onChange={(e) =>
                  setFormData({ ...formData, nomeSistema: e.target.value })
                }
                placeholder="Prontivus"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricaoSistema">Descrição do Sistema</Label>
              <Textarea
                id="descricaoSistema"
                value={formData.descricaoSistema}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    descricaoSistema: e.target.value,
                  })
                }
                rows={3}
                placeholder="Sistema de gestão médica"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="urlLogo">URL do Logo</Label>
                <Input
                  id="urlLogo"
                  type="url"
                  value={formData.urlLogo}
                  onChange={(e) =>
                    setFormData({ ...formData, urlLogo: e.target.value })
                  }
                  placeholder="https://exemplo.com/logo.png"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="urlFavicon">URL do Favicon</Label>
                <Input
                  id="urlFavicon"
                  type="url"
                  value={formData.urlFavicon}
                  onChange={(e) =>
                    setFormData({ ...formData, urlFavicon: e.target.value })
                  }
                  placeholder="https://exemplo.com/favicon.ico"
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="modoManutencao">Modo Manutenção</Label>
                <p className="text-sm text-muted-foreground">
                  Bloqueia acesso ao sistema para todos os usuários
                </p>
              </div>
              <Switch
                id="modoManutencao"
                checked={formData.modoManutencao}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, modoManutencao: checked })
                }
              />
            </div>

            {formData.modoManutencao && (
              <div className="space-y-2">
                <Label htmlFor="mensagemManutencao">
                  Mensagem de Manutenção
                </Label>
                <Textarea
                  id="mensagemManutencao"
                  value={formData.mensagemManutencao}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      mensagemManutencao: e.target.value,
                    })
                  }
                  rows={2}
                  placeholder="Sistema em manutenção. Volte em breve."
                />
              </div>
            )}
          </div>

          <Button onClick={handleSave} disabled={loading}>
            <Globe className="mr-2 h-4 w-4" />
            {loading ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}








