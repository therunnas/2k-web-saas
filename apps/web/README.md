# 2K Web SaaS — 2K Command OS

Painel administrativo privado da **2K Studios**: plataforma web/SaaS para
operação interna do estúdio com financeiro, produções, clientes, agenda,
relatórios e metas em um único lugar.

> Painel privado **single-admin**: acesso é restrito a um usuário
> administrador único, criado via seed (não há registro público).

---

## Visão geral

O 2K Web SaaS é um painel Next.js com autenticação real (JWT em cookie
HTTP-only), banco PostgreSQL (Neon em produção, qualquer Postgres em local),
e UI dark/violet/cyan inspirada em ferramentas de comando interno.

Módulos principais:

- **Setup inicial** — empresa, Discord, planilha financeira
- **Dashboard** — visão consolidada do ano fiscal
- **Financeiro** — receitas, despesas, fluxo, margens
- **Entradas / Saídas** — lançamentos manuais ou importados
- **Clientes / Grupos / Marcas** — agrupamento comercial
- **Vencimentos / Despesas** — contas a pagar e receber
- **Produções** — projetos audiovisuais
- **Agenda** — calendário operacional
- **Relatórios / Metas** — análises e objetivos
- **Configurações** — empresa, catálogos manuais, sistema

---

## Stack

| Camada           | Tecnologia                                        |
| ---------------- | ------------------------------------------------- |
| Framework        | Next.js 16 (App Router, webpack)                  |
| Linguagem        | TypeScript 5 (strict)                             |
| UI               | React 19 + Tailwind CSS 4 + lucide-react          |
| Auth             | JWT com `jose` + cookie HTTP-only `bcryptjs` (12) |
| ORM              | Prisma 7 (`prisma-client` + `@prisma/adapter-pg`) |
| Banco            | PostgreSQL (Neon em produção)                     |
| Importação Excel | `xlsx` (SheetJS)                                  |
| Lint             | ESLint 9 + `eslint-config-next`                   |

---

## Requisitos

