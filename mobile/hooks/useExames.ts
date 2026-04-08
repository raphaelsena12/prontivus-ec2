import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { examesService } from '../services/exames.service';

export function useExames() {
  return useQuery({
    queryKey: ['exames'],
    queryFn: examesService.getExames,
  });
}

export function useUploadExame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      file,
      nome,
      observacoes,
      dataExame,
    }: {
      file: { uri: string; name: string; type: string };
      nome: string;
      observacoes?: string;
      dataExame?: string;
    }) => examesService.uploadExame(file, nome, observacoes, dataExame),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exames'] });
    },
  });
}

export function useDeleteExame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => examesService.deleteExame(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exames'] });
    },
  });
}
