import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso - Prontivus",
  description: "Termos de Uso do aplicativo Prontivus",
};

export default function TermosDeUso() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Termos de Uso
        </h1>
        <p className="text-sm text-gray-500 mb-10">
          Ultima atualizacao: 10 de abril de 2026
        </p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900">1. Aceitacao dos Termos</h2>
            <p>
              Ao acessar ou utilizar o aplicativo Prontivus (&quot;Plataforma&quot;), voce concorda
              integralmente com estes Termos de Uso. Caso nao concorde, nao utilize a Plataforma.
              O uso continuado apos alteracoes constitui aceitacao dos termos revisados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">2. Descricao do Servico</h2>
            <p>A Prontivus e uma plataforma de gestao medica e telemedicina que oferece:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Agendamento de consultas presenciais e por telemedicina</li>
              <li>Teleconsultas por videochamada com medicos registrados no CRM</li>
              <li>Acesso a historico de consultas, prescricoes e exames</li>
              <li>Envio e armazenamento de documentos e exames medicos</li>
              <li>Processamento de pagamentos para teleconsultas</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">3. Cadastro e Conta</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>O cadastro e realizado pela clinica ou pelo proprio paciente</li>
              <li>Voce e responsavel por manter a confidencialidade de suas credenciais de acesso</li>
              <li>As informacoes fornecidas devem ser verdadeiras, completas e atualizadas</li>
              <li>Voce deve notificar imediatamente sobre qualquer uso nao autorizado da sua conta</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">4. Telemedicina</h2>

            <h3 className="text-lg font-medium text-gray-800 mt-4">4.1. Natureza do Servico</h3>
            <p>
              Os servicos de telemedicina sao prestados em conformidade com a Resolucao CFM 2.314/2022
              e demais normas aplicaveis. A Prontivus atua como plataforma tecnologica, conectando
              pacientes a medicos. Os atendimentos sao realizados por profissionais devidamente
              registrados no Conselho Regional de Medicina (CRM).
            </p>

            <h3 className="text-lg font-medium text-gray-800 mt-4">4.2. Consentimento</h3>
            <p>
              Antes de cada teleconsulta, voce devera aceitar o Termo de Consentimento para
              Atendimento por Telemedicina, conforme exigido pela legislacao vigente.
            </p>

            <h3 className="text-lg font-medium text-gray-800 mt-4">4.3. Limitacoes</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                A telemedicina <strong>nao substitui</strong> atendimento presencial de urgencia
                ou emergencia
              </li>
              <li>
                Em caso de emergencia medica, ligue imediatamente para o <strong>SAMU (192)</strong> ou
                dirija-se ao pronto-socorro mais proximo
              </li>
              <li>
                O medico pode, a seu criterio clinico, encaminhar o paciente para atendimento
                presencial quando julgar necessario
              </li>
              <li>
                A qualidade da teleconsulta depende de uma conexao de internet estavel, sendo
                responsabilidade do paciente garantir as condicoes tecnicas adequadas
              </li>
            </ul>

            <h3 className="text-lg font-medium text-gray-800 mt-4">4.4. Prescricoes Digitais</h3>
            <p>
              As prescricoes emitidas por meio da Plataforma sao de responsabilidade do medico
              prescritor e devem atender as normas do CFM e da ANVISA. A validade das prescricoes
              digitais depende da assinatura digital do medico.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">5. Pagamentos</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Os pagamentos de teleconsultas sao processados pela Stripe, Inc., em ambiente seguro
                certificado PCI DSS
              </li>
              <li>O valor da consulta e informado antes da confirmacao do pagamento</li>
              <li>
                A politica de reembolso segue as regras do Codigo de Defesa do Consumidor. Em caso
                de consulta nao realizada por falha da Plataforma, o reembolso integral sera efetuado
              </li>
              <li>
                Em caso de desistencia pelo paciente apos o inicio da consulta, nao havera direito
                a reembolso
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">6. Obrigacoes do Usuario</h2>
            <p>Ao utilizar a Plataforma, voce se compromete a:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Fornecer informacoes verdadeiras e atualizadas</li>
              <li>Nao utilizar a Plataforma para fins ilicitos</li>
              <li>Nao compartilhar suas credenciais de acesso com terceiros</li>
              <li>
                Nao gravar, reproduzir ou divulgar o conteudo das teleconsultas sem autorizacao
                expressa do medico
              </li>
              <li>Manter um ambiente adequado e com conexao estavel durante teleconsultas</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">7. Propriedade Intelectual</h2>
            <p>
              Todo o conteudo da Plataforma, incluindo textos, imagens, logotipos, interfaces e
              codigo-fonte, e protegido por direitos autorais e propriedade intelectual. E vedada
              a reproducao, distribuicao ou modificacao sem autorizacao previa e expressa da
              Prontivus.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">8. Privacidade e Protecao de Dados</h2>
            <p>
              O tratamento dos seus dados pessoais e regido pela nossa{" "}
              <a href="/privacidade" className="text-blue-600 underline hover:text-blue-800">
                Politica de Privacidade
              </a>
              , que e parte integrante destes Termos de Uso. Ao utilizar a Plataforma, voce declara
              ter lido e concordado com a Politica de Privacidade.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">9. Limitacao de Responsabilidade</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                A Prontivus nao se responsabiliza por diagnosticos, tratamentos ou prescricoes
                emitidas pelos medicos, que sao profissionais independentes
              </li>
              <li>
                A Prontivus nao garante disponibilidade ininterrupta da Plataforma, podendo haver
                interrupcoes para manutencao
              </li>
              <li>
                A Prontivus nao se responsabiliza por falhas de conexao de internet do usuario
                durante teleconsultas
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">10. Suspensao e Encerramento</h2>
            <p>
              A Prontivus reserva-se o direito de suspender ou encerrar o acesso do usuario que
              violar estes Termos de Uso, sem prejuizo de outras medidas cabiveis. O usuario pode
              solicitar o encerramento da conta a qualquer momento, respeitadas as obrigacoes legais
              de retencao de dados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">11. Alteracoes nos Termos</h2>
            <p>
              A Prontivus pode alterar estes Termos de Uso a qualquer momento. Alteracoes
              significativas serao comunicadas por meio do aplicativo ou por e-mail. O uso
              continuado da Plataforma apos a notificacao constitui aceitacao dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">12. Legislacao Aplicavel e Foro</h2>
            <p>
              Estes Termos de Uso sao regidos pelas leis da Republica Federativa do Brasil. Fica
              eleito o foro da comarca do domicilio do usuario para dirimir quaisquer controversias
              oriundas destes Termos, conforme o Codigo de Defesa do Consumidor.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">13. Contato</h2>
            <p>Para duvidas sobre estes Termos de Uso:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>E-mail: <strong>contato@prontivus.com</strong></li>
              <li>Site: <strong>prontivus.com</strong></li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
