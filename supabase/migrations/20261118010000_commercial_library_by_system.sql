-- Scripts, objecoes e materiais passam a pertencer a um sistema (workio | sol | emet).
-- Os materiais ficam tambem separados por modulo e podem ter ficheiros (PDF/imagem) ou texto.
-- O conteudo que ja existia e do SOL.

ALTER TABLE crm_scripts    ADD COLUMN IF NOT EXISTS system TEXT NOT NULL DEFAULT 'sol';
ALTER TABLE crm_objections ADD COLUMN IF NOT EXISTS system TEXT NOT NULL DEFAULT 'sol';

ALTER TABLE crm_materials ADD COLUMN IF NOT EXISTS system TEXT NOT NULL DEFAULT 'sol';
ALTER TABLE crm_materials ADD COLUMN IF NOT EXISTS module_code TEXT;
ALTER TABLE crm_materials ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE crm_materials ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE crm_materials ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE crm_materials ADD COLUMN IF NOT EXISTS file_size BIGINT;

-- A mesma objecao pode existir em sistemas diferentes: a unicidade passa a ser por sistema.
ALTER TABLE crm_objections DROP CONSTRAINT IF EXISTS crm_objections_objection_key;
CREATE UNIQUE INDEX IF NOT EXISTS crm_objections_system_objection_idx ON crm_objections (system, objection);

CREATE INDEX IF NOT EXISTS idx_crm_materials_system_module ON crm_materials (system, module_code);

-- Armazenamento dos ficheiros (PDF e imagens, ate 25 MB). Bucket publico para o
-- vendedor abrir o material durante a chamada.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'commercial-materials',
    'commercial-materials',
    TRUE,
    26214400,
    ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- A app usa a anon key como camada de dados (como nas tabelas CRM): politicas permissivas,
-- limitadas a este bucket. NOTA: quem tiver a anon key pode enviar/apagar ficheiros aqui.
DROP POLICY IF EXISTS commercial_materials_read   ON storage.objects;
DROP POLICY IF EXISTS commercial_materials_insert ON storage.objects;
DROP POLICY IF EXISTS commercial_materials_update ON storage.objects;
DROP POLICY IF EXISTS commercial_materials_delete ON storage.objects;

CREATE POLICY commercial_materials_read ON storage.objects
    FOR SELECT TO anon, authenticated USING (bucket_id = 'commercial-materials');
CREATE POLICY commercial_materials_insert ON storage.objects
    FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'commercial-materials');
CREATE POLICY commercial_materials_update ON storage.objects
    FOR UPDATE TO anon, authenticated USING (bucket_id = 'commercial-materials') WITH CHECK (bucket_id = 'commercial-materials');
CREATE POLICY commercial_materials_delete ON storage.objects
    FOR DELETE TO anon, authenticated USING (bucket_id = 'commercial-materials');
