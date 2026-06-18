-- M34 Qualificacao do Lead + M37 Objecoes inteligentes
-- M34: guarda a qualificacao comercial do lead como JSON em hotels.qualification.
-- M37: estende crm_objections com resposta completa, pergunta de continuidade,
--      material recomendado e proxima accao.

ALTER TABLE hotels ADD COLUMN IF NOT EXISTS qualification JSONB;

ALTER TABLE crm_objections ADD COLUMN IF NOT EXISTS full_response TEXT;
ALTER TABLE crm_objections ADD COLUMN IF NOT EXISTS follow_up_question TEXT;
ALTER TABLE crm_objections ADD COLUMN IF NOT EXISTS recommended_material TEXT;
ALTER TABLE crm_objections ADD COLUMN IF NOT EXISTS next_action TEXT;
