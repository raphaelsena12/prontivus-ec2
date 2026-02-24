"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, User, Calendar, Phone, Mail, MapPin, FileText } from 'lucide-react';
import { formatDate, formatCPF } from '@/lib/utils';

interface DadosPessoaisSectionProps {
  paciente: {
    id: string;
    numeroProntuario: number | null;
    nome: string;
    cpf: string;
    rg: string | null;
    dataNascimento: string;
    sexo: string;
    email: string | null;
    telefone: string | null;
    celular: string | null;
    cep: string | null;
    endereco: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cidade: string | null;
    estado: string | null;
    nomeMae: string | null;
    nomePai: string | null;
    profissao: string | null;
    estadoCivil: string | null;
    observacoes: string | null;
  };
  expanded: boolean;
  onToggle?: () => void;
}

export function DadosPessoaisSection({ paciente, expanded, onToggle }: DadosPessoaisSectionProps) {
  const calcularIdade = (dataNascimento: string) => {
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    return idade;
  };

  const idade = calcularIdade(paciente.dataNascimento);

  return (
    <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white">
      <CardHeader className="border-b border-slate-200 flex flex-row items-center justify-between py-3 px-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-slate-800">Dados Pessoais</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">Informações cadastrais do paciente</p>
          </div>
        </div>
      {onToggle && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="h-8 w-8 p-0"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      )}
      </CardHeader>
      {expanded && (
        <CardContent className="p-5">
          <div className="grid grid-cols-2 gap-6">
            {/* Coluna Esquerda */}
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Identificação</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-slate-400 mt-1" />
                    <div className="flex-1">
                      <p className="text-xs text-slate-500 mb-0.5">CPF</p>
                      <p className="text-sm font-medium text-slate-800">{formatCPF(paciente.cpf)}</p>
                    </div>
                  </div>
                  
                  {paciente.rg && (
                    <div className="flex items-start gap-3">
                      <FileText className="w-4 h-4 text-slate-400 mt-1" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 mb-0.5">RG</p>
                        <p className="text-sm font-medium text-slate-800">{paciente.rg}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-slate-400 mt-1" />
                    <div className="flex-1">
                      <p className="text-xs text-slate-500 mb-0.5">Data de Nascimento</p>
                      <p className="text-sm font-medium text-slate-800">
                        {formatDate(paciente.dataNascimento ? new Date(paciente.dataNascimento) : null)} ({idade} anos)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <User className="w-4 h-4 text-slate-400 mt-1" />
                    <div className="flex-1">
                      <p className="text-xs text-slate-500 mb-0.5">Sexo</p>
                      <p className="text-sm font-medium text-slate-800">{paciente.sexo}</p>
                    </div>
                  </div>

                  {paciente.estadoCivil && (
                    <div className="flex items-start gap-3">
                      <User className="w-4 h-4 text-slate-400 mt-1" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 mb-0.5">Estado Civil</p>
                        <p className="text-sm font-medium text-slate-800">{paciente.estadoCivil}</p>
                      </div>
                    </div>
                  )}

                  {paciente.profissao && (
                    <div className="flex items-start gap-3">
                      <User className="w-4 h-4 text-slate-400 mt-1" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 mb-0.5">Profissão</p>
                        <p className="text-sm font-medium text-slate-800">{paciente.profissao}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Coluna Direita */}
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Contato</h4>
                <div className="space-y-3">
                  {paciente.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="w-4 h-4 text-slate-400 mt-1" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 mb-0.5">Email</p>
                        <p className="text-sm font-medium text-slate-800 break-all">{paciente.email}</p>
                      </div>
                    </div>
                  )}

                  {paciente.celular && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-4 h-4 text-slate-400 mt-1" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 mb-0.5">Celular</p>
                        <p className="text-sm font-medium text-slate-800">{paciente.celular}</p>
                      </div>
                    </div>
                  )}

                  {paciente.telefone && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-4 h-4 text-slate-400 mt-1" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 mb-0.5">Telefone</p>
                        <p className="text-sm font-medium text-slate-800">{paciente.telefone}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {paciente.endereco && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Endereço</h4>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-slate-400 mt-1" />
                    <div className="flex-1">
                      <p className="text-xs text-slate-500 mb-0.5">Endereço Completo</p>
                      <p className="text-sm font-medium text-slate-800">
                        {paciente.endereco}
                        {paciente.numero && `, ${paciente.numero}`}
                        {paciente.complemento && ` - ${paciente.complemento}`}
                        <br />
                        {paciente.bairro && `${paciente.bairro}`}
                        {paciente.cidade && ` - ${paciente.cidade}`}
                        {paciente.estado && `/${paciente.estado}`}
                        {paciente.cep && ` - CEP: ${paciente.cep}`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {(paciente.nomeMae || paciente.nomePai) && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Filiação</h4>
                  <div className="space-y-3">
                    {paciente.nomeMae && (
                      <div className="flex items-start gap-3">
                        <User className="w-4 h-4 text-slate-400 mt-1" />
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 mb-0.5">Nome da Mãe</p>
                          <p className="text-sm font-medium text-slate-800">{paciente.nomeMae}</p>
                        </div>
                      </div>
                    )}

                    {paciente.nomePai && (
                      <div className="flex items-start gap-3">
                        <User className="w-4 h-4 text-slate-400 mt-1" />
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 mb-0.5">Nome do Pai</p>
                          <p className="text-sm font-medium text-slate-800">{paciente.nomePai}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {paciente.observacoes && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Observações</h4>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{paciente.observacoes}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
