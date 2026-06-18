-- M25 - Acesso de vendedores ao sistema
-- A app usa a anon key como camada de dados. Para que o login por `app_users`
-- funcione e para que a criacao de contas de vendedor (Equipa Comercial) consiga
-- escrever, e necessario uma politica permissiva nesta tabela.
--
-- NOTA DE SEGURANCA: isto expoe `app_users` (incluindo passwords) a quem tiver a
-- anon key (que esta no bundle). Aceitavel para uma ferramenta interna; para
-- producao recomenda-se migrar a autenticacao para Supabase Auth.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_users') THEN
        ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_users TO anon, authenticated;
        DROP POLICY IF EXISTS app_users_app_all ON public.app_users;
        CREATE POLICY app_users_app_all ON public.app_users
            FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;
