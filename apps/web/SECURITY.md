# Segurança — 2K Web SaaS

Camadas aplicadas: isolamento por workspace (app-level), CORS restrito e
Security Headers. Abaixo, o que está **ativo** hoje e o que é **groundwork**.

## 1. Isolamento por workspace (RLS)

### Status: RLS real no banco = **NÃO ativo**. Isolamento = **app-level (ativo)**.

**Por que o RLS real não foi ligado agora** (sem refatoração grande/risco de quebrar o app):

1. A aplicação usa uma única conexão Prisma (`@prisma/adapter-pg`) com o **role owner** do Neon. Owners **ignoram RLS** a menos que se use `FORCE ROW LEVEL SECURITY` + um role sem `BYPASSRLS`.
2. Políticas RLS precisam de `current_setting('app.workspace_id')` **na mesma conexão** da query. Com pool (e o PgBouncer do Neon em modo transação) isso só funciona via `SET LOCAL` dentro de uma transação envolvendo **cada** query — refatoração transversal de todas as rotas + `AsyncLocalStorage`.
3. Fluxos de bootstrap (`/api/auth/login` busca `User` por e-mail; seed/setup criam `Workspace`) não têm workspace ainda; `FORCE RLS` ingênuo quebraria o login.

**O que está protegendo os dados hoje (real, não cosmético):**

- **Guard fail-closed no Prisma** (`src/lib/prisma.ts`): uma extensão de cliente
  bloqueia (`throw`) qualquer `findMany / findFirst / count / aggregate / groupBy /
  updateMany / deleteMany` nos modelos `FinancialEntry, Import, ManualCatalogItem,
  DiscordConnection, WorkspaceSettings` que rode **sem** filtro `workspaceId`.
  Auditoria confirmou que as 48 queries existentes já passam `workspaceId` —
  o guard previne regressões/queries acidentais sem escopo.
- **Helper centralizado** (`src/lib/workspace.ts`): `workspaceScope(session)` e
  `assertWorkspaceId()` para padronizar o escopo nas rotas.
- Toda rota de API valida a sessão (`getSession()`), e a sessão carrega `workspaceId`.

### Como ativar o RLS real (próxima fase)

1. Criar role de app sem bypass:
   ```sql
   CREATE ROLE app_user LOGIN PASSWORD '...' NOBYPASSRLS;
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
   ```
2. Apontar `DATABASE_URL` para `app_user`.
3. Envolver as queries em transação com contexto (extensão Prisma `$allOperations`
   abrindo `prisma.$transaction` e rodando
   `SELECT set_config('app.workspace_id', $workspaceId, true)` antes).
4. Aplicar as policies:
   ```bash
   psql "$DATABASE_URL" -f prisma/security/rls.sql
   ```
   O arquivo é **idempotente** e fica fora de `prisma/migrations` de propósito
   (para o `prisma migrate` não aplicá-lo sozinho e quebrar o app).

## 2. CORS restrito (ativo)

- Centralizado em `src/lib/cors.ts`, aplicado no `proxy.ts` para `/api/:path*`.
- **Nunca usa `*`.** Como a auth é por cookie, devolve `Access-Control-Allow-Credentials: true`
  e ecoa a origem validada.
- Same-origin (sem header `Origin`) é liberado; origem cruzada não autorizada
  recebe **403** (preflight e requisição real).

### Variáveis de ambiente

| Var | Obrigatória | Exemplo | Descrição |
|-----|-------------|---------|-----------|
| `APP_ORIGIN` | Recomendada em prod | `https://2kstudios.com` | Origem canônica do app |
| `ALLOWED_ORIGINS` | Opcional | `https://a.com,https://b.com` | Origens extras (separadas por vírgula) |

Padrões automáticos:
- **dev**: `http://localhost:3000/3001`, `http://127.0.0.1:3000/3001`.
- **prod**: `https://2k-web-saas.vercel.app` + `APP_ORIGIN` + `ALLOWED_ORIGINS`.

## 3. Security Headers (ativo)

Definidos em `next.config.ts` (`headers()`), aplicados a todas as rotas:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=()`
- `Content-Security-Policy` (conservadora, ver limitações abaixo)
- `Strict-Transport-Security` **apenas em produção**
- `X-Powered-By` removido (`poweredByHeader: false`)

### Limitações da CSP (documentadas)

- `script-src`/`style-src` usam `'unsafe-inline'` porque o Next injeta scripts/estilos
  inline sem nonce nesta configuração. Migrar para CSP por **nonce** exige integração
  no `proxy.ts` e fica como próximo passo.
- `'unsafe-eval'` e `ws:` são liberados **apenas em desenvolvimento** (HMR do webpack);
  em produção a CSP é mais estrita e adiciona `upgrade-insecure-requests`.

## Outras garantias já existentes

- Cookie de sessão: `HttpOnly`, `SameSite=lax`, `Secure` em produção (`src/lib/auth.ts`).
- `src/lib/api-errors.ts` nunca vaza `error.message`/stack em produção (só `fallback`;
  `debug` apenas em dev) e loga o erro real só no servidor.
- Rotas `/api/dev/*` bloqueadas em produção.
