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
import { CreditCard, CheckCircle2, XCircle, TestTube, AlertTriangle, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export function ConfiguracoesStripe() {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<boolean | null>(null);

  const [formData, setFormData] = useState({
    publishableKey: "",
    secretKey: "",
    webhookSecret: "",
    modoTeste: true,
    habilitado: false,
  });

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const response = await fetch("/api/super-admin/configuracoes/stripe/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          publishableKey: formData.publishableKey,
          secretKey: formData.secretKey,
          modoTeste: formData.modoTeste,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setConnectionStatus(true);
        toast.success("Conexão com Stripe testada com sucesso!");
      } else {
        setConnectionStatus(false);
        toast.error(data.error || "Falha ao testar conexão com Stripe");
      }
    } catch (error: any) {
      setConnectionStatus(false);
      toast.error("Erro ao testar conexão com Stripe");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/super-admin/configuracoes/stripe", {
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

      toast.success("Configurações do Stripe salvas com sucesso!");
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
              <CardTitle>Configurações do Stripe</CardTitle>
              <CardDescription>
                Configure a integração com Stripe para processamento de pagamentos
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
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Atenção: Credenciais Sensíveis
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  As chaves do Stripe são informações sensíveis. Certifique-se de
                  que estão sendo armazenadas de forma segura e nunca as exponha
                  no código do cliente.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="habilitado">Habilitar Stripe</Label>
              <p className="text-sm text-muted-foreground">
                Ative a integração com Stripe para processar pagamentos
              </p>
            </div>
            <Switch
              id="habilitado"
              checked={formData.habilitado}
              onCheckedChange={(checked: boolean) =>
                setFormData({ ...formData, habilitado: checked })
              }
            />
          </div>

          {formData.habilitado && (
            <>
              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="modoTeste">Modo Teste</Label>
                  <p className="text-sm text-muted-foreground">
                    Use credenciais de teste para desenvolvimento
                  </p>
                </div>
                <Switch
                  id="modoTeste"
                  checked={formData.modoTeste}
                  onCheckedChange={(checked: boolean) =>
                    setFormData({ ...formData, modoTeste: checked })
                  }
                />
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      {formData.modoTeste ? "Modo Teste Ativo" : "Modo Produção Ativo"}
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      {formData.modoTeste
                        ? "Você está usando as credenciais de teste. Nenhum pagamento real será processado."
                        : "Você está usando as credenciais de produção. Pagamentos reais serão processados."}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="publishableKey">
                    Publishable Key {formData.modoTeste ? "(Teste)" : "(Produção)"} *
                  </Label>
                  <Input
                    id="publishableKey"
                    type="text"
                    value={formData.publishableKey}
                    onChange={(e) =>
                      setFormData({ ...formData, publishableKey: e.target.value })
                    }
                    placeholder={
                      formData.modoTeste
                        ? "pk_test_..."
                        : "pk_live_..."
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Chave pública do Stripe. Pode ser exposta no código do cliente.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secretKey">
                    Secret Key {formData.modoTeste ? "(Teste)" : "(Produção)"} *
                  </Label>
                  <Input
                    id="secretKey"
                    type="password"
                    value={formData.secretKey}
                    onChange={(e) =>
                      setFormData({ ...formData, secretKey: e.target.value })
                    }
                    placeholder={
                      formData.modoTeste
                        ? "sk_test_..."
                        : "sk_live_..."
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Chave secreta do Stripe. Deve ser mantida em segredo. Deixe em
                    branco para manter a chave atual.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhookSecret">Webhook Secret (Opcional)</Label>
                  <Input
                    id="webhookSecret"
                    type="password"
                    value={formData.webhookSecret}
                    onChange={(e) =>
                      setFormData({ ...formData, webhookSecret: e.target.value })
                    }
                    placeholder="whsec_..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Secret do webhook para validar eventos do Stripe. Configure no
                    painel do Stripe após criar o endpoint.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="rounded-lg border p-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Informações de Integração</p>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>
                      • Webhook URL:{" "}
                      <code className="rounded bg-muted px-1 py-0.5">
                        {typeof window !== "undefined"
                          ? `${window.location.origin}/api/webhooks/stripe`
                          : "https://seu-dominio.com/api/webhooks/stripe"}
                      </code>
                    </p>
                    <p>
                      • Configure este endpoint no painel do Stripe para receber
                      eventos de pagamento
                    </p>
                    <p>
                      • Eventos recomendados: payment_intent.succeeded,
                      payment_intent.payment_failed, charge.refunded
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testing || !formData.publishableKey || !formData.secretKey}
                >
                  <TestTube className="mr-2 h-4 w-4" />
                  {testing ? "Testando..." : "Testar Conexão"}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={loading || !formData.publishableKey || !formData.secretKey}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  {loading ? "Salvando..." : "Salvar Configurações"}
                </Button>
              </div>
            </>
          )}

          {!formData.habilitado && (
            <div className="rounded-lg border border-muted p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Habilite o Stripe para configurar as credenciais
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}








