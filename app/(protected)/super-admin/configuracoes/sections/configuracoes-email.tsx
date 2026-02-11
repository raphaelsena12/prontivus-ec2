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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mail, CheckCircle2, XCircle, TestTube } from "lucide-react";

export function ConfiguracoesEmail() {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<boolean | null>(null);

  const [formData, setFormData] = useState({
    host: process.env.NEXT_PUBLIC_SMTP_HOST || "",
    port: process.env.NEXT_PUBLIC_SMTP_PORT || "465",
    user: process.env.NEXT_PUBLIC_SMTP_USER || "",
    password: "",
    from: process.env.NEXT_PUBLIC_SMTP_FROM || "",
    fromName: "Prontivus",
  });

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const response = await fetch("/api/super-admin/configuracoes/email/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          host: formData.host,
          port: parseInt(formData.port),
          user: formData.user,
          password: formData.password || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setConnectionStatus(true);
        toast.success("Conexão SMTP testada com sucesso!");
      } else {
        setConnectionStatus(false);
        toast.error(data.error || "Falha ao testar conexão SMTP");
      }
    } catch (error: any) {
      setConnectionStatus(false);
      toast.error("Erro ao testar conexão SMTP");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/super-admin/configuracoes/email", {
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

      toast.success("Configurações de email salvas com sucesso!");
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Configurações de Email/SMTP</CardTitle>
              <CardDescription>
                Configure o servidor SMTP para envio de emails do sistema
              </CardDescription>
            </div>
            {connectionStatus !== null && (
              <Badge
                variant={connectionStatus ? "default" : "destructive"}
                className="flex items-center gap-1"
              >
                {connectionStatus ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    Conectado
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3" />
                    Desconectado
                  </>
                )}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="host">Servidor SMTP (Host) *</Label>
              <Input
                id="host"
                value={formData.host}
                onChange={(e) =>
                  setFormData({ ...formData, host: e.target.value })
                }
                placeholder="smtp.gmail.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="port">Porta *</Label>
              <Input
                id="port"
                type="number"
                value={formData.port}
                onChange={(e) =>
                  setFormData({ ...formData, port: e.target.value })
                }
                placeholder="465"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user">Usuário/Email *</Label>
              <Input
                id="user"
                type="email"
                value={formData.user}
                onChange={(e) =>
                  setFormData({ ...formData, user: e.target.value })
                }
                placeholder="seu-email@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="••••••••"
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco para manter a senha atual
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="from">Email Remetente *</Label>
              <Input
                id="from"
                type="email"
                value={formData.from}
                onChange={(e) =>
                  setFormData({ ...formData, from: e.target.value })
                }
                placeholder="noreply@prontivus.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fromName">Nome do Remetente</Label>
              <Input
                id="fromName"
                value={formData.fromName}
                onChange={(e) =>
                  setFormData({ ...formData, fromName: e.target.value })
                }
                placeholder="Prontivus"
              />
            </div>
          </div>

          <Separator />

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testing}
            >
              <TestTube className="mr-2 h-4 w-4" />
              {testing ? "Testando..." : "Testar Conexão"}
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              <Mail className="mr-2 h-4 w-4" />
              {loading ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}








