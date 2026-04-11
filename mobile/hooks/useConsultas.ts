import { useQuery } from '@tanstack/react-query';
import { consultasService } from '../services/consultas.service';

export function useConsultas() {
  return useQuery({
    queryKey: ['consultas'],
    queryFn: consultasService.getConsultas,
    refetchInterval: 15000,
  });
}

export function useConsulta(id: string) {
  return useQuery({
    queryKey: ['consultas', id],
    queryFn: () => consultasService.getConsultaById(id),
    enabled: !!id,
  });
}
