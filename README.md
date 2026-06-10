# Lessa Biazini OS

Sistema de captação, qualificação e gestão de execução para a **Lessa Biazini Gestão Empresarial** — operacionalização técnica fiscal e previdenciária em modelo white label B2B.

## Rodar localmente

```bash
npm install   # instala o driver pg
node server.js
```

Sem `DATABASE_URL`, os dados ficam em `data/db.json` (só para desenvolvimento).

- Simulador público: http://localhost:3000
- Painel interno: http://localhost:3000/painel
- Saúde da API: http://localhost:3000/api/saude

## Publicar no Railway (recomendado)

### 1. Crie o projeto
- Acesse railway.app → **Login with GitHub**
- **New Project** → **Deploy from GitHub repo** → selecione `lessabiazini`

### 2. Adicione o banco Postgres
- Dentro do projeto, clique **+ New** → **Database** → **Add PostgreSQL**
- O Railway injeta `DATABASE_URL` automaticamente — não precisa copiar nada

### 3. Confirme o start command
- Clique no serviço Node → **Settings** → **Deploy** → **Start Command**: `node server.js`

### 4. Deploy
- Clique **Deploy** — leva ~1 minuto
- Acesse `/api/saude` na URL gerada — deve retornar `{"banco":"postgres"}`

### Custo
$5 de crédito grátis/mês — suficiente para uso inicial.

## Arquitetura

```
server.js          servidor HTTP (Node puro, zero frameworks)
railway.json       configuração do deploy Railway
lib/rotas.js       roteador REST compartilhado
lib/calc.js        motor de estimativa de créditos + score de leads
lib/db.js          regras de negócio: pipeline, trilha de auditoria, alertas
lib/store.js       armazenamento: Postgres (DATABASE_URL) ou JSON local
lib/proposta.js    gerador de proposta white label em HTML
*.html / *.css / *.js   frontend responsivo na raiz do projeto
```

## API

| Rota | Função |
|---|---|
| `POST /api/simulacao` | Estimativa de créditos linha a linha |
| `POST /api/leads` · `GET /api/leads` · `PATCH /api/leads/:id` | Captação e gestão de leads com score |
| `GET/POST /api/parceiros` | Escritórios parceiros |
| `GET/POST /api/casos` · `POST /api/casos/:id/avancar` | Pipeline com trilha de auditoria |
| `GET /api/alertas?meses=6` | Competências prescrevendo em breve |
| `GET /api/dashboard` | Métricas consolidadas |
| `POST /api/propostas` | Proposta white label em HTML |
| `GET /api/saude` | Status do banco (`postgres` ou `arquivo-json`) |

## Aviso

Os parâmetros de apuração (`lib/calc.js → PARAMS`) são estimativas médias de mercado e devem ser calibrados pela equipe técnica antes do uso público. O `/painel` fica sem senha por padrão — proteja antes de divulgar a URL (Railway suporta variáveis de ambiente para um middleware de token simples).
