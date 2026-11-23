-- Vendas associadas a vendedores (Admin Console).
-- Artigos: workio, sol, emet, sistema, site, avenca_mensal, avenca_anual.
-- O valor e lancado a mao (pode ser negociado): amount NULL = valor por lancar.

CREATE TABLE IF NOT EXISTS crm_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sold_at DATE NOT NULL DEFAULT CURRENT_DATE,
    seller_id UUID REFERENCES crm_sellers(id) ON DELETE SET NULL,
    seller_name TEXT,
    item TEXT NOT NULL CHECK (item IN ('workio', 'sol', 'emet', 'sistema', 'site', 'avenca_mensal', 'avenca_anual')),
    lead_id UUID REFERENCES hotels(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    amount NUMERIC(12, 2),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_crm_sales_seller_sold_at ON crm_sales (seller_id, sold_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_sales_sold_at ON crm_sales (sold_at DESC);

-- A app usa a anon key como camada de dados (como as restantes tabelas CRM): politica
-- permissiva. O acesso ao ecra e restringido na interface (so o proprietario).
ALTER TABLE crm_sales ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_sales TO anon, authenticated;
DROP POLICY IF EXISTS crm_sales_app_all ON crm_sales;
CREATE POLICY crm_sales_app_all ON crm_sales
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
