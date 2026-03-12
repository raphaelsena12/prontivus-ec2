import { useQuery } from '@tanstack/react-query';
import { medicosService } from '../services/medicos.service';

export function useMedicos() {
  return useQuery({
    queryKey: ['medicos'],
    queryFn: medicosService.getMedicos,
  });
}

export function useHorariosDisponiveis(medicoId: string, data: string) {
  return useQuery({
    queryKey: ['horarios', medicoId, data],
    queryFn: () => medicosService.getHorariosDisponiveis(medicoId, data),
    enabled: !!medicoId && !!data,
  });
}
