"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Users, Upload, Filter, Plus } from "lucide-react";
import { toast } from "sonner";
import { UsuariosTable } from "./components/usuarios-table";
import { UsuarioDialog } from "./components/usuario-dialog";
import { UsuarioDeleteDialog } from "./components/usuario-delete-dialog";
import { TipoUsuario } from "@/lib/generated/prisma";
import { UploadExcelDialog } from "@/components/upload-excel-dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  telefone: string | null;
  tipo: TipoUsuario;
  ativo: boolean;
  primeiroAcesso: boolean;
  ultimoAcesso: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface UsuariosContentProps {
  clinicaId: string;
}

export function UsuariosContent({ clinicaId }: UsuariosContentProps) {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [usuarioDialogOpen, setUsuarioDialogOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUsuario, setDeletingUsuario] = useState<Usuario | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const fetchUsuarios = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin-clinica/usuarios`);
      if (!response.ok) throw new Error("Erro ao carregar usuários");
      const data = await response.json();
      setUsuarios(data.usuarios || []);
    } catch (error) {
      toast.error("Erro ao carregar usuários");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  const handleEdit = (usuario: Usuario) => {
    setEditingUsuario(usuario);
    setUsuarioDialogOpen(true);
  };

  const handleDeleteClick = (usuario: Usuario) => {
    setDeletingUsuario(usuario);
    setDeleteDialogOpen(true);
  };

  const handleSuccess = () => {
    fetchUsuarios();
    setUsuarioDialogOpen(false);
    setDeleteDialogOpen(false);
    setEditingUsuario(null);
    setDeletingUsuario(null);
  };

  const handleCreate = () => {
    setEditingUsuario(null);
    setUsuarioDialogOpen(true);
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      {/* Título e Subtítulo */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Usuários</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-9">
          Gerencie os usuários cadastrados na clínica
        </p>
      </div>

      {/* Card Branco com Tabela */}
      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Lista de Usuários</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setUploadDialogOpen(true)} className="h-8 text-xs px-3">
              <Upload className="mr-1.5 h-3 w-3" />
              Upload em Massa
            </Button>
            <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs px-3">
              <Plus className="mr-1.5 h-3 w-3" />
              Novo Usuário
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 px-6">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando usuários...</p>
              </div>
            </div>
          ) : usuarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <p className="text-muted-foreground text-center">Nenhum usuário encontrado</p>
            </div>
          ) : (
            <UsuariosTable
              data={usuarios}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              onCreate={handleCreate}
              onUpload={() => setUploadDialogOpen(true)}
            />
          )}
        </CardContent>
      </Card>

      {/* DIALOGS */}
      <UsuarioDialog
        open={usuarioDialogOpen}
        onOpenChange={setUsuarioDialogOpen}
        usuario={editingUsuario}
        onSuccess={handleSuccess}
      />

      <UsuarioDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        usuario={deletingUsuario}
        onSuccess={handleSuccess}
      />

      <UploadExcelDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        endpoint="/api/admin-clinica/upload/usuarios"
        title="Upload de Usuários em Massa"
        description="Faça upload de um arquivo Excel (.xlsx) com os dados dos usuários. O arquivo deve conter colunas: nome, email, cpf, tipo, telefone, senha, etc."
        onSuccess={handleSuccess}
      />
    </div>
  );
}











