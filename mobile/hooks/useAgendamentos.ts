import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agendamentosService } from '../services/agendamentos.service';

export function useAgendamentos() {
  return useQuery({
    queryKey: ['agendamentos'],
    queryFn: agendamentosService.getAgendamentos,
    refetchInterval: 15000, // Atualizar a cada 15s para detectar sessões de telemedicina
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
