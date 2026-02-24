"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { IconCircleCheckFilled, IconLoader, IconAlertCircle } from "@tabler/icons-react";
import { toast } from "sonner";
import { Loader2, Receipt, Filter, Search, Plus, Edit, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ContaReceber {
  id: string;
  descricao: string;
  paciente: {
    id: string;
    nome: string;
  } | null;
  valor: number;
  dataVencimento: string;
  dataRecebimento: string | null;
  status: string;
  formaPagamento: {
    id: string;
    nome: string;
  } | null;
  observacoes: string | null;
}

interface Paciente {
  id: string;
  nome: string;
}

interface FormaPagamento {
  id: string;
  nome: string;
}

const contaReceberSchema = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória"),
  pacienteId: z.string().uuid().optional(),
  valor: z.number().min(0, "Valor deve ser maior ou igual a zero"),
  dataVencimento: z.string().min(1, "Data de vencimento é obrigatória"),
  formaPagamentoId: z.string().uuid().optional(),
  observacoes: z.string().optional(),
});

type ContaReceberFormData = z.infer<typeof contaReceberSchema>;

export function ContasReceberContent() {
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [openModal, setOpenModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ContaReceberFormData>({
    resolver: zodResolver(contaReceberSchema),
    defaultValues: {
      descricao: "",
      pacienteId: undefined,
      valor: 0,
      dataVencimento: "",
      formaPagamentoId: undefined,
      observacoes: "",
    },
  });

  const loadContas = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(search && { search }),
        ...(status && status !== "ALL" && { status }),
      });
      const response = await fetch(
        `/api/medico/contas-receber?${params.toString()}`
      );
      if (response.ok) {
        const data = await response.json();
        setContas(data.contas);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Erro ao buscar contas:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContas();
  }, [search, status, page]);

  useEffect(() => {
    async function fetchFormData() {
      try {
        const response = await fetch("/api/medico/contas/form-data");
        if (response.ok) {
          const data = await response.json();
          setPacientes(data.pacientes || []);
          setFormasPagamento(data.formasPagamento || []);
        }
      } catch (error) {
        console.error("Erro ao buscar dados do formulário:", error);
      }
    }
    fetchFormData();
  }, []);


  const onSubmit = async (data: ContaReceberFormData) => {
    try {
      setSubmitting(true);
      if (editingId) {
        // Editar
        const response = await fetch(`/api/medico/contas-receber/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Erro ao editar conta a receber");
        }
        toast.success("Conta a receber editada com sucesso!");
        setOpenEditModal(false);
        setEditingId(null);
      } else {
        // Criar
        const response = await fetch("/api/medico/contas-receber", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Erro ao criar conta a receber");
        }
        toast.success("Conta a receber criada com sucesso!");
        setOpenModal(false);
      }
      form.reset();
      await loadContas();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar conta a receber");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (id: string) => {
    try {
      const response = await fetch(`/api/medico/contas-receber/${id}`);
      if (!response.ok) throw new Error("Erro ao buscar conta");
      const data = await response.json();
      const conta = data.conta;
      form.reset({
        descricao: conta.descricao,
        pacienteId: conta.pacienteId || undefined,
        valor: conta.valor,
        dataVencimento: new Date(conta.dataVencimento).toISOString().split("T")[0],
        formaPagamentoId: conta.formaPagamentoId || undefined,
        observacoes: conta.observacoes || "",
      });
      setEditingId(id);
      setOpenEditModal(true);
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar conta");
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const response = await fetch(`/api/medico/contas-receber/${deletingId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao excluir conta a receber");
      }
      toast.success("Conta a receber excluída com sucesso!");
      setOpenDeleteDialog(false);
      setDeletingId(null);
      await loadContas();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir conta a receber");
      console.error(error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "RECEBIDO":
        return (
          <Badge variant="outline" className="bg-transparent border-green-500 text-green-700 dark:text-green-400 text-[10px] py-0.5 px-1.5 leading-tight">
            <IconCircleCheckFilled className="mr-1 h-3 w-3 fill-green-500 dark:fill-green-400" />
            Recebido
          </Badge>
        );
      case "PENDENTE":
        return (
          <Badge variant="outline" className="bg-transparent border-yellow-500 text-yellow-700 dark:text-yellow-400 text-[10px] py-0.5 px-1.5 leading-tight">
            <IconLoader className="mr-1 h-3 w-3" />
            Pendente
          </Badge>
        );
      case "VENCIDO":
        return (
          <Badge variant="outline" className="bg-transparent border-red-500 text-red-700 dark:text-red-400 text-[10px] py-0.5 px-1.5 leading-tight">
            <IconAlertCircle className="mr-1 h-3 w-3" />
            Vencido
          </Badge>
        );
      case "CANCELADO":
        return (
          <Badge variant="outline" className="bg-transparent border-gray-500 text-gray-700 dark:text-gray-400 text-[10px] py-0.5 px-1.5 leading-tight">
            <IconLoader className="mr-1 h-3 w-3" />
            Cancelado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px] py-0.5 px-1.5 leading-tight">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={Receipt}
        title="Contas a Receber"
        subtitle="Gerencie as contas a receber"
      />

      {/* Card Branco com Tabela */}
      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Lista de Contas a Receber</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
              <Input 
                type="search"
                placeholder="Buscar por descrição ou paciente..." 
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 h-8 text-xs bg-background w-64" 
              />
            </div>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os status</SelectItem>
                <SelectItem value="PENDENTE">Pendente</SelectItem>
                <SelectItem value="RECEBIDO">Recebido</SelectItem>
                <SelectItem value="VENCIDO">Vencido</SelectItem>
                <SelectItem value="CANCELADO">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={openModal} onOpenChange={setOpenModal}>
              <DialogTrigger asChild>
                <Button className="h-8 text-xs">
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Nova Conta
                </Button>
              </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Nova Conta a Receber</DialogTitle>
                      <DialogDescription>
                        Preencha as informações da conta a receber
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="descricao"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Descrição *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Descrição da conta" className="text-xs" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="pacienteId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Paciente</FormLabel>
                                <Select
                                  onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}
                                  value={field.value || "none"}
                                >
                                  <FormControl>
                                    <SelectTrigger className="text-xs">
                                      <SelectValue placeholder="Selecione o paciente" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="none" className="text-xs">Nenhum</SelectItem>
                                    {pacientes.map((paciente) => (
                                      <SelectItem key={paciente.id} value={paciente.id} className="text-xs">
                                        {paciente.nome}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="valor"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Valor *</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="text-xs"
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    value={field.value || 0}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="dataVencimento"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Data de Vencimento *</FormLabel>
                                <FormControl>
                                  <Input {...field} type="date" className="text-xs" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="formaPagamentoId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Forma de Pagamento</FormLabel>
                                <Select
                                  onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}
                                  value={field.value || "none"}
                                >
                                  <FormControl>
                                    <SelectTrigger className="text-xs">
                                      <SelectValue placeholder="Selecione a forma de pagamento" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="none" className="text-xs">Nenhuma</SelectItem>
                                    {formasPagamento.map((forma) => (
                                      <SelectItem key={forma.id} value={forma.id} className="text-xs">
                                        {forma.nome}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="observacoes"
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel className="text-xs">Observações</FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    rows={3}
                                    placeholder="Observações sobre a conta..."
                                    className="text-xs"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setOpenModal(false);
                              form.reset();
                            }}
                            className="text-xs"
                          >
                            Cancelar
                          </Button>
                          <Button type="submit" disabled={submitting} className="text-xs">
                            {submitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                            Salvar
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
                <Dialog open={openEditModal} onOpenChange={setOpenEditModal}>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Editar Conta a Receber</DialogTitle>
                      <DialogDescription>
                        Atualize as informações da conta a receber
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="descricao"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Descrição *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Descrição da conta" className="text-xs" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="pacienteId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Paciente</FormLabel>
                                <Select
                                  onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}
                                  value={field.value || "none"}
                                >
                                  <FormControl>
                                    <SelectTrigger className="text-xs">
                                      <SelectValue placeholder="Selecione o paciente" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="none" className="text-xs">Nenhum</SelectItem>
                                    {pacientes.map((paciente) => (
                                      <SelectItem key={paciente.id} value={paciente.id} className="text-xs">
                                        {paciente.nome}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="valor"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Valor *</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="text-xs"
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    value={field.value || 0}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="dataVencimento"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Data de Vencimento *</FormLabel>
                                <FormControl>
                                  <Input {...field} type="date" className="text-xs" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="formaPagamentoId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Forma de Pagamento</FormLabel>
                                <Select
                                  onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}
                                  value={field.value || "none"}
                                >
                                  <FormControl>
                                    <SelectTrigger className="text-xs">
                                      <SelectValue placeholder="Selecione a forma de pagamento" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="none" className="text-xs">Nenhuma</SelectItem>
                                    {formasPagamento.map((forma) => (
                                      <SelectItem key={forma.id} value={forma.id} className="text-xs">
                                        {forma.nome}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="observacoes"
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel className="text-xs">Observações</FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    rows={3}
                                    placeholder="Observações sobre a conta..."
                                    className="text-xs"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setOpenEditModal(false);
                              setEditingId(null);
                              form.reset();
                            }}
                            className="text-xs"
                          >
                            Cancelar
                          </Button>
                          <Button type="submit" disabled={submitting} className="text-xs">
                            {submitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                            Salvar
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
                <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir esta conta a receber? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setDeletingId(null)}>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12 px-6">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Carregando contas a receber...</p>
                  </div>
                </div>
              ) : contas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6">
                  <p className="text-muted-foreground text-center">Nenhuma conta a receber encontrada</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto px-6 pt-6">
                    <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs font-semibold py-3">Descrição</TableHead>
                            <TableHead className="text-xs font-semibold py-3">Paciente</TableHead>
                            <TableHead className="text-xs font-semibold py-3">Valor</TableHead>
                            <TableHead className="text-xs font-semibold py-3">Vencimento</TableHead>
                            <TableHead className="text-xs font-semibold py-3">Recebimento</TableHead>
                            <TableHead className="text-xs font-semibold py-3">Forma de Pagamento</TableHead>
                            <TableHead className="text-xs font-semibold py-3">Status</TableHead>
                            <TableHead className="text-xs font-semibold py-3 text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {contas.map((conta) => (
                            <TableRow key={conta.id}>
                              <TableCell className="text-xs py-3">{conta.descricao}</TableCell>
                              <TableCell className="text-xs py-3">
                                {conta.paciente?.nome || "-"}
                              </TableCell>
                              <TableCell className="text-xs py-3">{formatCurrency(Number(conta.valor))}</TableCell>
                              <TableCell className="text-xs py-3">
                                {formatDate(conta.dataVencimento)}
                              </TableCell>
                              <TableCell className="text-xs py-3">
                                {conta.dataRecebimento
                                  ? formatDate(conta.dataRecebimento)
                                  : "-"}
                              </TableCell>
                              <TableCell className="text-xs py-3">
                                {conta.formaPagamento?.nome || "-"}
                              </TableCell>
                              <TableCell className="text-xs py-3">{getStatusBadge(conta.status)}</TableCell>
                              <TableCell className="text-xs py-3">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEdit(conta.id)}
                                    title="Editar conta"
                                    className="h-7 w-7 p-0"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setDeletingId(conta.id);
                                      setOpenDeleteDialog(true);
                                    }}
                                    title="Excluir conta"
                                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex justify-center gap-2 px-6 pb-6 mt-4">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 border rounded disabled:opacity-50 text-xs"
                      >
                        Anterior
                      </button>
                      <span className="px-4 py-2 text-xs">
                        Página {page} de {totalPages}
                      </span>
                      <button
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={page === totalPages}
                        className="px-4 py-2 border rounded disabled:opacity-50 text-xs"
                      >
                        Próxima
                      </button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
    </div>
  );
}













