-- =====================================================================
-- Row Level Security (RLS) — GROUNDWORK / NÃO APLICADO AUTOMATICAMENTE
-- =====================================================================
--
-- IMPORTANTE: este arquivo NÃO está na pasta prisma/migrations de propósito,
-- para que `prisma migrate` NÃO o aplique sozinho. Ativar RLS sem a fiação
-- de contexto por requisição (ver SECURITY.md) QUEBRARIA o app (login/seed/
-- setup e todas as queries que não definem app.workspace_id na conexão).
--
-- Pré-requisitos para ativar com segurança (ordem importa):
--   1. Criar um ROLE de aplicação SEM BYPASSRLS (o owner do banco ignora RLS).
--   2. Conectar a aplicação com esse role (DATABASE_URL desse usuário).
--   3. Fazer toda query rodar dentro de uma transação que executa antes:
--        SELECT set_config('app.workspace_id', $workspaceId, true);
--      (true = escopo de transação; obrigatório no pooler do Neon/PgBouncer).
--   4. Tratar caminhos de bootstrap (login por e-mail, seed, criação de
--      workspace) com um role/fluxo que não dependa do GUC.
--
-- Enquanto isso, o isolamento é garantido no app-level pelo guard em
-- src/lib/prisma.ts (falha fechado sem workspaceId).
-- =====================================================================

-- Função auxiliar: workspace atual a partir do GUC de sessão/transação.
CREATE OR REPLACE FUNCTION app_current_workspace_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.workspace_id', true), '')
$$;

-- ---------------------------------------------------------------------
-- Tabelas com coluna workspaceId direta.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'FinancialEntry',
    'Import',
    'ManualCatalogItem',
    'WorkspaceSettings',
    'DiscordConnection',
    'WorkspaceMember'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS workspace_isolation ON %I;', tbl);
    EXECUTE format($f$
      CREATE POLICY workspace_isolation ON %I
        USING ("workspaceId" = app_current_workspace_id())
        WITH CHECK ("workspaceId" = app_current_workspace_id());
    $f$, tbl);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- Workspace: a chave é "id" (não "workspaceId").
-- ---------------------------------------------------------------------
ALTER TABLE "Workspace" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Workspace" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS workspace_isolation ON "Workspace";
CREATE POLICY workspace_isolation ON "Workspace"
  USING ("id" = app_current_workspace_id())
  WITH CHECK ("id" = app_current_workspace_id());

-- ---------------------------------------------------------------------
-- NÃO habilitar RLS em "User": o login busca o usuário por e-mail ANTES
-- de existir contexto de workspace. Travar essa tabela quebraria o login.
-- O acesso a User segue protegido no app-level.
-- ---------------------------------------------------------------------

-- Para REVERTER tudo:
--   ALTER TABLE "<tabela>" DISABLE ROW LEVEL SECURITY;
--   DROP POLICY IF EXISTS workspace_isolation ON "<tabela>";
--   DROP FUNCTION IF EXISTS app_current_workspace_id();