- **Node.js** 20 LTS ou superior
- **npm** 10+ (ou pnpm/yarn equivalentes)
- **PostgreSQL** acessível via `DATABASE_URL`
  - Em produção: [Neon](https://neon.tech) recomendado
  - Em local: Postgres 15+ via Docker ou nativo

---

## Configuração de ambiente

1. **Copie o template de variáveis:**

   ```bash
   cp .env.example .env
   ```

2. **Preencha o `.env` com seus valores reais.** Veja [.env.example](./.env.example)
   para a lista completa de variáveis. As obrigatórias são:

   | Variável         | Obrigatória | Descrição                                      |
   | ---------------- | ----------- | ---------------------------------------------- |
   | `DATABASE_URL`   | sim         | Connection string PostgreSQL                   |
   | `AUTH_SECRET`    | sim         | Segredo para assinar JWT (mínimo 32 chars)     |
   | `ADMIN_EMAIL`    | seed        | E-mail do admin único (usado pelo seed)        |
   | `ADMIN_PASSWORD` | seed        | Senha do admin (≥8 chars, usado pelo seed)     |
   | `ADMIN_NAME`     | seed        | Nome do admin para exibição                    |
   | `NODE_ENV`       | não         | `development` / `production` / `test`          |

   **Geração de `AUTH_SECRET`** (qualquer um destes):

   ```bash
   # Linux/macOS
   openssl rand -base64 48

   # PowerShell
   [Convert]::ToBase64String((1..48 | ForEach-Object {Get-Random -Maximum 256}))

   # Node
   node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
   ```

3. **Nunca commite `.env`** — está no `.gitignore` por padrão.

---

## Instalação

```bash
# A partir da raiz do monorepo
cd apps/web

# Instala dependências
npm install
```

---

## Prisma / Neon / PostgreSQL

O schema vive em `prisma/schema.prisma`. Migrations já estão geradas em
`prisma/migrations/`.

### Gerar o cliente Prisma

Necessário toda vez que o schema mudar (ou após `npm install` fresco):

```bash
npx prisma generate
```

> O gerador `prisma-client` (Prisma 7) emite os tipos em
> `src/generated/prisma/` — esse diretório é **ignorado pelo git** e
> regenerado a cada build.

### Aplicar migrations

**Em desenvolvimento** (cria/atualiza o banco local):

```bash
npx prisma migrate dev
```

**Em produção** (apenas aplica migrations já existentes, sem prompt):

```bash
npx prisma migrate deploy
```

### Inspecionar o banco

```bash
npx prisma studio
```

---

## Seed do admin único

O sistema **não tem registro público**. O admin é criado por uma rota de
desenvolvimento que lê `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` do
`.env` e popula o usuário + workspace + membership + settings.

Com o servidor rodando em modo dev (`npm run dev`):

```bash
curl -X POST http://localhost:3000/api/dev/seed-admin
```

A rota:

- Está disponível **apenas em desenvolvimento** (`NODE_ENV !== "production"`).
- Faz hash da senha com bcrypt (cost 12).
- É idempotente — pode ser chamada várias vezes; apenas atualiza nome/senha
  do usuário existente.

> Após o seed, faça login em `http://localhost:3000/login` com o e-mail e
> senha do `.env`.

---

## Build

```bash
npm run build
```

Equivale a `prisma generate && next build --webpack`. Requer acesso de rede
a `binaries.prisma.sh` para o `prisma generate` baixar o schema-engine na
primeira execução.

---

## Execução local

```bash
npm run dev
```

Abre em `http://localhost:3000`. Sequência típica:

1. `npm install`
2. Copiar `.env.example` → `.env` e preencher
3. `npx prisma generate`
4. `npx prisma migrate dev` (cria o schema no banco)
5. `npm run dev`
6. `curl -X POST http://localhost:3000/api/dev/seed-admin` (cria o admin)
7. Acessar `http://localhost:3000/login` com as credenciais do `.env`
8. Completar o setup inicial (`/setup`)

---

## Deploy

### Vercel (recomendado para este projeto)

1. Importe o repositório no dashboard Vercel.
2. Em **Settings → General → Root Directory**, configure `apps/web`.
3. Em **Settings → Environment Variables**, adicione:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `NODE_ENV=production`
   - (Não adicione `ADMIN_EMAIL`/`ADMIN_PASSWORD` em produção — a rota de
     seed está bloqueada lá. Crie o admin localmente uma vez e ele
     persiste no Neon.)
4. **Build & Output Settings** ficam no padrão (Next.js auto-detectado).
5. Antes do primeiro deploy de produção, rode `npx prisma migrate deploy`
   apontando para o banco Neon de produção (a partir da sua máquina local
   com `DATABASE_URL` apontando para prod).

### Outras plataformas

Funciona em qualquer host que suporte Next.js standalone (Railway, Fly.io,
Render, etc.). Exigências mínimas:

- Node 20+
- PostgreSQL acessível via `DATABASE_URL`
- Variáveis de ambiente configuradas
- `npx prisma migrate deploy` executado antes do primeiro start

---

## Checklist de segurança

Este projeto foi auditado e segue estes princípios:

- ✅ **Senhas com bcrypt cost 12** — nada de senha em texto puro
- ✅ **JWT assinado com `AUTH_SECRET`** — `jose` HS256, expiração 7 dias
- ✅ **Cookie de sessão `HttpOnly` + `SameSite=Lax`** — `Secure` em produção
- ✅ **Mensagens de erro sanitizadas** — `error.message` nunca vai ao cliente
  em produção; logs detalhados ficam apenas no servidor (`src/lib/api-errors.ts`)
- ✅ **Rotas privadas protegidas em duas camadas** — middleware de edge
  (`src/middleware.ts`) + `requireAdminSession()` / `requireCompletedSetup()`
  em cada page server-side (`src/lib/guards.ts`)
- ✅ **Rotas de dev bloqueadas em produção** — `/api/dev/*` e
  `/api/workspace/discord/dev-connect` retornam 403 quando `NODE_ENV=production`
- ✅ **Health-check público mínimo** — `/api/health/db` retorna apenas
  `{ connected: true|false }`, sem contagens ou versão do provedor
- ✅ **Validação básica em todas as APIs** — campos obrigatórios checados
  antes de qualquer query
- ✅ **Sem `any` em código de produção** — tipos do Prisma usados via
  `Parameters<...>` quando preciso evitar acoplamento ao cliente gerado
- ✅ **`.env` e segredos fora do git** — `.gitignore` cobre `.env*`,
  `node_modules`, `.next`, banco local, caches e arquivos temporários

### Antes de cada release

```bash
# 1) Conferir vulnerabilidades nas dependências
npm audit

# 2) Lint
npm run lint

# 3) Build limpo
rm -rf .next
npm run build

# 4) Verificar que nenhum .env real está no git
git ls-files | grep -E "^.env" && echo "ALERTA: .env versionado" || echo "OK"
```

---

## Rotas principais

### Páginas (UI)

| Rota              | Proteção | Descrição                                  |
| ----------------- | -------- | ------------------------------------------ |
| `/`               | pública  | Tela de login (redireciona se autenticado) |
| `/login`          | pública  | Tela de login (redireciona se autenticado) |
| `/setup`          | privada  | Setup inicial do workspace                 |
| `/dashboard`      | privada  | Visão geral consolidada                    |
| `/financeiro`     | privada  | Receita / despesa / margem                 |
| `/entradas`       | privada  | Lançamentos de entrada                     |
| `/saidas`         | privada  | Lançamentos de saída                       |
| `/clientes`       | privada  | Clientes e marcas                          |
| `/grupos`         | privada  | Grupos comerciais                          |
| `/vencimentos`    | privada  | Contas a receber/pagar próximas            |
| `/despesas`       | privada  | Despesas operacionais                      |
| `/producoes`      | privada  | Projetos audiovisuais                      |
| `/agenda`         | privada  | Calendário operacional                     |
| `/relatorios`     | privada  | Análises                                   |
| `/metas`          | privada  | Metas anuais                               |
| `/configuracoes`  | privada  | Empresa, catálogos, sistema                |

### APIs públicas

| Rota                  | Método | Descrição                                    |
| --------------------- | ------ | -------------------------------------------- |
| `/api/auth/login`     | POST   | Login com `email` + `password`               |
| `/api/auth/logout`    | POST   | Destrói cookie de sessão                     |
| `/api/auth/session`   | GET    | Retorna sessão atual (ou `null`)             |
| `/api/health/db`      | GET    | Health-check do banco (sem contagens)        |

### APIs privadas (exigem sessão admin)

`/api/workspace/*`, `/api/finance/*`, `/api/manual/*`, `/api/clients/*`,
`/api/grupos/*`, `/api/producoes/*`, `/api/agenda/*`, `/api/metas/*`,
`/api/relatorios/*`, `/api/despesas/*`, `/api/vencimentos/*`.

Cada endpoint chama `getSession()` no início e responde 401 se não houver
sessão válida.

### APIs de desenvolvimento (bloqueadas em produção)

| Rota                                     | Descrição                              |
| ---------------------------------------- | -------------------------------------- |
| `/api/dev/seed-admin`                    | Cria/atualiza o admin único            |
| `/api/dev/setup-state`                   | Força `setupCompleted` para true/false |
| `/api/workspace/discord/dev-connect`     | Conecta Discord com valores fake       |

---

## Estrutura de pastas

```
apps/web/
├── prisma/
│   ├── schema.prisma          # Modelos do banco
│   └── migrations/            # Histórico de migrations
├── public/                    # Assets estáticos
├── scripts/                   # Scripts PowerShell de auditoria
├── src/
│   ├── app/
│   │   ├── (páginas)/page.tsx # Páginas server components
│   │   ├── api/               # Route handlers (Node.js runtime)
│   │   ├── layout.tsx
│   │   ├── page.tsx           # Home (redireciona se logado)
│   │   ├── login/page.tsx
│   │   ├── setup/page.tsx
│   │   ├── error.tsx
│   │   ├── loading.tsx
│   │   ├── not-found.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── auth/              # LoginScreen
│   │   ├── layout/            # AdminShell (sidebar + header)
│   │   ├── dashboard/         # DashboardOverview
│   │   ├── financeiro/
│   │   ├── entradas/ saidas/ clientes/ ...
│   │   └── states/            # Loading / empty / error
│   ├── data/                  # Dados estáticos auxiliares
│   ├── lib/
│   │   ├── auth.ts            # createSession / getSession / destroySession
│   │   ├── guards.ts          # requireAdminSession / requireCompletedSetup
│   │   ├── prisma.ts          # PrismaClient singleton
│   │   └── api-errors.ts      # apiError / unauthorized / badRequest
│   └── middleware.ts          # Proteção edge das rotas privadas
├── .env.example
├── .gitignore
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── prisma.config.ts
└── tsconfig.json
```

---

## Comandos úteis

```bash
# Dev
npm run dev                         # Servidor de desenvolvimento
npm run lint                        # ESLint

# Build & produção
npm run build                       # prisma generate + next build
npm start                           # Inicia servidor de produção

# Prisma
npx prisma generate                 # Gera o cliente
npx prisma migrate dev              # Aplica migrations (dev)
npx prisma migrate deploy           # Aplica migrations (prod)
npx prisma studio                   # Interface web do banco
npx prisma migrate status           # Status das migrations
npx prisma format                   # Formata o schema

# Seed (apenas em dev)
curl -X POST http://localhost:3000/api/dev/seed-admin

# Auditoria
npm audit                           # Vulnerabilidades nas deps
```

---

## Próximos passos recomendados

- [ ] OAuth real do Discord (substituir `dev-connect`)
- [ ] Página `/configuracoes/usuarios` se o painel passar a aceitar mais de 1 admin
- [ ] CSRF tokens nas mutations sensíveis (atualmente confiamos em SameSite=Lax)
- [ ] Rate limit nas rotas de login (proteção contra brute-force)
- [ ] Testes E2E (Playwright) cobrindo o fluxo login → setup → dashboard
- [ ] CI no GitHub Actions rodando `lint`, `build` e `npm audit`
- [ ] Backup automatizado do Neon

---

## Licença

Privado — 2K Studios.
