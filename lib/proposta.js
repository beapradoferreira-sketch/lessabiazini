// ============================================================
// Lessa Biazini OS — Gerador de proposta white label
// Gera HTML pronto para impressão/PDF com a identidade do parceiro.
// ============================================================
const { round2 } = require('./calc');

const fmtBRL = n => 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

function gerarPropostaHTML(dados) {
  const {
    escritorio = 'Seu Escritório',
    clienteFinal = 'Cliente',
    tese = 'Exclusão de verbas indenizatórias da base de cálculo do INSS patronal',
    totalEstimado = 0,
    faixaMin = 0,
    faixaMax = 0,
    honorarioPct = 20,
    prazoSemanas = 8,
  } = dados;

  const honorario = round2(totalEstimado * (honorarioPct / 100));
  const data = new Date().toLocaleDateString('pt-BR');

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Proposta — ${clienteFinal}</title>
<style>
  body{font-family:Georgia,'Times New Roman',serif;color:#1d2129;max-width:760px;margin:40px auto;padding:0 24px;line-height:1.6}
  h1{font-size:1.6rem;border-bottom:3px solid #004db3;padding-bottom:.5rem}
  h2{font-size:1.05rem;text-transform:uppercase;letter-spacing:.08em;color:#003c8c;margin-top:2rem}
  table{width:100%;border-collapse:collapse;margin:1rem 0}
  td,th{border-bottom:1px solid #ddd;padding:.5rem .25rem;text-align:left}
  .num{text-align:right;font-variant-numeric:tabular-nums}
  .destaque{background:#eef4fd;border-left:4px solid #004db3;padding:1rem 1.25rem;margin:1.5rem 0}
  footer{margin-top:3rem;font-size:.8rem;color:#777;border-top:1px solid #ddd;padding-top:1rem}
  @media print{body{margin:0}}
</style></head><body>
<p style="text-transform:uppercase;letter-spacing:.15em;font-size:.75rem;color:#003c8c">${escritorio} · Proposta de trabalho · ${data}</p>
<h1>Recuperação de créditos previdenciários<br><em>${clienteFinal}</em></h1>

<h2>1 · Objeto</h2>
<p>Apuração, retificação de obrigações acessórias e habilitação de créditos tributários decorrentes da tese: <strong>${tese}</strong>, observada a janela prescricional de 60 meses e os normativos vigentes (IN RFB nº 2.121/2022, Parecer Normativo Cosit nº 5/2018 e jurisprudência aplicável).</p>

<h2>2 · Potencial identificado (estimativa preliminar)</h2>
<table>
  <tr><th>Indicador</th><th class="num">Valor</th></tr>
  <tr><td>Crédito total estimado (principal + atualização)</td><td class="num"><strong>${fmtBRL(totalEstimado)}</strong></td></tr>
  <tr><td>Faixa de confiança</td><td class="num">${fmtBRL(faixaMin)} — ${fmtBRL(faixaMax)}</td></tr>
</table>
<p style="font-size:.85rem;color:#666">Estimativa não vinculante. O valor definitivo será apurado a partir dos dados de eSocial, EFD-Reinf, DCTFWeb e folha analítica.</p>

<h2>3 · Escopo de execução</h2>
<table>
  <tr><th style="width:30%">Etapa</th><th>Entrega</th></tr>
  <tr><td>Levantamento</td><td>Coleta e consolidação da documentação fiscal, contábil e previdenciária</td></tr>
  <tr><td>Apuração</td><td>Quantificação dos créditos por competência, com memória de cálculo auditável</td></tr>
  <tr><td>Retificação</td><td>eSocial, EFD Contribuições e DCTFWeb retificadas junto aos órgãos competentes</td></tr>
  <tr><td>Habilitação</td><td>Habilitação de crédito e transmissão de PER/DCOMP perante a RFB</td></tr>
  <tr><td>Acompanhamento</td><td>Monitoramento das compensações até o aproveitamento integral do crédito</td></tr>
</table>

<h2>4 · Condições</h2>
<div class="destaque">
  <p><strong>Honorários de êxito:</strong> ${honorarioPct}% sobre o crédito efetivamente aproveitado — estimados em <strong>${fmtBRL(honorario)}</strong>. Sem êxito, sem honorários.</p>
  <p><strong>Prazo estimado de execução técnica:</strong> ${prazoSemanas} semanas a partir do recebimento da documentação completa.</p>
</div>

<h2>5 · Garantias</h2>
<p>Todo o processo é documentado e auditável — do primeiro dado à entrega final. Memórias de cálculo, protocolos de transmissão e trilha de auditoria acompanham cada entrega.</p>

<footer>Proposta emitida em nome de ${escritorio}. Execução técnica conduzida sob acordo de confidencialidade. Documento gerado automaticamente pelo Lessa Biazini OS em ${data}.</footer>
</body></html>`;
}

module.exports = { gerarPropostaHTML };
