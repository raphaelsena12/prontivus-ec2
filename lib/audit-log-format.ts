/**
 * Formatação humana da coluna "Detalhes" do log de auditoria.
 *
 * Recebe o registro completo (action + resource + details) e devolve
 * uma frase única, formal, pronta para exibição na tabela.
 *
 * Mantém o mesmo `details` cru disponível no diálogo de inspeção.
 */

type Details = Record<string, unknown> | null | undefined;

interface AuditLogLike {
  action: string;
  resource: string;
  details: Details;
}

const TIPO_DOCUMENTO_LABELS: Record<string, string> = {
  "ficha-atendimento": "Ficha de Atendimento",
  "receita": "Receita",
  "receita-simples": "Receita Simples",
  "receita-controle-especial": "Receita de Controle Especial",
  "atestado": "Atestado",
  "atestado-medico": "Atestado Médico",
  "laudo": "Laudo",
  "laudo-medico": "Laudo Médico",
  "solicitacao-exames": "Solicitação de Exames",
  "encaminhamento": "Encaminhamento",
  "declaracao-comparecimento": "Declaração de Comparecimento",
  "relatorio-medico": "Relatório Médico",
};

const TIPO_USUARIO_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN_CLINICA: "Admin de Clínica",
  MEDICO: "Médico",
  SECRETARIA: "Secretaria",
  PACIENTE: "Paciente",
};

const IA_OPERATION_LABELS: Record<string, string> = {
  "process-transcription": "Processamento de transcrição",
  "anamnese-stream": "Geração de anamnese (streaming)",
  "generate-anamnese": "Geração de anamnese",
  "analisar-exames": "Análise de exames",
  "analisar-exame-detalhado": "Análise detalhada de exame",
  "resumo-clinico": "Resumo clínico",
  "resumo-paciente": "Resumo do paciente",
  "sugerir-prescricao": "Sugestão de prescrição",
};

function s(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const str = String(v).trim();
  return str.length > 0 ? str : null;
}

function tipoDoc(v: unknown): string {
  const raw = s(v);
  if (!raw) return "documento";
  return TIPO_DOCUMENTO_LABELS[raw] ?? raw;
}

/**
 * Retorna a descrição humana da ação registrada.
 *
 * Padrão de saída: uma frase formal terminada em complemento opcional
 * separado por " — ". Ex.: "Atendimento finalizado — Paciente: ..."
 */
