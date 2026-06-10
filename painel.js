// Painel interno — consome a API do Lessa Biazini OS
const fmt = n => 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
const fmtCurto = n => n >= 1e6 ? 'R$ ' + (n / 1e6).toFixed(1).replace('.', ',') + ' mi'
                  : n >= 1e3 ? 'R$ ' + (n / 1e3).toFixed(0) + ' mil' : fmt(n);

const ESTAGIOS = {
  levantamento: 'Levantamento',
  apuracao: 'Apuração',
  retificacao: 'Retificação',
  habilitacao: 'Habilitação',
  compensacao: 'Compensação',
  concluido: 'Concluído',
};
const STATUS_LEAD = ['novo', 'em_contato', 'qualificado', 'convertido', 'descartado'];

async function api(caminho, opcoes) {
  const r = await fetch(caminho, opcoes);
  return r.json();
}

// ---------- Métricas ----------
async function renderMetricas() {
  const d = await api('/api/dashboard');
  document.getElementById('metricas').innerHTML = `
    <div class="metrica"><b>${fmtCurto(d.pipelineEstimado)}</b><span>Pipeline em execução</span></div>
    <div class="metrica"><b>${d.casos}</b><span>Casos</span></div>
    <div class="metrica"><b>${d.leadsNovos}</b><span>Leads novos</span></div>
    <div class="metrica"><b>${d.leadsPrioridadeA}</b><span>Leads prioridade A</span></div>
    <div class="metrica"><b>${d.parceiros}</b><span>Parceiros</span></div>
    <div class="metrica"><b style="color:${d.alertas ? 'var(--vermelho)' : 'inherit'}">${d.alertas}</b><span>Alertas de prescrição</span></div>`;
}

// ---------- Alertas ----------
async function renderAlertas() {
  const alertas = await api('/api/alertas?meses=6');
  const corpo = document.querySelector('#alertas tbody');
  corpo.innerHTML = alertas.length ? '' :
    '<tr><td colspan="5" style="color:var(--tinta-suave)">Nenhuma competência prescrevendo nos próximos 6 meses.</td></tr>';
  for (const a of alertas) {
    corpo.insertAdjacentHTML('beforeend', `<tr>
      <td>${a.casoId}</td><td>${a.clienteFinal}</td><td>${ESTAGIOS[a.estagio] || a.estagio}</td>
      <td>${a.prescreveEm.split('-').reverse().join('/')}</td>
      <td><span class="tag tag-alerta">${a.mesesRestantes} meses</span></td></tr>`);
  }
}

// ---------- Kanban ----------
async function renderKanban() {
  const casos = await api('/api/casos');
  const kanban = document.getElementById('kanban');
  kanban.innerHTML = '';
  for (const [chave, rotulo] of Object.entries(ESTAGIOS)) {
    const doEstagio = casos.filter(c => c.estagio === chave);
    const col = document.createElement('div');
    col.className = 'coluna';
    col.innerHTML = `<h4>${rotulo}<span>${doEstagio.length}</span></h4>`;
    for (const c of doEstagio) {
      const podeAvancar = chave !== 'concluido';
      const card = document.createElement('div');
      card.className = 'cartao';
      card.innerHTML = `
        <b>${c.clienteFinal || c.id}</b>
        <div class="meta">${c.id} · ${fmtCurto(c.valorEstimado)} · ${c.tese.slice(0, 48)}…</div>
        ${podeAvancar ? `<button class="btn btn-claro btn-mini" data-avancar="${c.id}">Avançar estágio →</button>` : '<span class="tag tag-a">Entregue</span>'}`;
      col.appendChild(card);
    }
    kanban.appendChild(col);
  }
  kanban.querySelectorAll('[data-avancar]').forEach(btn => btn.addEventListener('click', async () => {
    const obs = prompt('Observação para a trilha de auditoria (opcional):') || '';
    await api('/api/casos/' + btn.dataset.avancar + '/avancar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ observacao: obs }),
    });
    atualizarTudo();
  }));
}

