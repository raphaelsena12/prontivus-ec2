import { useQuery } from '@tanstack/react-query';
import { prescricoesService } from '../services/prescricoes.service';

export function usePrescricoes() {
  return useQuery({
    queryKey: ['prescricoes'],
    queryFn: prescricoesService.getPrescricoes,
  });
}

export function usePrescricao(id: string) {
  return useQuery({
    queryKey: ['prescricoes', id],
    queryFn: () => prescricoesService.getPrescricaoById(id),
    enabled: !!id,
  });
}
