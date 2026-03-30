-- Migration: Add 24h and 2h reminder tracking columns to callbacks table
-- Expands from single 15-min reminder to 3 tiers: 24h, 2h, 15min
-- The existing reminder_sent_at column continues to track the 15-min reminder.

ALTER TABLE callbacks ADD COLUMN IF NOT EXISTS reminder_24h_sent_at timestamptz;
ALTER TABLE callbacks ADD COLUMN IF NOT EXISTS reminder_2h_sent_at timestamptz;
