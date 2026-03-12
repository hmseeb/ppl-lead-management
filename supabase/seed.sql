-- Seed data for testing assign_lead() function
-- Uses existing brokers (never creates/modifies brokers)
-- Clean slate: remove test data from previous runs

DELETE FROM unassigned_queue;
DELETE FROM activity_log;
DELETE FROM leads;
DELETE FROM orders;

-- Broker references (existing active brokers)
-- Broker 1: Sarah Williams  = 9e2ec712-e174-499f-b5ed-dab357e5c23a
-- Broker 2: Mike Ross        = 43db37ae-36e9-496d-9530-a095e5c9def3
-- Broker 3: Jake Rivera      = 95bd4a66-fa58-41e0-a00f-b943d9271d65

-- Order A: Broker 1, 10 leads, MCA+SBA, credit_score_min 620
INSERT INTO orders (id, broker_id, total_leads, leads_remaining, verticals, credit_score_min, status, bonus_mode)
VALUES (
  'aaaaaaaa-0001-4000-8000-000000000001',
  '9e2ec712-e174-499f-b5ed-dab357e5c23a',
  10, 10, ARRAY['MCA', 'SBA'], 620, 'active', false
);

-- Order B: Broker 2, 5 leads, All verticals, no credit score min
INSERT INTO orders (id, broker_id, total_leads, leads_remaining, verticals, credit_score_min, status, bonus_mode)
VALUES (
  'aaaaaaaa-0002-4000-8000-000000000002',
  '43db37ae-36e9-496d-9530-a095e5c9def3',
  5, 5, ARRAY['All'], NULL, 'active', false
);

-- Order C: Broker 3, 3 leads, Equipment Finance, credit_score_min 700
INSERT INTO orders (id, broker_id, total_leads, leads_remaining, verticals, credit_score_min, status, bonus_mode)
VALUES (
  'aaaaaaaa-0003-4000-8000-000000000003',
  '95bd4a66-fa58-41e0-a00f-b943d9271d65',
  3, 3, ARRAY['Equipment Finance'], 700, 'active', false
);

-- Lead 1: MCA, credit 680 (matches Order A at 680>=620, and Order B at All)
INSERT INTO leads (id, first_name, last_name, email, vertical, credit_score, status)
VALUES (
  'bbbbbbbb-0001-4000-8000-000000000001',
  'Alice', 'Test', 'alice@test.com', 'MCA', 680, 'pending'
);

-- Lead 2: SBA, credit 550 (too low for Order A 620, matches Order B only)
INSERT INTO leads (id, first_name, last_name, email, vertical, credit_score, status)
VALUES (
  'bbbbbbbb-0002-4000-8000-000000000002',
  'Bob', 'Test', 'bob@test.com', 'SBA', 550, 'pending'
);

-- Lead 3: Equipment Finance, credit 720 (matches Order B All, and Order C 720>=700)
INSERT INTO leads (id, first_name, last_name, email, vertical, credit_score, status)
VALUES (
  'bbbbbbbb-0003-4000-8000-000000000003',
  'Carol', 'Test', 'carol@test.com', 'Equipment Finance', 720, 'pending'
);

-- Lead 4: Working Capital, credit 750 (matches Order B only, no other order has this vertical)
INSERT INTO leads (id, first_name, last_name, email, vertical, credit_score, status)
VALUES (
  'bbbbbbbb-0004-4000-8000-000000000004',
  'Dave', 'Test', 'dave@test.com', 'Working Capital', 750, 'pending'
);

-- Lead 5: MCA, credit 500 (too low for Order A 620, matches Order B only)
INSERT INTO leads (id, first_name, last_name, email, vertical, credit_score, status)
VALUES (
  'bbbbbbbb-0005-4000-8000-000000000005',
  'Eve', 'Test', 'eve@test.com', 'MCA', 500, 'pending'
);
