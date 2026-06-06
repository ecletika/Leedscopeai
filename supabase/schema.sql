-- BASE DE DADOS PARA O LUMILEAD HOTEL HOUSEKEEPING PROSPECTING --

-- 1. Tabela de utilizadores do sistema (app_users)
CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- NOTA: Guardado em texto simples para demo. Em produção, use hash
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    plan TEXT DEFAULT 'Pro',
    credits INTEGER DEFAULT 150,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
);

-- Inserir utilizadores padrão para demonstração
INSERT INTO app_users (name, email, password, role, plan, credits, status)
VALUES 
('Administrador', 'admin@leadscope.ai', 'admin', 'admin', 'Agency', 9999, 'active'),
('Usuário Demo', 'demo@leadscope.ai', 'demo', 'user', 'Pro', 150, 'active')
ON CONFLICT (email) DO NOTHING;

-- 2. Tabela de Hotéis Prospectados e CRM (hotels)
CREATE TABLE IF NOT EXISTS hotels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    company_name TEXT NOT NULL,
    location TEXT NOT NULL,
    niche TEXT DEFAULT 'Hotelaria',
    website TEXT,
    email TEXT,
    phone TEXT,
    contact_person TEXT,                 -- Pessoa de contacto no hotel (Ex: Dr. Antunes (Governanta Geral))
    contact_notes TEXT,                  -- Campo do que foi falado/combinado (Notas Call Log)
    callback_scheduled_at TIMESTAMP WITH TIME ZONE, -- Data e Hora agendados para voltar a ligar
    callback_status TEXT DEFAULT 'pending' CHECK (callback_status IN ('pending', 'completed', 'canceled')),
    potential TEXT DEFAULT 'Medium' CHECK (potential IN ('Hot', 'Medium', 'Cold')),
    maps_rating NUMERIC(3,2),
    maps_reviews INTEGER
);

-- Habilitar RLS (Row Level Security) se desejar, ou deixar livre para fins de demonstração
-- ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
