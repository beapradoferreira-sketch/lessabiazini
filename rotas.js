// ============================================================
// Lessa Biazini OS — Roteador da API
// Usado pelo servidor local (server.js) e pela função serverless
// da Vercel (api/[...rota].js) — mesma lógica nos dois ambientes.
// ============================================================
const url = require('url');
const calc = require('./calc');
const db = require('./db');
const { gerarPropostaHTML } = require('./proposta');
const { usandoPostgres } = require('./store');

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function lerCorpo(req) {
  // Vercel já entrega req.body parseado; localmente lemos o stream.
  if (req.body !== undefined) {
    return Promise.resolve(typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}));
  }
  return new Promise((resolve, reject) => {
    let dados = '';
    req.on('data', c => {
      dados += c;
      if (dados.length > 1e6) { reject(new Error('Corpo muito grande')); req.destroy(); }
    });
    req.on('end', () => {
      try { resolve(dados ? JSON.parse(dados) : {}); }
      catch { reject(new Error('JSON inválido')); }
    });
  });
}

const rotas = {
  'POST /api/simulacao': async (_req, res, _q, corpo) => {
    json(res, 200, calc.estimarCreditos(corpo));
  },

  'POST /api/leads': async (_req, res, _q, corpo) => {
    const sim = corpo.simulacaoEntrada ? calc.estimarCreditos(corpo.simulacaoEntrada) : null;
    const scoreInfo = calc.pontuarLead(corpo, sim && sim.ok ? sim : null);
    const lead = await db.criarLead(corpo, scoreInfo, sim && sim.ok ? sim : null);
    json(res, 201, { lead, simulacao: sim });
  },

  'GET /api/leads': async (_req, res) => json(res, 200, await db.listarLeads()),

  'PATCH /api/leads/:id': async (_req, res, _q, corpo, params) => {
    const lead = await db.atualizarLead(params.id, corpo);
    lead ? json(res, 200, lead) : json(res, 404, { erro: 'Lead não encontrado' });
  },

  'GET /api/parceiros': async (_req, res) => json(res, 200, await db.listarParceiros()),
  'POST /api/parceiros': async (_req, res, _q, corpo) => json(res, 201, await db.criarParceiro(corpo)),

  'GET /api/casos': async (_req, res) => json(res, 200, await db.listarCasos()),
  'POST /api/casos': async (_req, res, _q, corpo) => json(res, 201, await db.criarCaso(corpo)),
  'POST /api/casos/:id/avancar': async (_req, res, _q, corpo, params) => {
    const r = await db.avancarCaso(params.id, corpo.observacao);
    r.erro ? json(res, 400, r) : json(res, 200, r.caso);
  },

  'GET /api/alertas': async (_req, res, q) =>
    json(res, 200, await db.alertasPrescricao(Number(q.meses) || 6)),

  'GET /api/dashboard': async (_req, res) => json(res, 200, await db.dashboard()),

  'GET /api/saude': async (_req, res) =>
    json(res, 200, { ok: true, banco: usandoPostgres ? 'postgres' : 'arquivo-json' }),

  'POST /api/propostas': async (_req, res, _q, corpo) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(gerarPropostaHTML(corpo));
  },
};

function acharRota(metodo, caminho) {
  for (const chave of Object.keys(rotas)) {
    const [m, padrao] = chave.split(' ');
    if (m !== metodo) continue;
    const pp = padrao.split('/'), cp = caminho.split('/');
    if (pp.length !== cp.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < pp.length; i++) {
      if (pp[i].startsWith(':')) params[pp[i].slice(1)] = decodeURIComponent(cp[i]);
      else if (pp[i] !== cp[i]) { ok = false; break; }
    }
    if (ok) return { handler: rotas[chave], params };
  }
  return null;
}

async function tratarRequisicao(req, res) {
  const { pathname, query } = url.parse(req.url, true);
  try {
    const rota = acharRota(req.method, pathname);
    if (!rota) return json(res, 404, { erro: 'Rota não encontrada' });
    const corpo = ['POST', 'PATCH', 'PUT'].includes(req.method) ? await lerCorpo(req) : {};
    await rota.handler(req, res, query, corpo, rota.params);
  } catch (e) {
    json(res, 500, { erro: e.message });
  }
}

module.exports = { tratarRequisicao };
