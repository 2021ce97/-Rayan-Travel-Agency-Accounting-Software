-- =====================================================================
-- Migration 005: Future Work
-- Adds columns for password reset, invites, voucher voiding,
-- and updates reporting views to include branch_id for filtering.
-- =====================================================================

BEGIN;

-- 1. Update users table for invites and password reset
ALTER TABLE users ADD COLUMN reset_token TEXT;
ALTER TABLE users ADD COLUMN reset_token_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN invite_token TEXT;

-- 2. Update vouchers table for voiding
ALTER TABLE vouchers ADD COLUMN is_voided BOOLEAN NOT NULL DEFAULT false;

-- 3. Update Reporting Views to include branch_id
DROP VIEW IF EXISTS ledger_view CASCADE;
CREATE VIEW ledger_view AS
SELECT
    v.agency_id,
    v.branch_id,
    vl.account_id,
    coa.account_name,
    v.id AS voucher_id,
    v.voucher_no,
    v.voucher_type,
    v.voucher_date,
    vl.description,
    vl.debit_amount,
    vl.credit_amount,
    (vl.debit_amount - vl.credit_amount) AS net_amount
FROM voucher_lines vl
JOIN vouchers v ON v.id = vl.voucher_id
JOIN chart_of_accounts coa ON coa.id = vl.account_id
WHERE v.status = 'posted' AND v.deleted_at IS NULL AND v.is_voided = false;

DROP VIEW IF EXISTS trial_balance_view CASCADE;
CREATE VIEW trial_balance_view AS
SELECT
    v.agency_id,
    v.branch_id,
    vl.account_id,
    coa.account_code,
    coa.account_name,
    coa.account_type,
    SUM(vl.debit_amount)  AS total_debit,
    SUM(vl.credit_amount) AS total_credit,
    SUM(vl.debit_amount) - SUM(vl.credit_amount) AS balance
FROM voucher_lines vl
JOIN vouchers v ON v.id = vl.voucher_id
JOIN chart_of_accounts coa ON coa.id = vl.account_id
WHERE v.status = 'posted' AND v.deleted_at IS NULL AND v.is_voided = false
GROUP BY v.agency_id, v.branch_id, vl.account_id, coa.account_code, coa.account_name, coa.account_type;

DROP VIEW IF EXISTS profit_loss_view CASCADE;
CREATE VIEW profit_loss_view AS
SELECT
    v.agency_id,
    v.branch_id,
    coa.account_type,
    coa.account_name,
    SUM(vl.credit_amount) - SUM(vl.debit_amount) AS net_amount -- positive for income, negative for expense reduces P&L
FROM voucher_lines vl
JOIN vouchers v ON v.id = vl.voucher_id
JOIN chart_of_accounts coa ON coa.id = vl.account_id
WHERE v.status = 'posted' AND v.deleted_at IS NULL AND v.is_voided = false
    AND coa.account_type IN ('income', 'expense')
GROUP BY v.agency_id, v.branch_id, coa.account_type, coa.account_name;

DROP VIEW IF EXISTS customer_statement_view CASCADE;
CREATE VIEW customer_statement_view AS
SELECT
    v.agency_id,
    v.branch_id,
    v.customer_id,
    c.name AS customer_name,
    v.id AS voucher_id,
    v.voucher_no,
    v.voucher_type,
    v.voucher_date,
    v.total_amount,
    v.status
FROM vouchers v
JOIN customers c ON c.id = v.customer_id
WHERE v.deleted_at IS NULL AND v.is_voided = false;

DROP VIEW IF EXISTS supplier_statement_view CASCADE;
CREATE VIEW supplier_statement_view AS
SELECT
    v.agency_id,
    v.branch_id,
    v.supplier_id,
    s.name AS supplier_name,
    v.id AS voucher_id,
    v.voucher_no,
    v.voucher_type,
    v.voucher_date,
    v.total_amount,
    v.status
FROM vouchers v
JOIN suppliers s ON s.id = v.supplier_id
WHERE v.deleted_at IS NULL AND v.is_voided = false;

DROP VIEW IF EXISTS aging_report_view CASCADE;
CREATE VIEW aging_report_view AS
SELECT
    v.agency_id,
    v.branch_id,
    v.customer_id,
    c.name AS customer_name,
    v.voucher_no,
    v.voucher_date,
    v.total_amount,
    (CURRENT_DATE - v.voucher_date) AS days_outstanding,
    CASE
        WHEN (CURRENT_DATE - v.voucher_date) <= 30 THEN '0-30'
        WHEN (CURRENT_DATE - v.voucher_date) <= 60 THEN '31-60'
        WHEN (CURRENT_DATE - v.voucher_date) <= 90 THEN '61-90'
        ELSE '90+'
    END AS aging_bucket
FROM vouchers v
JOIN customers c ON c.id = v.customer_id
WHERE v.status = 'posted' AND v.deleted_at IS NULL AND v.is_voided = false AND v.customer_id IS NOT NULL;

COMMIT;
