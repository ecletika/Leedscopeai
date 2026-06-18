-- SOL LeadOps / CRM Comercial - Sales foundation
-- Run this migration in Supabase SQL Editor or via Supabase CLI.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. App users compatibility table
CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    plan TEXT DEFAULT 'Pro',
    credits INTEGER DEFAULT 150,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
);

INSERT INTO app_users (name, email, password, role, plan, credits, status)
VALUES
('Administrador', 'admin@leadscope.ai', 'admin', 'admin', 'Agency', 9999, 'active'),
('Usuario Demo', 'demo@leadscope.ai', 'demo', 'user', 'Pro', 150, 'active')
ON CONFLICT (email) DO NOTHING;

-- 2. Commercial close/loss reasons
CREATE TABLE IF NOT EXISTS crm_close_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL CHECK (category IN ('lost', 'do_not_contact', 'invalid', 'duplicate', 'future_follow_up')),
    requires_follow_up BOOLEAN DEFAULT FALSE,
    default_follow_up_days INTEGER,
    active BOOLEAN DEFAULT TRUE
);

INSERT INTO crm_close_reasons (name, category, requires_follow_up, default_follow_up_days, active)
VALUES
('Ja tem sistema e nao quer ouvir', 'lost', FALSE, NULL, TRUE),
('Ja tem sistema, mas aceitou futuro contacto', 'future_follow_up', TRUE, 90, TRUE),
('Sem orcamento', 'lost', FALSE, NULL, TRUE),
('Hotel pequeno demais', 'invalid', FALSE, NULL, TRUE),
('Nao e hotel / dado errado', 'invalid', FALSE, NULL, TRUE),
('Pediu para nao ligar mais', 'do_not_contact', FALSE, NULL, TRUE),
('Nao conseguimos decisor', 'future_follow_up', TRUE, 30, TRUE),
('Numero errado', 'invalid', FALSE, NULL, TRUE),
('Nao ve necessidade', 'lost', FALSE, NULL, TRUE),
('Usa papel/WhatsApp, mas nao quer mudar', 'lost', FALSE, NULL, TRUE),
('Interessado, mas so depois da epoca alta', 'future_follow_up', TRUE, 90, TRUE),
('Hotel encerrado', 'invalid', FALSE, NULL, TRUE),
('Lead duplicado', 'duplicate', FALSE, NULL, TRUE)
ON CONFLICT (name) DO NOTHING;

-- 3. Sales team
CREATE TABLE IF NOT EXISTS crm_sellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    photo_url TEXT,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    languages TEXT[] DEFAULT ARRAY[]::TEXT[],
    assigned_regions TEXT[] DEFAULT ARRAY[]::TEXT[],
    work_schedule TEXT,
    daily_contact_goal INTEGER DEFAULT 20,
    weekly_demo_goal INTEGER DEFAULT 5,
    role TEXT DEFAULT 'seller' CHECK (role IN ('seller', 'sales_supervisor', 'admin')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
);

-- 4. Expand current hotels table into the CRM lead record used by the app
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS segment TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS estimated_rooms INTEGER;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS commercial_status TEXT DEFAULT 'new' CHECK (
    commercial_status IN (
        'new',
        'prepared',
        'scheduled_contact',
        'in_contact',
        'contacted_reception',
        'decision_maker_identified',
        'rescheduled',
        'demo_scheduled',
        'demo_completed',
        'follow_up',
        'proposal_sent',
        'won',
        'lost',
        'do_not_contact'
    )
);
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS responsible_seller_id UUID REFERENCES crm_sellers(id) ON DELETE SET NULL;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low'));
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS next_action_type TEXT CHECK (
    next_action_type IS NULL OR next_action_type IN ('call', 'demo', 'email', 'whatsapp', 'follow_up', 'proposal', 'none')
);
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS next_action_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS close_reason_id UUID REFERENCES crm_close_reasons(id) ON DELETE SET NULL;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS close_notes TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS do_not_contact BOOLEAN DEFAULT FALSE;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE;

UPDATE hotels
SET
    commercial_status = COALESCE(commercial_status, 'new'),
    priority = COALESCE(priority, 'medium'),
    lead_score = COALESCE(lead_score, 0),
    do_not_contact = COALESCE(do_not_contact, FALSE),
    updated_at = COALESCE(updated_at, created_at, NOW())
WHERE commercial_status IS NULL
   OR priority IS NULL
   OR lead_score IS NULL
   OR do_not_contact IS NULL
   OR updated_at IS NULL;

-- 5. Hotel contacts
CREATE TABLE IF NOT EXISTS crm_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    lead_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    name TEXT,
    role TEXT,
    contact_type TEXT DEFAULT 'other' CHECK (
        contact_type IN ('reception', 'manager', 'general_manager', 'housekeeper', 'maintenance', 'purchasing', 'other')
    ),
    phone TEXT,
    email TEXT,
    status TEXT DEFAULT 'unknown' CHECK (
        status IN ('unknown', 'searching', 'contacted', 'decision_maker', 'influencer', 'inactive')
    ),
    is_primary_decision_maker BOOLEAN DEFAULT FALSE,
    notes TEXT
);