// ---------- Leads ----------
async function renderLeads() {
  const leads = await api('/api/leads');
  const corpo = document.querySelector('#leads tbody');
  corpo.innerHTML = leads.length ? '' :
    '<tr><td colspan="8" style="color:var(--tinta-suave)">Nenhum lead ainda. Compartilhe o simulador no Instagram e no Linktree.</td></tr>';
  for (const l of leads) {
    const classeTag = l.score >= 70 ? 'tag-a' : l.score >= 45 ? 'tag-b' : 'tag-c';
    const potencial = l.simulacao ? fmtCurto(l.simulacao.totalEstimado) : '—';
    const opcoes = STATUS_LEAD.map(s =>
      `<option value="${s}" ${s === l.status ? 'selected' : ''}>${s.replace('_', ' ')}</option>`).join('');
    const zap = l.whatsapp ? `<a href="https://wa.me/55${String(l.whatsapp).replace(/\D/g, '')}" target="_blank" rel="noopener">WhatsApp</a>` : '';
    corpo.insertAdjacentHTML('beforeend', `<tr>
      <td>${l.id}</td>
      <td><b>${l.nome || '—'}</b><br><small>${l.empresa || ''}</small></td>
      <td>${l.tipo === 'escritorio' ? 'Escritório' : 'Empresa'}</td>
      <td>${l.email || ''}<br>${zap}</td>
      <td class="num">${potencial}</td>
      <td><span class="tag ${classeTag}">${l.score} · ${l.faixa.split(' — ')[0]}</span></td>
      <td><select data-lead="${l.id}" style="padding:.3rem">${opcoes}</select></td>
      <td><small>${new Date(l.criadoEm).toLocaleDateString('pt-BR')}</small></td></tr>`);
  }
  corpo.querySelectorAll('select[data-lead]').forEach(sel => sel.addEventListener('change', async () => {
    await api('/api/leads/' + sel.dataset.lead, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: sel.value }),
    });
    renderMetricas();
  }));
}

// ---------- Parceiros (select do form de caso) ----------
async function renderParceiros() {
  const parceiros = await api('/api/parceiros');
  const sel = document.getElementById('c-parceiro');
  sel.innerHTML = '<option value="">— caso direto (sem parceiro) —</option>' +
    parceiros.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
}

// ---------- Formulários ----------
document.getElementById('form-caso').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  await api('/api/casos', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clienteFinal: document.getElementById('c-cliente').value.trim(),
      parceiroId: document.getElementById('c-parceiro').value || null,
      tese: document.getElementById('c-tese').value.trim(),
      valorEstimado: Number(document.getElementById('c-valor').value) || 0,
      inicioJanela: document.getElementById('c-janela').value || undefined,
    }),
  });
  ev.target.reset();
  atualizarTudo();
});

document.getElementById('form-parceiro').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  await api('/api/parceiros', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: document.getElementById('pa-nome').value.trim(),
      contato: document.getElementById('pa-contato').value.trim(),
      email: document.getElementById('pa-email').value.trim(),
      cidade: document.getElementById('pa-cidade').value.trim(),
    }),
  });
  ev.target.reset();
  renderParceiros();
  renderMetricas();
});

document.getElementById('form-proposta').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const total = Number(document.getElementById('p-total').value) || 0;
  const r = await fetch('/api/propostas', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      escritorio: document.getElementById('p-escritorio').value.trim(),
      clienteFinal: document.getElementById('p-cliente').value.trim(),
      totalEstimado: total,
      faixaMin: total * 0.6,
      faixaMax: total * 1.25,
      honorarioPct: Number(document.getElementById('p-honorario').value) || 20,
      prazoSemanas: Number(document.getElementById('p-prazo').value) || 8,
    }),
  });
  const html = await r.text();
  const aba = window.open('', '_blank');
  aba.document.write(html);
  aba.document.close();
});

function atualizarTudo() {
  renderMetricas(); renderAlertas(); renderKanban(); renderLeads(); renderParceiros();
}
atualizarTudo();
