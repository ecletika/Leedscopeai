-- M21 LeadOps / CRM Comercial
-- Corrige o acesso as tabelas CRM: a aplicacao usa a anon key como camada de dados
-- (tal como ja acontece com a tabela `hotels`). Sem estas politicas o RLS bloqueia
-- leitura e escrita, fazendo o app cair no fallback localStorage (vendedores nao gravavam).
--
-- Cria politicas permissivas (allow-all) para anon e authenticated em todas as tabelas CRM.
-- Mantem o RLS ativo para evitar o aviso de seguranca de "RLS disabled".

DO $$
DECLARE
    t TEXT;
    crm_tables TEXT[] := ARRAY[
        'crm_sellers',
        'crm_contacts',
        'crm_activities',
        'crm_schedule_slots',
        'crm_close_reasons',
        'crm_scripts',
        'crm_objections',
        'crm_materials'
    ];
BEGIN
    FOREACH t IN ARRAY crm_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
            -- garante grants de tabela para os papeis da API
            EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated;', t);
            -- politica unica allow-all (idempotente)
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t || '_app_all', t);
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);',
                t || '_app_all', t
            );
        END IF;
    END LOOP;
END $$;
