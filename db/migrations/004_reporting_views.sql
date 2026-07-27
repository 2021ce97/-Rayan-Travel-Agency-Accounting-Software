-- =====================================================================
-- Migration 004: Reporting Views
-- These read from vouchers + voucher_lines, so as long as every voucher
-- posts correctly, these views stay accurate automatically.
-- =====================================================================

BEGIN;

-- Ledger: every posted line, per account, per agency
CREATE VIEW ledger_view AS
SELECT
    v.agency_id,
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
WHERE v.status = 'posted' AND v.deleted_at IS NULL;

-- Trial balance: net debit/credit per account as of "now" (filter by date in query)
CREATE VIEW trial_balance_view AS
SELECT
    v.agency_id,
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
WHERE v.status = 'posted' AND v.deleted_at IS NULL
GROUP BY v.agency_id, vl.account_id, coa.account_code, coa.account_name, coa.account_type;

-- Profit & Loss: income and expense accounts only
CREATE VIEW profit_loss_view AS
SELECT
    v.agency_id,
    coa.account_type,
    coa.account_name,
    SUM(vl.credit_amount) - SUM(vl.debit_amount) AS net_amount -- positive for income, negative for expense reduces P&L
FROM voucher_lines vl
JOIN vouchers v ON v.id = vl.voucher_id
JOIN chart_of_accounts coa ON coa.id = vl.account_id
WHERE v.status = 'posted' AND v.deleted_at IS NULL
    AND coa.account_type IN ('income', 'expense')
GROUP BY v.agency_id, coa.account_type, coa.account_name;

-- Customer statement
CREATE VIEW customer_statement_view AS
SELECT
    v.agency_id,
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
WHERE v.deleted_at IS NULL;

-- Supplier statement
CREATE VIEW supplier_statement_view AS
SELECT
    v.agency_id,
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
WHERE v.deleted_at IS NULL;

-- Airline-wise sales (from tickets)
CREATE VIEW airline_wise_sales_view AS
SELECT
    t.agency_id,
    t.airline_id,
    a.name AS airline_name,
    COUNT(*) AS ticket_count,
    SUM(t.sale_amount) AS total_sales,
    SUM(t.purchase_amount) AS total_cost,
    SUM(t.profit_amount) AS total_profit
FROM tickets t
JOIN airlines a ON a.id = t.airline_id
WHERE t.status = 'active'
GROUP BY t.agency_id, t.airline_id, a.name;

-- Consultant-wise sales (across tickets, visas, hotels)
CREATE VIEW consultant_wise_sales_view AS
SELECT agency_id, consultant_id, 'ticket' AS source_type, sale_amount AS sale, profit_amount AS profit FROM tickets WHERE consultant_id IS NOT NULL
UNION ALL
SELECT agency_id, consultant_id, 'visa' AS source_type, selling_amount AS sale, profit_amount AS profit FROM visas WHERE consultant_id IS NOT NULL
UNION ALL
SELECT agency_id, consultant_id, 'hotel' AS source_type, selling_amount AS sale, profit_amount AS profit FROM hotels WHERE consultant_id IS NOT NULL;

-- A/R aging (unpaid customer vouchers bucketed by age)
CREATE VIEW aging_report_view AS
SELECT
    v.agency_id,
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
WHERE v.status = 'posted' AND v.deleted_at IS NULL AND v.customer_id IS NOT NULL;

COMMIT;
