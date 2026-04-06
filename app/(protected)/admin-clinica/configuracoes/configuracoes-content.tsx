"use client";

import { useState, useEffect, useCallback } from "react";
import { IconBrandWhatsapp, IconSettings, IconTrash, IconCheck, IconX, IconPlugConnected } from "@tabler/icons-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";

interface WhatsAppConfig {
  whatsappPhoneNumberId: string;
  whatsappContatoNumero: string;
  whatsappConfigurado: boolean;
}

export function ConfiguracoesContent() {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [contatoNumero, setContatoNumero] = useState("");

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/admin-clinica/configuracoes/whatsapp");
      if (!res.ok) throw new Error();
      const data: WhatsAppConfig = await res.json();
      setConfig(data);
      setPhoneNumberId(data.whatsappPhoneNumberId);
      setContatoNumero(data.whatsappContatoNumero);
    } catch {
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  async function handleSave() {
    if (!phoneNumberId.trim() || (!accessToken.trim() && !config?.whatsappConfigurado)) {
      toast.error("Preencha o Phone Number ID e o Access Token");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin-clinica/configuracoes/whatsapp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsappPhoneNumberId: phoneNumberId, whatsappAccessToken: accessToken, whatsappContatoNumero: contatoNumero }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      toast.success("Configurações salvas com sucesso");
      setAccessToken("");
      await fetchConfig();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    try {
      const res = await fetch("/api/admin-clinica/configuracoes/whatsapp/test", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Conexão com WhatsApp funcionando corretamente!");
    } catch (err: any) {
      toast.error(err.message || "Falha ao testar conexão");
    } finally {
      setTesting(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      const res = await fetch("/api/admin-clinica/configuracoes/whatsapp", { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Integração WhatsApp removida");
      setPhoneNumberId("");
      setAccessToken("");
      setContatoNumero("");
      await fetchConfig();
    } catch {
      toast.error("Erro ao remover integração");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        icon={IconSettings}
        title="Configurações"
        subtitle="Gerencie as integrações da sua clínica"
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100">
                <IconBrandWhatsapp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-base">WhatsApp Business API</CardTitle>
                <CardDescription>
                  Envie notificações de agendamento e mensagens automáticas para seus pacientes via WhatsApp
                </CardDescription>
              </div>
            </div>
            {!loading && (
              <Badge
                variant={config?.whatsappConfigurado ? "default" : "secondary"}
                className={config?.whatsappConfigurado ? "bg-green-100 text-green-700 border-green-200" : ""}
              >
                {config?.whatsappConfigurado ? (
                  <><IconCheck className="w-3 h-3 mr-1" />Conectado</>
                ) : (
                  <><IconX className="w-3 h-3 mr-1" />Não configurado</>
                )}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          {/* Instruções */}
          <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">Como obter as credenciais:</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700">
              <li>Acesse <strong>Meta for Developers</strong> e crie um App do tipo Business</li>
              <li>Adicione o produto <strong>WhatsApp</strong> ao seu app</li>
              <li>Em <strong>WhatsApp &gt; Configuração da API</strong>, copie o <strong>Phone Number ID</strong></li>
              <li>Gere um <strong>Access Token permanente</strong> em Configurações do Sistema</li>
            </ol>
          </div>

          {/* Formulário */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="phoneNumberId">Phone Number ID</Label>
              <Input
                id="phoneNumberId"
                placeholder="Ex: 123456789012345"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Encontrado em: Meta for Developers → WhatsApp → Configuração da API
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="accessToken">
                Access Token
                {config?.whatsappConfigurado && (
                  <span className="ml-2 text-xs text-muted-foreground font-normal">
                    (já configurado — preencha apenas para alterar)
                  </span>
                )}
              </Label>
              <Input
                id="accessToken"
                type="password"
                placeholder={config?.whatsappConfigurado ? "••••••••••••••••" : "EAAxxxxxxxxxx..."}
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Token permanente gerado em: Configurações → Usuários do Sistema → Tokens
              </p>
            </div>
          </div>

          {/* Número de contato WhatsApp */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="contatoNumero">Número WhatsApp de Atendimento</Label>
            <Input
              id="contatoNumero"
              placeholder="Ex: 5511999999999"
              value={contatoNumero}
              onChange={(e) => setContatoNumero(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Número exibido nas mensagens de lembrete para o paciente entrar em contato (formato: 55 + DDD + número, sem espaços)
            </p>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving ? "Salvando..." : "Salvar configurações"}
            </Button>

            {config?.whatsappConfigurado && (
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={testing}
              >
                <IconPlugConnected className="w-4 h-4 mr-2" />
                {testing ? "Testando..." : "Testar conexão"}
              </Button>
            )}

            {config?.whatsappConfigurado && (
              <Button
                variant="outline"
                onClick={handleRemove}
                disabled={removing}
                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                <IconTrash className="w-4 h-4 mr-2" />
                {removing ? "Removendo..." : "Remover integração"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
