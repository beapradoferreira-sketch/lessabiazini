// ============================================================
// Lessa Biazini OS — Regras de negócio (async, sobre lib/store)
// ============================================================
const { store } = require('./store');

const ESTAGIOS = [
  'levantamento', 'apuracao', 'retificacao',
  'habilitacao', 'compensacao', 'concluido',
];

function agora() { return new Date().toISOString(); }

// ---------- Leads ----------
async function criarLead(dados, scoreInfo, simulacao) {
  const n = await store.proximo('lead');
  const lead = {
    id: 'L' + String(n).padStart(4, '0'),
    criadoEm: agora(),
    status: 'novo',
    nome: dados.nome || '',
    empresa: dados.empresa || '',
    tipo: dados.tipo === 'escritorio' ? 'escritorio' : 'empresa',
    email: dados.email || '',
    whatsapp: dados.whatsapp || '',
    cnpj: dados.cnpj || '',
    funcionarios: Number(dados.funcionarios) || 0,
    origem: dados.origem || 'simulador',
    score: scoreInfo.score,
    faixa: scoreInfo.faixa,
    simulacao: simulacao ? simulacao.resumo : null,
  };
  await store.gravar('leads', lead.id, lead);
  return lead;
}

async function atualizarLead(id, mudancas) {
  const lead = await store.obter('leads', id);
  if (!lead) return null;
  const permitidos = ['status', 'nome', 'empresa', 'email', 'whatsapp', 'observacoes'];
  for (const k of permitidos) if (k in mudancas) lead[k] = mudancas[k];
  await store.gravar('leads', id, lead);
  return lead;
}

// ---------- Parceiros ----------
async function criarParceiro(dados) {
  const n = await store.proximo('parceiro');
  const p = {
    id: 'P' + String(n).padStart(3, '0'),
    criadoEm: agora(),
    nome: dados.nome || 'Parceiro sem nome',
    contato: dados.contato || '',
    email: dados.email || '',
    cidade: dados.cidade || '',
  };
  await store.gravar('parceiros', p.id, p);
  return p;
}

// ---------- Casos ----------
async function criarCaso(dados) {
  const n = await store.proximo('caso');
  const c = {
    id: 'C' + String(n).padStart(4, '0'),
    criadoEm: agora(),
    parceiroId: dados.parceiroId || null,
    clienteFinal: dados.clienteFinal || '',
    tese: dados.tese || 'Exclusão de verbas indenizatórias da base do INSS patronal',
    valorEstimado: Number(dados.valorEstimado) || 0,
    estagio: ESTAGIOS[0],
    inicioJanela: dados.inicioJanela || agora().slice(0, 10),
    trilha: [{ em: agora(), evento: 'Caso aberto', estagio: ESTAGIOS[0] }],
  };
  await store.gravar('casos', c.id, c);
  return c;
}

async function avancarCaso(id, observacao) {
  const c = await store.obter('casos', id);
  if (!c) return { erro: 'Caso não encontrado.' };
  const idx = ESTAGIOS.indexOf(c.estagio);
  if (idx >= ESTAGIOS.length - 1) return { erro: 'Caso já concluído.' };
  c.estagio = ESTAGIOS[idx + 1];
  c.trilha.push({ em: agora(), evento: observacao || 'Avanço de estágio', estagio: c.estagio });
  await store.gravar('casos', id, c);
  return { caso: c };
}

// ---------- Alertas de prescrição ----------
async function alertasPrescricao(mesesAviso = 6) {
  const casos = await store.listar('casos');
  const hoje = new Date();
  const alertas = [];
  for (const c of casos) {
    if (c.estagio === 'concluido') continue;
    const prescreveEm = new Date(c.inicioJanela + 'T00:00:00');
    prescreveEm.setFullYear(prescreveEm.getFullYear() + 5);
    const mesesRestantes = (prescreveEm - hoje) / (1000 * 60 * 60 * 24 * 30.44);
    if (mesesRestantes <= mesesAviso) {
      alertas.push({
        casoId: c.id,
        clienteFinal: c.clienteFinal,
        estagio: c.estagio,
        prescreveEm: prescreveEm.toISOString().slice(0, 10),
        mesesRestantes: Math.max(0, Math.round(mesesRestantes * 10) / 10),
      });
    }
  }
  return alertas.sort((a, b) => a.mesesRestantes - b.mesesRestantes);
}

// ---------- Dashboard ----------
async function dashboard() {
  const [casos, leads, parceiros, alertas] = await Promise.all([
    store.listar('casos'), store.listar('leads'),
    store.listar('parceiros'), alertasPrescricao(),
  ]);
  const porEstagio = Object.fromEntries(ESTAGIOS.map(e => [e, 0]));
  let pipeline = 0;
  for (const c of casos) {
    porEstagio[c.estagio] = (porEstagio[c.estagio] || 0) + 1;
    if (c.estagio !== 'concluido') pipeline += c.valorEstimado;
  }
  return {
    casos: casos.length,
    porEstagio,
    pipelineEstimado: pipeline,
    leads: leads.length,
    leadsNovos: leads.filter(l => l.status === 'novo').length,
    leadsPrioridadeA: leads.filter(l => l.score >= 70 && l.status !== 'descartado').length,
    parceiros: parceiros.length,
    alertas: alertas.length,
  };
}

module.exports = {
  ESTAGIOS, criarLead, atualizarLead, criarParceiro,
  criarCaso, avancarCaso, alertasPrescricao, dashboard,
  listarLeads: () => store.listar('leads'),
  listarParceiros: () => store.listar('parceiros'),
  listarCasos: () => store.listar('casos'),
};
