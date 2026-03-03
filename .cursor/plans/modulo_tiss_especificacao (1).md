# 📦 MÓDULO TISS -- ESPECIFICAÇÃO TÉCNICA

**Versão baseada no Padrão TISS Janeiro/2026 -- v4.02.00**\
Conforme normas da Agência Nacional de Saúde Suplementar (ANS)

------------------------------------------------------------------------

# 1. Objetivo

Implementar no SaaS um Módulo TISS capaz de:

-   Criar guias (Consulta, SP/SADT, Internação, Honorário)
-   Agrupar guias em lotes
-   Gerar XML no padrão TISS v4.02.00
-   Validar contra XSD oficial
-   Disponibilizar download do XML para envio manual ao portal da
    operadora
-   Garantir conformidade com TUSS e regras organizacionais

⚠️ IMPORTANTE: - Utilizar obrigatoriamente a base de dados TUSS já
existente no sistema. - Não criar nova tabela de procedimentos fora da
base TUSS oficial. - Todos os procedimentos devem referenciar os códigos
TUSS já cadastrados.

------------------------------------------------------------------------

# 2. Escopo Inicial (MVP)

Implementar inicialmente:

-   Guia de Consulta
-   Guia SP/SADT
-   Lote de guias
-   Geração de XML
-   Download manual
-   Validação XSD

Fora do escopo inicial: - Envio automático para operadora -
Processamento de retorno - Conciliação financeira

------------------------------------------------------------------------

# 3. Perfil de Usuário

Todo o fluxo do módulo TISS deve ser executado pelo perfil:

## 👩‍💼 Usuário: Secretária

A secretária será responsável por:

-   Criar novas guias
-   Editar guias
-   Validar informações
-   Criar lotes
-   Gerar XML
-   Baixar XML para envio manual
-   Acompanhar status das guias

O sistema deve ser simples, guiado e com validações automáticas para
evitar erros operacionais.

------------------------------------------------------------------------

# 4. Organização Interna do Sistema

Deve ser criada uma pasta dedicada ao módulo:

/tiss/

Estrutura recomendada:

tiss/ ├── domain/ ├── application/ ├── infrastructure/ │ ├──
xml_builder/ │ ├── validator/ │ ├── xsd/ ├── api/ ├── storage/ ├── logs/
├── exports/ └── tests/

A pasta /tiss/ será responsável por armazenar:

-   Código fonte do módulo
-   Schemas XSD oficiais
-   XMLs gerados
-   Logs de geração
-   Relatórios de validação
-   Arquivos exportados

------------------------------------------------------------------------

# 5. Modelagem de Banco de Dados

## 5.1 tiss_guias

-   id (UUID)
-   tenant_id (UUID)
-   tipo_guia (ENUM)
-   numero_guia (VARCHAR)
-   paciente_id (UUID)
-   operadora_id (UUID)
-   numero_carteirinha (VARCHAR)
-   data_atendimento (DATE)
-   status (ENUM)
-   created_at (TIMESTAMP)
-   updated_at (TIMESTAMP)

## 5.2 tiss_guias_procedimentos

⚠️ IMPORTANTE: Os procedimentos devem referenciar a base TUSS já
existente no sistema.

Campos:

-   id (UUID)
-   guia_id (UUID)
-   tuss_id (FK para tabela TUSS já existente)
-   quantidade (INT)
-   valor_unitario (DECIMAL)
-   valor_total (DECIMAL)

------------------------------------------------------------------------

# 6. Interface do Usuário

Menu:

TISS\
- Nova Guia\
- Guias\
- Lotes\
- Relatórios

Fluxo da Secretária:

1.  Criar Guia
2.  Adicionar Procedimentos (base TUSS existente)
3.  Validar
4.  Criar Lote
5.  Gerar XML
6.  Baixar XML
7.  Enviar manualmente ao portal da operadora

------------------------------------------------------------------------

# 7. Estrutura XML Base

`<mensagemTISS>`{=html} `<cabecalho>`{=html}
`<identificacaoTransacao>`{=html}
`<tipoTransacao>`{=html}ENVIO_LOTE_GUIAS`</tipoTransacao>`{=html}
`<sequencialTransacao>`{=html}...`</sequencialTransacao>`{=html}
`<dataRegistroTransacao>`{=html}YYYY-MM-DD`</dataRegistroTransacao>`{=html}
`<horaRegistroTransacao>`{=html}HH:MM:SS`</horaRegistroTransacao>`{=html}
`</identificacaoTransacao>`{=html} `</cabecalho>`{=html}

`<prestadorParaOperadora>`{=html} `<loteGuias>`{=html}
`<numeroLote>`{=html}...`</numeroLote>`{=html} `<guiasTISS>`{=html}
`</guiasTISS>`{=html} `</loteGuias>`{=html}
`</prestadorParaOperadora>`{=html} `</mensagemTISS>`{=html}

------------------------------------------------------------------------

# 8. Regras de Negócio

-   Não permitir XML se status ≠ VALIDATED
-   Não permitir guia sem procedimento
-   Procedimentos devem existir na base TUSS
-   Validar datas futuras
-   Validar CPF/CNPJ prestador
-   Toda geração de XML deve registrar log

------------------------------------------------------------------------

# 9. Segurança

-   Criptografia de dados sensíveis
-   Controle de acesso por perfil (Secretária)
-   Logs auditáveis
-   Versionamento TISS

------------------------------------------------------------------------

# 10. Roadmap Futuro

Fase 2: - Assinatura digital - Integração SOAP

Fase 3: - Recepção retorno operadora - Conciliação financeira -
Dashboard de glosas

------------------------------------------------------------------------

Documento preparado para uso em ferramentas de geração de código como
Claude Code.
