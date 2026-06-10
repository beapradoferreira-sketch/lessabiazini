// Local dev server — static files at project root (mirrors Vercel)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { tratarRequisicao } = require('./lib/rotas');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
};

function servirEstatico(res, caminho) {
  const alvo = caminho === '/' ? '/index.html' : caminho === '/painel' ? '/painel.html' : caminho;
  const arquivo = path.normalize(path.join(ROOT, alvo));
  if (!arquivo.startsWith(ROOT)) { res.writeHead(403); return res.end('Proibido'); }
  fs.readFile(arquivo, (err, conteudo) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Não encontrado'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(arquivo)] || 'application/octet-stream' });
    res.end(conteudo);
  });
}

http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) return tratarRequisicao(req, res);
  servirEstatico(res, require('url').parse(req.url).pathname);
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
