import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agendamentosService } from '../services/agendamentos.service';

export function useAgendamentos() {
  return useQuery({
    queryKey: ['agendamentos'],
    queryFn: agendamentosService.getAgendamentos,
  });
}

export function useCancelarAgendamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: agendamentosService.cancelarAgendamento,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agendamentos'] }),
  });
}

export function useCreateAgendamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: agendamentosService.createAgendamento,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agendamentos'] }),
  });
}
