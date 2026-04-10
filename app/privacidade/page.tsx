import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politica de Privacidade - Prontivus",
  description: "Politica de Privacidade do aplicativo Prontivus",
};

export default function PoliticaDePrivacidade() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Politica de Privacidade
        </h1>
        <p className="text-sm text-gray-500 mb-10">
          Ultima atualizacao: 10 de abril de 2026
        </p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900">1. Introducao</h2>
            <p>
              A Prontivus (&quot;nos&quot;, &quot;nosso&quot; ou &quot;Plataforma&quot;) e um sistema de gestao medica e
              telemedicina que conecta pacientes a profissionais de saude. Esta Politica de Privacidade
              descreve como coletamos, usamos, armazenamos e protegemos seus dados pessoais, em
              conformidade com a Lei Geral de Protecao de Dados (LGPD - Lei 13.709/2018).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">2. Dados que Coletamos</h2>

            <h3 className="text-lg font-medium text-gray-800 mt-4">2.1. Dados de Identificacao</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Nome completo, CPF, data de nascimento</li>
              <li>Endereco de e-mail e telefone</li>
              <li>Foto de perfil (opcional)</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-800 mt-4">2.2. Dados Sensiveis de Saude</h3>
            <p>
              Nos termos do art. 5o, II da LGPD, coletamos dados sensiveis relativos a saude, incluindo:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Historico de consultas medicas e agendamentos</li>
              <li>Prescricoes e receitas medicas</li>
              <li>Resultados de exames e documentos medicos enviados</li>
              <li>Diagnosticos (CID) registrados em prontuario</li>
              <li>Registros de atendimentos de telemedicina</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-800 mt-4">2.3. Dados Financeiros</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Dados de pagamento (processados exclusivamente pela Stripe, Inc. — nao armazenamos
                numeros de cartao de credito em nossos servidores)
              </li>
              <li>Historico de transacoes de teleconsultas</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-800 mt-4">2.4. Dados Tecnicos</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Token de sessao de autenticacao (armazenado de forma criptografada no dispositivo)</li>
              <li>Informacoes do dispositivo para fins de seguranca</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">3. Base Legal para Tratamento</h2>
            <p>O tratamento dos seus dados pessoais e realizado com base nas seguintes hipoteses legais da LGPD:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Consentimento (art. 7o, I e art. 11, I):</strong> para dados sensiveis de saude,
                mediante consentimento expresso e especifico
              </li>
              <li>
                <strong>Execucao de contrato (art. 7o, V):</strong> para a prestacao do servico de
                agendamento de consultas e telemedicina
              </li>
              <li>
                <strong>Tutela da saude (art. 7o, VIII e art. 11, II, f):</strong> para o tratamento de
                dados relacionados a consultas medicas e prontuarios
              </li>
              <li>
                <strong>Obrigacao legal (art. 7o, II):</strong> para cumprimento de normas do CFM e
                regulamentacoes de saude
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">4. Finalidades do Tratamento</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Prestacao de servicos de telemedicina e agendamento de consultas</li>
              <li>Manutencao de prontuario eletronico conforme exigencias do CFM</li>
              <li>Processamento de pagamentos de teleconsultas</li>
              <li>Envio de notificacoes sobre consultas e agendamentos</li>
              <li>Melhoria e manutencao da seguranca da Plataforma</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">5. Compartilhamento de Dados</h2>
            <p>Seus dados podem ser compartilhados com:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Profissionais de saude:</strong> medicos vinculados a clinica que prestam
                atendimento ao paciente
              </li>
              <li>
                <strong>Stripe, Inc.:</strong> processamento seguro de pagamentos (certificado PCI DSS)
              </li>
              <li>
                <strong>Clinicas parceiras:</strong> para gestao de agendamentos e prontuarios, conforme
                relacao de atendimento
              </li>
              <li>
                <strong>Autoridades competentes:</strong> quando exigido por lei ou determinacao judicial
              </li>
            </ul>
            <p className="mt-2">
              <strong>Nao vendemos, alugamos ou comercializamos seus dados pessoais com terceiros para
              fins de marketing ou publicidade.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">6. Seguranca dos Dados</h2>
            <p>Adotamos medidas tecnicas e organizacionais para proteger seus dados:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Criptografia AES-256-GCM para campos sensiveis em repouso</li>
              <li>Comunicacao criptografada via HTTPS/TLS em transito</li>
              <li>Armazenamento seguro de tokens de autenticacao com criptografia no dispositivo</li>
              <li>Controle de acesso baseado em perfis (paciente, medico, administrador)</li>
              <li>Monitoramento e auditoria de acessos</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">7. Retencao de Dados</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Prontuarios medicos:</strong> mantidos pelo prazo minimo de 20 anos, conforme
                Resolucao CFM 1.821/2007
              </li>
              <li>
                <strong>Dados cadastrais:</strong> mantidos enquanto o cadastro estiver ativo ou conforme
                obrigacao legal
              </li>
              <li>
                <strong>Dados de pagamento:</strong> conforme prazos da legislacao fiscal e tributaria
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">8. Seus Direitos (LGPD)</h2>
            <p>Voce tem direito a:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Confirmar a existencia de tratamento de dados</li>
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
              <li>Solicitar anonimizacao, bloqueio ou eliminacao de dados desnecessarios</li>
              <li>Solicitar a portabilidade dos dados a outro fornecedor</li>
              <li>Revogar o consentimento a qualquer momento</li>
              <li>Obter informacoes sobre o compartilhamento dos dados</li>
            </ul>
            <p className="mt-2">
              Para exercer seus direitos, entre em contato pelo e-mail:{" "}
              <strong>privacidade@prontivus.com</strong>
            </p>
            <p>
              <em>
                Nota: a exclusao de prontuarios medicos pode ser limitada por obrigacoes legais do CFM.
              </em>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">9. Uso de Camera e Midia</h2>
            <p>O aplicativo solicita acesso a:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Camera:</strong> para fotografar e enviar exames medicos e para videochamadas
                de telemedicina
              </li>
              <li>
                <strong>Galeria de fotos:</strong> para selecionar documentos e exames ja salvos no
                dispositivo
              </li>
              <li>
                <strong>Microfone:</strong> para consultas de telemedicina por videochamada
              </li>
            </ul>
            <p className="mt-2">
              Essas permissoes sao solicitadas apenas quando necessario e podem ser revogadas nas
              configuracoes do dispositivo a qualquer momento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">10. Telemedicina</h2>
            <p>
              Os servicos de telemedicina sao prestados em conformidade com a Resolucao CFM 2.314/2022.
              As teleconsultas sao realizadas por medicos devidamente registrados no Conselho Regional
              de Medicina (CRM). O consentimento para atendimento por telemedicina e coletado antes de
              cada sessao.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">11. Alteracoes nesta Politica</h2>
            <p>
              Podemos atualizar esta Politica de Privacidade periodicamente. Alteracoes significativas
              serao comunicadas por meio do aplicativo ou por e-mail. Recomendamos a consulta periodica
              desta pagina.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">12. Contato</h2>
            <p>
              Para duvidas, solicitacoes ou exercicio de direitos relacionados a privacidade e protecao
              de dados:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>E-mail: <strong>privacidade@prontivus.com</strong></li>
              <li>Site: <strong>prontivus.com</strong></li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
