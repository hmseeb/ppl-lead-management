-- Magic links for broker portal passwordless authentication
CREATE TABLE magic_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  broker_id uuid NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_magic_links_token ON magic_links(token);
CREATE INDEX idx_magic_links_broker_id ON magic_links(broker_id);

-- Enable RLS - only service role can access
ALTER TABLE magic_links ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated access. Only service_role bypasses RLS.
-- This ensures magic links can only be created/read via server-side admin client.
