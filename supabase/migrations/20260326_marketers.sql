-- Marketers table
create table marketers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  first_name text not null,
  last_name text not null,
  phone text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Junction table: many-to-many between marketers and brokers
create table marketer_brokers (
  id uuid primary key default gen_random_uuid(),
  marketer_id uuid not null references marketers(id) on delete cascade,
  broker_id uuid not null references brokers(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(marketer_id, broker_id)
);

create index idx_marketer_brokers_marketer on marketer_brokers(marketer_id);
create index idx_marketer_brokers_broker on marketer_brokers(broker_id);
