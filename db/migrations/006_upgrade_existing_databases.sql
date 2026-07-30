-- =====================================================================
-- Migration 006: Upgrade Existing Databases
-- Brings databases created by earlier releases in line with the current
-- application schema. Every statement is idempotent and safe to rerun.
-- =====================================================================

BEGIN;

ALTER TABLE agencies ADD COLUMN IF NOT EXISTS plan VARCHAR(30) NOT NULL DEFAULT 'trial';
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS plan_status VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_token TEXT;

ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS is_voided BOOLEAN NOT NULL DEFAULT false;

COMMIT;
