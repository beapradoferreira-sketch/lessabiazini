// ============================================================
// Lessa Biazini OS — Motor de Apuração Preliminar
// Estimativa NÃO vinculante de créditos previdenciários (INSS
// patronal / RAT / Terceiros) sobre verbas de natureza
// indenizatória, dentro da janela prescricional de 60 meses.
// Parâmetros ajustáveis em PARAMS — sem valores "mágicos" no código.
// ============================================================

const PARAMS = {
  JANELA_MESES: 60,            // prazo prescricional (5 anos)
  ALIQ_INSS_PATRONAL: 0.20,    // CPP — 20% sobre a folha
  ALIQ_TERCEIROS: 0.058,       // Sistema S / terceiros (média usual)
  SELIC_ACUMULADA_MEDIA: 0.22, // fator médio de atualização da janela (aprox.)
  // Percentual típico da folha representado por cada verba indenizatória.
  // Faixas conservadoras, usadas apenas para estimativa preliminar.
  VERBAS: {
    aviso_previo_indenizado: { rotulo: 'Aviso prévio indenizado',            pctFolha: 0.010 },
    quinze_dias_afastamento: { rotulo: '15 primeiros dias de afastamento',   pctFolha: 0.007 },
    salario_maternidade:     { rotulo: 'Salário-maternidade',                pctFolha: 0.006 },
    vale_transporte_pecunia: { rotulo: 'Vale-transporte pago em pecúnia',    pctFolha: 0.004 },
    abono_assiduidade:       { rotulo: 'Abonos e prêmios eventuais',         pctFolha: 0.008 },
  },
};

function round2(n) { return Math.round(n * 100) / 100; }

/**
 * Estima créditos previdenciários recuperáveis.
 * @param {object} input
 *  - folhaMensal  (number, R$) folha de pagamento mensal bruta
 *  - funcionarios (number)     nº de empregados CLT
 *  - ratAliquota  (1|2|3)      alíquota RAT do CNAE
 *  - fap          (number)     fator FAP (0.5–2.0), default 1
 *  - verbas       (string[])   chaves de PARAMS.VERBAS presentes na folha
 */
function estimarCreditos(input) {
  const folha = Number(input.folhaMensal) || 0;
  const funcionarios = Math.max(0, Math.trunc(Number(input.funcionarios) || 0));
  const rat = [1, 2, 3].includes(Number(input.ratAliquota)) ? Number(input.ratAliquota) / 100 : 0.02;
  const fap = Math.min(2, Math.max(0.5, Number(input.fap) || 1));
  const verbasSelecionadas = Array.isArray(input.verbas) ? input.verbas : [];

  if (folha <= 0) {
    return { ok: false, erro: 'Informe uma folha de pagamento mensal maior que zero.' };
  }

  const aliquotaTotal = PARAMS.ALIQ_INSS_PATRONAL + rat * fap + PARAMS.ALIQ_TERCEIROS;

  const linhas = [];
  let baseMensalExcluida = 0;
  for (const chave of verbasSelecionadas) {
    const v = PARAMS.VERBAS[chave];
    if (!v) continue;
    const baseMensal = folha * v.pctFolha;
    const creditoMensal = baseMensal * aliquotaTotal;
    baseMensalExcluida += baseMensal;
    linhas.push({
      chave,
      rotulo: v.rotulo,
      baseMensal: round2(baseMensal),
      creditoMensal: round2(creditoMensal),
      creditoJanela: round2(creditoMensal * PARAMS.JANELA_MESES),
    });
  }

  const principal = baseMensalExcluida * aliquotaTotal * PARAMS.JANELA_MESES;
  const atualizacao = principal * PARAMS.SELIC_ACUMULADA_MEDIA;
  const total = principal + atualizacao;

  // Faixa de confiança: a estimativa real depende dos dados de eSocial/DCTFWeb.
  const faixaMin = total * 0.6;
  const faixaMax = total * 1.25;

  return {
    ok: true,
    premissas: {
      janelaMeses: PARAMS.JANELA_MESES,
      aliquotaInssPatronal: PARAMS.ALIQ_INSS_PATRONAL,
      aliquotaRatEfetiva: round2(rat * fap * 10000) / 10000,
      aliquotaTerceiros: PARAMS.ALIQ_TERCEIROS,
      aliquotaTotal: round2(aliquotaTotal * 10000) / 10000,
      atualizacaoSelicMedia: PARAMS.SELIC_ACUMULADA_MEDIA,
    },
    entradas: { folhaMensal: folha, funcionarios, ratAliquota: rat * 100, fap, verbas: verbasSelecionadas },
    linhas,
    resumo: {
      baseMensalExcluida: round2(baseMensalExcluida),
      creditoPrincipal: round2(principal),
      atualizacaoEstimada: round2(atualizacao),
      totalEstimado: round2(total),
      faixaMin: round2(faixaMin),
      faixaMax: round2(faixaMax),
    },
    aviso: 'Estimativa preliminar e não vinculante. A apuração definitiva exige análise dos dados de eSocial, EFD-Reinf, DCTFWeb e folha analítica, conforme normativos vigentes.',
  };
}

/**
 * Score de lead 0–100: prioriza tíquete estimado, porte e completude do contato.
 */
function pontuarLead(lead, simulacao) {
  let score = 0;
  const total = simulacao?.resumo?.totalEstimado || 0;

  if (total >= 1_000_000) score += 45;
  else if (total >= 300_000) score += 35;
  else if (total >= 100_000) score += 25;
  else if (total > 0) score += 12;

  const func = Number(lead.funcionarios) || simulacao?.entradas?.funcionarios || 0;
  if (func >= 500) score += 20;
  else if (func >= 100) score += 15;
  else if (func >= 30) score += 8;

  if (lead.email && /.+@.+\..+/.test(lead.email)) score += 10;
  if (lead.whatsapp && String(lead.whatsapp).replace(/\D/g, '').length >= 10) score += 10;
  if (lead.tipo === 'escritorio') score += 10; // parceiro B2B recorrente vale mais que caso único
  if (lead.cnpj) score += 5;

  score = Math.min(100, score);
  const faixa = score >= 70 ? 'A — contato em até 4h' : score >= 45 ? 'B — contato em 24h' : 'C — fluxo de nutrição';
  return { score, faixa };
}

module.exports = { PARAMS, estimarCreditos, pontuarLead, round2 };