-- 6. Activity timeline
CREATE TABLE IF NOT EXISTS crm_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    lead_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES crm_sellers(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL CHECK (
        activity_type IN ('call', 'email', 'whatsapp', 'demo', 'note', 'status_change', 'proposal')
    ),
    outcome TEXT,
    notes TEXT,
    objections TEXT[] DEFAULT ARRAY[]::TEXT[],
    interest_level TEXT CHECK (interest_level IS NULL OR interest_level IN ('low', 'medium', 'high')),
    next_action_type TEXT CHECK (
        next_action_type IS NULL OR next_action_type IN ('call', 'demo', 'email', 'whatsapp', 'follow_up', 'proposal', 'none')
    ),
    next_action_at TIMESTAMP WITH TIME ZONE
);

-- 7. Weekly planning slots
CREATE TABLE IF NOT EXISTS crm_schedule_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    seller_id UUID NOT NULL REFERENCES crm_sellers(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES hotels(id) ON DELETE SET NULL,
    slot_start TIMESTAMP WITH TIME ZONE NOT NULL,
    slot_end TIMESTAMP WITH TIME ZONE NOT NULL,
    slot_type TEXT DEFAULT 'call' CHECK (slot_type IN ('call', 'demo', 'follow_up', 'admin')),
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'canceled', 'missed')),
    notes TEXT,
    CONSTRAINT crm_schedule_slots_valid_time CHECK (slot_end > slot_start)
);

-- 8. Commercial scripts
CREATE TABLE IF NOT EXISTS crm_scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    target_role TEXT,
    language TEXT DEFAULT 'pt-PT',
    country TEXT,
    content TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE
);

-- 9. Objection bank
CREATE TABLE IF NOT EXISTS crm_objections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    objection TEXT NOT NULL UNIQUE,
    suggested_response TEXT NOT NULL,
    category TEXT,
    active BOOLEAN DEFAULT TRUE
);

INSERT INTO crm_objections (objection, suggested_response, category, active)
VALUES
('Ja usamos WhatsApp', 'O WhatsApp ajuda no inicio, mas nao cria historico, auditoria, prioridades nem relatorios. O SOL organiza a operacao sem complicar a equipa.', 'processo_manual', TRUE),
('Nao temos orcamento', 'A ideia do SOL e ser acessivel para hoteis pequenos e medios, evitando ferramentas enterprise caras.', 'orcamento', TRUE),
('A equipa nao usa tecnologia', 'O SOL foi pensado para equipas operacionais, com interface simples, mobile-first e facil de aprender.', 'adocao', TRUE),
('Ja temos sistema', 'Perfeito. A conversa pode ser para perceber se o sistema atual cobre housekeeping, manutencao, auditoria e comunicacao em tempo real.', 'concorrente', TRUE)
ON CONFLICT (objection) DO NOTHING;

-- 10. Commercial materials
CREATE TABLE IF NOT EXISTS crm_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    title TEXT NOT NULL,
    material_type TEXT NOT NULL CHECK (material_type IN ('image', 'video', 'pdf', 'link', 'text')),
    url TEXT,
    description TEXT,
    target_stage TEXT,
    active BOOLEAN DEFAULT TRUE
);

-- 11. Compatibility read view for the CRM naming used in the PRD
CREATE OR REPLACE VIEW crm_leads AS
SELECT
    h.id,
    h.created_at,
    h.updated_at,
    h.company_name,
    h.location,
    h.city,
    h.country,
    h.niche,
    h.segment,
    h.estimated_rooms,
    h.website,
    h.email AS main_email,
    h.phone AS main_phone,
    h.source,
    h.commercial_status,
    h.responsible_seller_id,
    s.name AS responsible_seller_name,
    h.priority,
    h.lead_score,
    h.next_action_type,
    h.next_action_at,
    h.close_reason_id,
    r.name AS close_reason_name,
    h.close_notes,
    h.do_not_contact,
    h.last_activity_at,
    h.contact_notes AS notes,
    h.callback_scheduled_at,
    h.callback_status,
    h.potential,
    h.maps_rating,
    h.maps_reviews
FROM hotels h
LEFT JOIN crm_sellers s ON s.id = h.responsible_seller_id
LEFT JOIN crm_close_reasons r ON r.id = h.close_reason_id;

-- 12. Indexes
CREATE INDEX IF NOT EXISTS idx_hotels_commercial_status ON hotels(commercial_status);
CREATE INDEX IF NOT EXISTS idx_hotels_responsible_seller_id ON hotels(responsible_seller_id);
CREATE INDEX IF NOT EXISTS idx_hotels_priority ON hotels(priority);
CREATE INDEX IF NOT EXISTS idx_hotels_next_action_at ON hotels(next_action_at);
CREATE INDEX IF NOT EXISTS idx_hotels_do_not_contact ON hotels(do_not_contact);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_lead_id ON crm_contacts(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_lead_id_created_at ON crm_activities(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_activities_seller_id_created_at ON crm_activities(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_schedule_slots_seller_start ON crm_schedule_slots(seller_id, slot_start);
CREATE INDEX IF NOT EXISTS idx_crm_schedule_slots_lead_id ON crm_schedule_slots(lead_id);
