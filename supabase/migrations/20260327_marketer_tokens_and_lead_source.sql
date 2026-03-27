-- Add API token to marketers (auto-generated with mkt_ prefix, unique)
ALTER TABLE marketers ADD COLUMN token text NOT NULL DEFAULT ('mkt_' || gen_random_uuid()::text) UNIQUE;

-- Add marketer_id FK to leads for tracking lead source
ALTER TABLE leads ADD COLUMN marketer_id uuid REFERENCES marketers(id);

-- Indexes for fast lookups
CREATE INDEX idx_leads_marketer_id ON leads(marketer_id);
CREATE INDEX idx_marketers_token ON marketers(token);
