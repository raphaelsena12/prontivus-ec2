/**
 * LGPD — Termo de Consentimento para Tratamento de Dados Pessoais e de Saúde
 *
 * Versionar sempre que o texto for alterado.
 * O paciente precisa aceitar novamente se a versão mudar.
 */

export const VERSAO_TERMO_ATUAL = "1.0";

export function getTextoTermo(nomeClinica: string): string {
  return `TERMO DE CONSENTIMENTO PARA TRATAMENTO DE DADOS PESSOAIS E DE SAÚDE

Em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD), este Termo tem o objetivo de obter o seu consentimento livre, informado e inequívoco para o tratamento dos seus dados pessoais e dados pessoais sensíveis (dados de saúde) pela clínica ${nomeClinica}, doravante denominada "Controladora".

1. DADOS COLETADOS
A Controladora coleta e trata os seguintes dados pessoais:
• Dados de identificação: nome completo, CPF, RG, data de nascimento, sexo, estado civil, profissão, filiação;
• Dados de contato: e-mail, telefone, celular, endereço completo;
• Dados de saúde: anamnese, exame físico, diagnósticos (CID), prescrições, resultados de exames, prontuário médico, histórico de consultas e atendimentos;
• Dados financeiros: histórico de pagamentos e dados de convênio/plano de saúde.

2. FINALIDADES DO TRATAMENTO
Os seus dados serão utilizados exclusivamente para:
a) Prestação de serviços de saúde e assistência médica;
b) Gestão do prontuário eletrônico e histórico clínico;
c) Agendamento de consultas e procedimentos;
d) Emissão de documentos médicos (atestados, receitas, laudos, guias TISS);
e) Faturamento e cobrança junto a operadoras de planos de saúde;
f) Comunicação sobre consultas, exames e tratamentos;
g) Cumprimento de obrigações legais e regulatórias (CFM, ANS, Vigilância Sanitária);
h) Telemedicina, quando aplicável.

3. COMPARTILHAMENTO DE DADOS
Seus dados poderão ser compartilhados com:
• Operadoras de planos de saúde, para fins de faturamento e autorização de procedimentos;
• Laboratórios e clínicas parceiras, quando necessário para continuidade do tratamento;
• Órgãos reguladores, quando exigido por lei;
• Prestadores de serviços de tecnologia, exclusivamente para operação do sistema, com cláusulas de confidencialidade.

4. INTELIGÊNCIA ARTIFICIAL
A Controladora utiliza ferramentas de Inteligência Artificial para auxiliar no atendimento médico (transcrição de consultas, sugestões clínicas). Seus dados pessoais identificáveis (nome, CPF, telefone, e-mail) são ANONIMIZADOS antes do envio a qualquer serviço de IA, garantindo que nenhum dado que o identifique diretamente seja processado por esses sistemas.

5. SEGURANÇA DOS DADOS
A Controladora adota medidas técnicas e organizacionais para proteger seus dados, incluindo:
• Criptografia de dados sensíveis em repouso (AES-256-GCM);
• Controle de acesso baseado em perfil (médico, secretária, administrador);
• Registro de auditoria (audit log) de todos os acessos e modificações em dados sensíveis;
• Política de senhas fortes e autenticação segura.

6. SEUS DIREITOS (Art. 18 da LGPD)
Você tem direito a:
a) Confirmar a existência de tratamento dos seus dados;
b) Acessar seus dados pessoais;
c) Corrigir dados incompletos, inexatos ou desatualizados;
d) Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade;
e) Solicitar a portabilidade dos seus dados;
f) Revogar este consentimento a qualquer momento, sem prejudicar o tratamento realizado anteriormente;
g) Obter informações sobre com quem seus dados foram compartilhados.

7. REVOGAÇÃO DO CONSENTIMENTO
Você pode revogar este consentimento a qualquer momento, sem custo, através do portal do paciente ou solicitando diretamente à clínica. A revogação não afeta a legalidade do tratamento realizado antes da revogação, nem o tratamento de dados necessários para cumprimento de obrigações legais (como a guarda do prontuário por 20 anos, conforme Resolução CFM nº 1.821/2007).

8. RETENÇÃO DOS DADOS
Seus dados serão mantidos pelo período necessário ao cumprimento das finalidades descritas e das obrigações legais aplicáveis, em especial:
• Prontuário médico: mínimo de 20 anos após o último atendimento (Resolução CFM nº 1.821/2007);
• Dados financeiros: conforme legislação tributária vigente.

Ao aceitar este termo, você declara que leu, compreendeu e concorda com o tratamento dos seus dados pessoais e de saúde nos termos aqui descritos.`;
}
