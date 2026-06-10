// ============================================================
// Lessa Biazini OS — Camada de armazenamento (async)
// Dois backends, mesma interface:
//   • DATABASE_URL definido  → Postgres (Supabase, Neon, etc.)
//   • sem DATABASE_URL       → arquivo JSON local (desenvolvimento)
// Na Vercel o filesystem é somente leitura: defina DATABASE_URL.
// ============================================================
const fs = require('fs');
const path = require('path');

const USAR_PG = !!process.env.DATABASE_URL;

// ---------------- Backend Postgres ----------------
let _pool = null;
let _schemaPronto = null;

function pool() {
  if (_pool) return _pool;
  const { Pool } = require('pg');
  _pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
    max: 3, // serverless: poucas conexões por instância
  });
  return _pool;
}

function garantirSchema() {
  if (_schemaPronto) return _schemaPronto;
  _schemaPronto = pool().query(`
    CREATE TABLE IF NOT EXISTS registros (
      colecao   text NOT NULL,
      id        text NOT NULL,
      dados     jsonb NOT NULL,
      criado_em timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (colecao, id)
    );
    CREATE TABLE IF NOT EXISTS contadores (
      nome  text PRIMARY KEY,
      valor integer NOT NULL DEFAULT 0
    );
  `);
  return _schemaPronto;
}

const pg = {
  async listar(colecao) {
    await garantirSchema();
    const r = await pool().query(
      'SELECT dados FROM registros WHERE colecao = $1 ORDER BY criado_em DESC', [colecao]);
    return r.rows.map(x => x.dados);
  },
  async obter(colecao, id) {
    await garantirSchema();
    const r = await pool().query(
      'SELECT dados FROM registros WHERE colecao = $1 AND id = $2', [colecao, id]);
    return r.rows[0]?.dados || null;
  },
  async gravar(colecao, id, dados) {
    await garantirSchema();
    await pool().query(`
      INSERT INTO registros (colecao, id, dados) VALUES ($1, $2, $3)
      ON CONFLICT (colecao, id) DO UPDATE SET dados = EXCLUDED.dados`,
      [colecao, id, dados]);
    return dados;
  },
  async proximo(nome) {
    await garantirSchema();
    const r = await pool().query(`
      INSERT INTO contadores (nome, valor) VALUES ($1, 1)
      ON CONFLICT (nome) DO UPDATE SET valor = contadores.valor + 1
      RETURNING valor`, [nome]);
    return r.rows[0].valor;
  },
};

// ---------------- Backend JSON local ----------------
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const VAZIO = { colecoes: { leads: [], parceiros: [], casos: [] }, seq: {} };
let cache = null;

function carregarJson() {
  if (cache) return cache;
  try {
    const bruto = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    // compatibilidade com o formato antigo (leads/parceiros/casos na raiz)
    cache = bruto.colecoes ? bruto : {
      colecoes: { leads: bruto.leads || [], parceiros: bruto.parceiros || [], casos: bruto.casos || [] },
      seq: bruto.seq || {},
    };
  } catch {
    cache = structuredClone(VAZIO);
  }
  return cache;
}

function salvarJson() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

const arquivo = {
  async listar(colecao) {
    return [...(carregarJson().colecoes[colecao] || [])];
  },
  async obter(colecao, id) {
    return (carregarJson().colecoes[colecao] || []).find(x => x.id === id) || null;
  },
  async gravar(colecao, id, dados) {
    const db = carregarJson();
    db.colecoes[colecao] = db.colecoes[colecao] || [];
    const i = db.colecoes[colecao].findIndex(x => x.id === id);
    if (i >= 0) db.colecoes[colecao][i] = dados;
    else db.colecoes[colecao].unshift(dados);
    salvarJson();
    return dados;
  },
  async proximo(nome) {
    const db = carregarJson();
    db.seq[nome] = (db.seq[nome] || 0) + 1;
    salvarJson();
    return db.seq[nome];
  },
};

module.exports = { store: USAR_PG ? pg : arquivo, usandoPostgres: USAR_PG };
