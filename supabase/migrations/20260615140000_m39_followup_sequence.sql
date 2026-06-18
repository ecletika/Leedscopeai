-- M39 Sequencias automaticas de follow-up: guarda a cadencia ativa do lead.
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS followup_sequence JSONB;
