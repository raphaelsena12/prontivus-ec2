"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { IconCircleCheckFilled, IconLoader } from "@tabler/icons-react";
import { TipoPlano } from "@/lib/generated/prisma/enums";

interface Plano {
  id: string;
  nome: string;
  tokensMensais: number;
  preco: number;
  telemedicineHabilitada: boolean;
  descricao: string | null;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface EstatisticaPlano {
  id: string;
  nome: string;
  totalClinicas: number;
}

interface GestaoPlanosProps {
  planos: Plano[];
  estatisticasPlanos: EstatisticaPlano[];
}

export function GestaoPlanos({
  planos: initialPlanos,
  estatisticasPlanos,
}: GestaoPlanosProps) {
  const [planos, setPlanos] = useState(initialPlanos);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlano, setEditingPlano] = useState<Plano | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    nome: "" as TipoPlano | "",
    tokensMensais: 0,
    preco: 0,
    telemedicineHabilitada: false,
    descricao: "",
    ativo: true,
  });

  const handleOpenDialog = (plano?: Plano) => {
    if (plano) {
      setEditingPlano(plano);
      setFormData({
        nome: plano.nome as TipoPlano,
        tokensMensais: plano.tokensMensais,
        preco: plano.preco,
        telemedicineHabilitada: plano.telemedicineHabilitada,
        descricao: plano.descricao || "",
        ativo: plano.ativo,
      });
    } else {
      setEditingPlano(null);
      setFormData({
        nome: "" as TipoPlano | "",
        tokensMensais: 0,
        preco: 0,
        telemedicineHabilitada: false,
        descricao: "",
        ativo: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPlano(null);
  };

  const handleSubmit = async () => {
    if (!formData.nome) {
      toast.error("Selecione o tipo de plano");
      return;
    }

    setLoading(true);
    try {
      const url = editingPlano
        ? `/api/super-admin/configuracoes/planos/${editingPlano.id}`
        : "/api/super-admin/configuracoes/planos";

      const method = editingPlano ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao salvar plano");
      }

      toast.success(
        editingPlano ? "Plano atualizado com sucesso" : "Plano criado com sucesso"
      );
      handleCloseDialog();
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar plano");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAtivo = async (plano: Plano) => {
    try {
      const response = await fetch(
        `/api/super-admin/configuracoes/planos/${plano.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ativo: !plano.ativo,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao atualizar plano");
      }

      toast.success(
        `Plano ${!plano.ativo ? "ativado" : "desativado"} com sucesso`
      );
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar plano");
    }
  };

  const getEstatistica = (planoId: string) => {
    return estatisticasPlanos.find((e) => e.id === planoId)?.totalClinicas || 0;
  };

  const getStatusBadge = (ativo: boolean) => {
    if (ativo) {
      return (
        <Badge variant="outline" className="bg-transparent border-green-500 text-green-700 dark:text-green-400 text-[10px] py-0.5 px-1.5 leading-tight">
          <IconCircleCheckFilled className="mr-1 h-3 w-3 fill-green-500 dark:fill-green-400" />
          Ativo
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-transparent border-red-500 text-red-700 dark:text-red-400 text-[10px] py-0.5 px-1.5 leading-tight">
          <IconLoader className="mr-1 h-3 w-3" />
          Inativo
        </Badge>
      );
    }
  };

  const getTelemedicinaBadge = (habilitada: boolean) => {
    if (habilitada) {
      return (
        <Badge variant="outline" className="bg-transparent border-green-500 text-green-700 dark:text-green-400 text-[10px] py-0.5 px-1.5 leading-tight">
          <IconCircleCheckFilled className="mr-1 h-3 w-3 fill-green-500 dark:fill-green-400" />
          Habilitada
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-transparent border-red-500 text-red-700 dark:text-red-400 text-[10px] py-0.5 px-1.5 leading-tight">
          <IconLoader className="mr-1 h-3 w-3" />
          Desabilitada
        </Badge>
      );
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end pb-4">
        <Button onClick={() => handleOpenDialog()} className="text-xs">
          <Plus className="mr-2 h-3.5 w-3.5" />
          Novo Plano
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-slate-100 sticky top-0 z-10">
            <TableRow>
              <TableHead className="text-xs font-semibold py-3">Nome</TableHead>
              <TableHead className="text-xs font-semibold py-3">Tokens Mensais</TableHead>
              <TableHead className="text-xs font-semibold py-3">Preço</TableHead>
              <TableHead className="text-xs font-semibold py-3">Telemedicina</TableHead>
              <TableHead className="text-xs font-semibold py-3">Clínicas</TableHead>
              <TableHead className="text-xs font-semibold py-3">Status</TableHead>
              <TableHead className="text-right text-xs font-semibold py-3">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {planos.map((plano) => (
              <TableRow key={plano.id}>
                <TableCell className="font-medium text-xs py-3">{plano.nome}</TableCell>
                <TableCell className="text-xs py-3">{plano.tokensMensais.toLocaleString()}</TableCell>
                <TableCell className="text-xs py-3">{formatCurrency(plano.preco)}</TableCell>
                <TableCell className="text-xs py-3">
                  {getTelemedicinaBadge(plano.telemedicineHabilitada)}
                </TableCell>
                <TableCell className="text-xs py-3">
                  <Badge variant="outline" className="bg-transparent border-blue-500 text-blue-700 dark:text-blue-400 text-[10px] py-0.5 px-1.5 leading-tight">
                    {getEstatistica(plano.id)} clínicas
                  </Badge>
                </TableCell>
                <TableCell className="text-xs py-3">
                  {getStatusBadge(plano.ativo)}
                </TableCell>
                <TableCell className="text-right text-xs py-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(plano)}
                      className="text-xs h-7"
                    >
                      <Pencil className="h-3 w-3 mr-1.5" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleAtivo(plano)}
                      className="text-xs h-7"
                    >
                      {plano.ativo ? "Desativar" : "Ativar"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPlano ? "Editar Plano" : "Novo Plano"}
            </DialogTitle>
            <DialogDescription>
              {editingPlano
                ? "Atualize as informações do plano"
                : "Preencha os dados para criar um novo plano"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">Tipo de Plano *</Label>
              <select
                id="nome"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={formData.nome}
                onChange={(e) =>
                  setFormData({ ...formData, nome: e.target.value as TipoPlano })
                }
                disabled={!!editingPlano}
              >
                <option value="">Selecione...</option>
                <option value={TipoPlano.BASICO}>Básico</option>
                <option value={TipoPlano.INTERMEDIARIO}>Intermediário</option>
                <option value={TipoPlano.PROFISSIONAL}>Profissional</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tokensMensais">Tokens Mensais *</Label>
              <Input
                id="tokensMensais"
                type="number"
                value={formData.tokensMensais}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    tokensMensais: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="preco">Preço Mensal (R$) *</Label>
              <Input
                id="preco"
                type="number"
                step="0.01"
                value={formData.preco}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    preco: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) =>
                  setFormData({ ...formData, descricao: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="telemedicine">Telemedicina Habilitada</Label>
                <p className="text-sm text-muted-foreground">
                  Permite consultas remotas para este plano
                </p>
              </div>
              <Switch
                id="telemedicine"
                checked={formData.telemedicineHabilitada}
                onCheckedChange={(checked: boolean) =>
                  setFormData({
                    ...formData,
                    telemedicineHabilitada: checked,
                  })
                }
              />
            </div>

            {editingPlano && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="ativo">Plano Ativo</Label>
                  <p className="text-sm text-muted-foreground">
                    Desative para ocultar o plano
                  </p>
                </div>
                <Switch
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={(checked: boolean) =>
                    setFormData({ ...formData, ativo: checked })
                  }
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Salvando..." : editingPlano ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

