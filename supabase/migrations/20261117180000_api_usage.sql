-- Contador mensal de utilizacao de APIs externas (Google Places, Apollo).
-- Usado pelo servidor com a service role; nao precisa de politicas para o browser.
CREATE TABLE IF NOT EXISTS api_usage (
    period TEXT NOT NULL,
    service TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (period, service)
);