export function formatAuditDetails(log: AuditLogLike): string {
  const { action, resource } = log;
  const d = (log.details ?? {}) as Record<string, unknown>;

  const pacienteNome = s(d.pacienteNome);
  const usuarioNome = s(d.usuarioNome);
  const usuarioEmail = s(d.usuarioEmail);
  const operacao = s(d.operacao) ?? s(d.operation);

  // ── IA Clínica ────────────────────────────────────────────────────────
  if (resource === "clinical_ai") {
    const opLabel = IA_OPERATION_LABELS[action] ?? action;
    const partes: string[] = [`IA Clínica — ${opLabel}`];
    if (d.success === false) {
      const err = s(d.errorMessage) ?? "falha não especificada";
      partes.push(`Falha: ${err}`);
    } else if (d.success === true) {
      partes.push("Sucesso");
    }
    if (typeof d.tokensUsed === "number") partes.push(`${d.tokensUsed} tokens`);
    if (typeof d.latencyMs === "number") partes.push(`${d.latencyMs} ms`);
    if (s(d.model)) partes.push(`Modelo: ${d.model}`);
    return partes.join(" — ");
  }

  // ── Segurança ─────────────────────────────────────────────────────────
  if (action === "ACCESS_DENIED") {
    const path = s(d.pathname);
    const reason = s(d.reason);
    const partes = ["Acesso negado pelo sistema"];
    if (path) partes.push(`Rota: ${path}`);
    if (reason) partes.push(`Motivo: ${reason}`);
    return partes.join(" — ");
  }

  if (action === "LOGIN") return "Autenticação realizada (login)";
  if (action === "LOGOUT") return "Encerramento de sessão (logout)";

  // ── Consulta ──────────────────────────────────────────────────────────
  if (resource === "Consulta") {
    if (action === "VIEW") {
      const partes = ["Atendimento aberto pelo médico"];
      if (pacienteNome) partes.push(`Paciente: ${pacienteNome}`);
      return partes.join(" — ");
    }
    if (action === "UPDATE") {
      const op = operacao ?? "Atendimento atualizado";
      const partes: string[] = [];
      if (op.toLowerCase().includes("telemedicina")) {
        partes.push("Atendimento de telemedicina finalizado");
        const dur = typeof d.duracaoSegundos === "number" ? d.duracaoSegundos : null;
        if (dur !== null) {
          const min = Math.floor(dur / 60);
          const sec = dur % 60;
          partes.push(`Duração: ${min}m${sec.toString().padStart(2, "0")}s`);
        }
      } else if (op.toLowerCase().includes("finaliz")) {
        partes.push("Atendimento finalizado");
      } else {
        partes.push(op);
      }
      if (pacienteNome) partes.push(`Paciente: ${pacienteNome}`);
      return partes.join(" — ");
    }
  }

  // ── Prontuário ────────────────────────────────────────────────────────
  if (resource === "Prontuario") {
    if (action === "VIEW") {
      if (operacao && operacao.toLowerCase().includes("completo")) {
        const partes = ["Prontuário completo visualizado pelo paciente"];
        if (pacienteNome) partes.push(`Paciente: ${pacienteNome}`);
        return partes.join(" — ");
      }
      const partes = ["Listagem de prontuários consultada"];
      const search = s(d.search);
      const total = typeof d.total === "number" ? d.total : null;
      if (search) partes.push(`Busca: "${search}"`);
      if (total !== null) partes.push(`${total} resultado(s)`);
      return partes.join(" — ");
    }
    if (action === "CREATE") {
      const partes = ["Prontuário criado"];
      if (pacienteNome) partes.push(`Paciente: ${pacienteNome}`);
      return partes.join(" — ");
    }
    if (action === "UPDATE") {
      const op = (operacao ?? "").toLowerCase();
      let titulo = "Prontuário atualizado";
      if (op.includes("finaliz")) titulo = "Atendimento finalizado e prontuário consolidado";
      else if (op.includes("criou")) titulo = "Prontuário criado";
      const partes = [titulo];
      if (pacienteNome) partes.push(`Paciente: ${pacienteNome}`);
      return partes.join(" — ");
    }
  }

  // ── Documento ─────────────────────────────────────────────────────────
  if (resource === "Documento") {
    const tipo = tipoDoc(d.tipoDocumento);
    if (action === "EXPORT") {
      return `Documento gerado e baixado em PDF — Tipo: ${tipo}`;
    }
    if (action === "CREATE") {
      return `Documento clínico registrado no prontuário — Tipo: ${tipo}`;
    }
    if (action === "UPDATE") {
      return `Documento clínico atualizado — Tipo: ${tipo}`;
    }
    if (action === "DELETE") {
      return `Documento clínico removido — Tipo: ${tipo}`;
    }
  }

  // ── Paciente ──────────────────────────────────────────────────────────
  if (resource === "Paciente") {
    const opLower = (operacao ?? "").toLowerCase();

    if (action === "VIEW") {
      if (operacao === "resumo-clinico" || opLower.includes("resumo")) {
        const partes = ["Resumo clínico do paciente consultado"];
        if (pacienteNome) partes.push(`Paciente: ${pacienteNome}`);
        return partes.join(" — ");
      }
      if (pacienteNome) {
        return `Cadastro de paciente consultado — Paciente: ${pacienteNome}`;
      }
      const total = typeof d.total === "number" ? d.total : null;
      const partes = ["Listagem de pacientes consultada"];
      if (total !== null) partes.push(`${total} resultado(s)`);
      return partes.join(" — ");
    }

    if (action === "CREATE") {
      if (opLower.includes("solicita") && opLower.includes("dsar")) {
        const partes = [`Solicitação LGPD registrada — ${operacao}`];
        if (pacienteNome) partes.push(`Paciente: ${pacienteNome}`);
        return partes.join(" — ");
      }
      if (opLower.includes("aceitou") && opLower.includes("consentimento")) {
        const versao = s(d.versaoTermo);
        const partes = ["Termo de consentimento LGPD aceito (portal online)"];
        if (versao) partes.push(`Versão: ${versao}`);
        if (pacienteNome) partes.push(`Paciente: ${pacienteNome}`);
        return partes.join(" — ");
      }
      if (opLower.includes("registrou") && opLower.includes("presencial")) {
        const versao = s(d.versaoTermo);
        const por = s(d.registradoPor);
        const partes = ["Termo de consentimento LGPD registrado presencialmente"];
        if (versao) partes.push(`Versão: ${versao}`);
        if (por) partes.push(`Registrado por: ${por}`);
        if (pacienteNome) partes.push(`Paciente: ${pacienteNome}`);
        return partes.join(" — ");
      }
      const partes = ["Paciente cadastrado"];
      if (pacienteNome) partes.push(`Paciente: ${pacienteNome}`);
      const numProntuario = s(d.numeroProntuario);
      if (numProntuario) partes.push(`Prontuário nº ${numProntuario}`);
      return partes.join(" — ");
    }

    if (action === "UPDATE") {
      if (opLower.includes("dsar")) {
        const partes = [`Atualização de solicitação LGPD — ${operacao}`];
        if (pacienteNome) partes.push(`Paciente: ${pacienteNome}`);
        return partes.join(" — ");
      }
      if (opLower.includes("revogou") && opLower.includes("consentimento")) {
        const n = typeof d.consentimentosRevogados === "number" ? d.consentimentosRevogados : null;
        const partes = ["Consentimento LGPD revogado pelo paciente"];
        if (n !== null) partes.push(`${n} consentimento(s) revogado(s)`);
        if (pacienteNome) partes.push(`Paciente: ${pacienteNome}`);
        return partes.join(" — ");
      }
      const campo = s(d.campo);
      let titulo = "Cadastro de paciente atualizado";
      if (campo === "dados-saude-medico") titulo = "Dados de saúde atualizados pelo médico";
      else if (campo === "dados-saude-self-service") titulo = "Dados de saúde atualizados pelo próprio paciente";

      const partes = [titulo];
      if (pacienteNome) partes.push(`Paciente: ${pacienteNome}`);

      const camposAlteradosObj = d.camposAlterados;
      let nomesCampos: string[] = [];
      if (Array.isArray(camposAlteradosObj)) {
        nomesCampos = camposAlteradosObj.map(String);
      } else if (camposAlteradosObj && typeof camposAlteradosObj === "object") {
        nomesCampos = Object.keys(camposAlteradosObj as Record<string, unknown>);
      }
      if (nomesCampos.length > 0) {
        partes.push(`Campos alterados: ${nomesCampos.join(", ")}`);
      }
      return partes.join(" — ");
    }

    if (action === "EXPORT") {
      const partes = ["Exportação de dados pessoais (LGPD Art. 18)"];
      if (pacienteNome) partes.push(`Paciente: ${pacienteNome}`);
      const total = typeof d.totalConsultas === "number" ? d.totalConsultas : null;
      if (total !== null) partes.push(`${total} consulta(s) incluída(s)`);
      return partes.join(" — ");
    }

    if (action === "DELETE") {
      const partes = ["Paciente inativado (soft-delete)"];
      if (pacienteNome) partes.push(`Paciente: ${pacienteNome}`);
      return partes.join(" — ");
    }
  }

  // ── Usuário (operadores do sistema) ───────────────────────────────────
  if (resource === "Usuario") {
    const tipo = s(d.tipo);
    const tipoLabel = tipo ? TIPO_USUARIO_LABELS[tipo] ?? tipo : null;

    if (action === "CREATE") {
      const partes = ["Novo usuário cadastrado"];
      if (tipoLabel) partes.push(`Perfil: ${tipoLabel}`);
      if (usuarioNome) partes.push(`Usuário: ${usuarioNome}`);
      if (usuarioEmail) partes.push(`E-mail: ${usuarioEmail}`);
      return partes.join(" — ");
    }
    if (action === "UPDATE") {
      const partes = ["Cadastro de usuário atualizado"];
      if (usuarioNome) partes.push(`Usuário: ${usuarioNome}`);
      const camposAlteradosObj = d.camposAlterados;
      let nomesCampos: string[] = [];
      if (camposAlteradosObj && typeof camposAlteradosObj === "object" && !Array.isArray(camposAlteradosObj)) {
        nomesCampos = Object.keys(camposAlteradosObj as Record<string, unknown>);
      } else if (Array.isArray(camposAlteradosObj)) {
        nomesCampos = camposAlteradosObj.map(String);
      }
      if (nomesCampos.length > 0) partes.push(`Campos alterados: ${nomesCampos.join(", ")}`);
      if (d.senhaAlterada === true) partes.push("Senha redefinida");
      return partes.join(" — ");
    }
    if (action === "DELETE") {
      const partes = ["Usuário inativado (soft-delete)"];
      if (usuarioNome) partes.push(`Usuário: ${usuarioNome}`);
      return partes.join(" — ");
    }
    if (action === "VIEW") {
      const partes = ["Cadastro de usuário consultado"];
      if (usuarioNome) partes.push(`Usuário: ${usuarioNome}`);
      return partes.join(" — ");
    }
  }

  // ── Prescrição ────────────────────────────────────────────────────────
  if (resource === "Prescricao") {
    if (action === "CREATE") return `Prescrição emitida${pacienteNome ? ` — Paciente: ${pacienteNome}` : ""}`;
    if (action === "UPDATE") return `Prescrição atualizada${pacienteNome ? ` — Paciente: ${pacienteNome}` : ""}`;
    if (action === "DELETE") return `Prescrição removida${pacienteNome ? ` — Paciente: ${pacienteNome}` : ""}`;
    if (action === "VIEW") return `Prescrição visualizada${pacienteNome ? ` — Paciente: ${pacienteNome}` : ""}`;
    if (action === "EXPORT") return `Prescrição exportada em PDF${pacienteNome ? ` — Paciente: ${pacienteNome}` : ""}`;
  }

  // ── Exame ─────────────────────────────────────────────────────────────
  if (resource === "Exame") {
    if (action === "CREATE") return `Exame registrado${pacienteNome ? ` — Paciente: ${pacienteNome}` : ""}`;
    if (action === "UPDATE") return `Exame atualizado${pacienteNome ? ` — Paciente: ${pacienteNome}` : ""}`;
    if (action === "DELETE") return `Exame removido${pacienteNome ? ` — Paciente: ${pacienteNome}` : ""}`;
    if (action === "VIEW") return `Exame visualizado${pacienteNome ? ` — Paciente: ${pacienteNome}` : ""}`;
    if (action === "EXPORT") return `Exame exportado em PDF${pacienteNome ? ` — Paciente: ${pacienteNome}` : ""}`;
  }

  // ── Fallback ──────────────────────────────────────────────────────────
  if (operacao) return operacao;
  if (pacienteNome) return `Paciente: ${pacienteNome}`;
  if (usuarioNome) return `Usuário: ${usuarioNome}`;
  return "Ação registrada sem detalhes adicionais";
}
