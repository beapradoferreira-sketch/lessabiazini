// Simulador público — consome /api/simulacao e /api/leads
const fmt = n => 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

const VERBAS = {
  aviso_previo_indenizado: 'Aviso prévio indenizado',
  quinze_dias_afastamento: '15 primeiros dias de afastamento (auxílio-doença)',
  salario_maternidade: 'Salário-maternidade',
  vale_transporte_pecunia: 'Vale-transporte pago em pecúnia',
  abono_assiduidade: 'Abonos e prêmios eventuais',
};

const caixa = document.getElementById('verbas');
for (const [chave, rotulo] of Object.entries(VERBAS)) {
  const marcado = chave !== 'vale_transporte_pecunia' ? 'checked' : '';
  caixa.insertAdjacentHTML('beforeend',
    `<label><input type="checkbox" name="verbas" value="${chave}" ${marcado}> ${rotulo}</label>`);
}

let ultimaEntrada = null;

function entradasDoFormulario() {
  return {
    folhaMensal: Number(document.getElementById('folha').value),
    funcionarios: Number(document.getElementById('func').value),
    ratAliquota: Number(document.getElementById('rat').value),
    fap: Number(document.getElementById('fap').value) || 1,
    verbas: [...document.querySelectorAll('input[name="verbas"]:checked')].map(i => i.value),
  };
}

document.getElementById('form-sim').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const entrada = entradasDoFormulario();
  const r = await fetch('/api/simulacao', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entrada),
  });
  const dados = await r.json();
  const corpo = document.getElementById('linhas');
  const rodape = document.getElementById('totais');

  if (!dados.ok) {
    corpo.innerHTML = `<tr><td colspan="3" style="color:var(--vermelho);padding:1.2rem 1.25rem">${dados.erro}</td></tr>`;
    rodape.hidden = true;
    return;
  }

  ultimaEntrada = entrada;
  corpo.innerHTML = '';
  dados.linhas.forEach((l, i) => {
    const tr = document.createElement('tr');
    tr.className = 'linha-anim';
    tr.style.animationDelay = (i * 90) + 'ms';
    tr.innerHTML = `<td>${l.rotulo}</td><td class="num">${fmt(l.baseMensal)}</td><td class="num verde">${fmt(l.creditoJanela)}</td>`;
    corpo.appendChild(tr);
  });
  document.getElementById('t-principal').textContent = fmt(dados.resumo.creditoPrincipal);
  document.getElementById('t-selic').textContent = fmt(dados.resumo.atualizacaoEstimada);
  document.getElementById('t-total').textContent = fmt(dados.resumo.totalEstimado);
  document.getElementById('t-faixa').textContent = fmt(dados.resumo.faixaMin) + ' — ' + fmt(dados.resumo.faixaMax);
  rodape.hidden = false;
  document.getElementById('captura').classList.add('visivel');
  if (window.innerWidth < 960) document.getElementById('resultado').scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('btn-lead').addEventListener('click', async () => {
  const corpo = {
    nome: document.getElementById('nome').value.trim(),
    empresa: document.getElementById('empresa').value.trim(),
    tipo: document.getElementById('tipo').value,
    email: document.getElementById('email').value.trim(),
    whatsapp: document.getElementById('whatsapp').value.trim(),
    funcionarios: Number(document.getElementById('func').value) || 0,
    origem: 'simulador',
    simulacaoEntrada: ultimaEntrada,
  };
  if (!corpo.email && !corpo.whatsapp) {
    alert('Informe ao menos um e-mail ou WhatsApp para receber a análise.');
    return;
  }
  const r = await fetch('/api/leads', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  if (r.ok) {
    document.getElementById('ok').style.display = 'block';
    document.getElementById('btn-lead').disabled = true;
    document.getElementById('btn-lead').textContent = 'Análise solicitada ✓';
  }
});
