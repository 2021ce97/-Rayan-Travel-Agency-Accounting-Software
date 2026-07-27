-- =====================================================================
-- Seed: Onboard a new agency
-- Run this (with :agency_id substituted) right after inserting a new
-- row into `agencies`. Sets up default roles, a head office branch,
-- and a standard chart of accounts so the agency can start posting
-- vouchers immediately.
-- =====================================================================

-- Usage: replace :agency_id with the new agency's id, e.g. via psql -v agency_id=5

-- 1. Default roles
INSERT INTO roles (agency_id, name, description, permissions) VALUES
(:agency_id, 'owner',      'Full access to everything',            '{"*": true}'),
(:agency_id, 'admin',      'Manage users, vouchers, reports',      '{"vouchers.*": true, "reports.*": true, "masters.*": true, "users.manage": true}'),
(:agency_id, 'accountant', 'Post vouchers and view reports',       '{"vouchers.*": true, "reports.view": true, "masters.view": true}'),
(:agency_id, 'consultant', 'Create vouchers only, no reports',     '{"vouchers.create": true, "vouchers.view_own": true}'),
(:agency_id, 'viewer',     'Read-only access',                     '{"vouchers.view": true, "reports.view": true}');

-- 2. Head office branch
INSERT INTO branches (agency_id, name, is_head_office, status) VALUES
(:agency_id, 'Head Office', true, 'active');

-- 3. Account groups
INSERT INTO account_groups (agency_id, name, group_type) VALUES
(:agency_id, 'Current Assets',     'asset'),
(:agency_id, 'Current Liabilities','liability'),
(:agency_id, 'Equity',             'equity'),
(:agency_id, 'Income',             'income'),
(:agency_id, 'Direct Expenses',    'expense'),
(:agency_id, 'Indirect Expenses',  'expense');

-- 4. Standard chart of accounts
-- (account_code convention: 1xxx assets, 2xxx liabilities, 3xxx equity, 4xxx income, 5xxx expense)
INSERT INTO chart_of_accounts (agency_id, account_code, account_name, group_id, account_type, balance_type, is_system)
SELECT :agency_id, code, name, ag.id, type, bal, true
FROM (VALUES
    ('1000', 'Cash in Hand',              'asset',     'debit'),
    ('1010', 'Bank Account',              'asset',     'debit'),
    ('1100', 'Accounts Receivable',       'asset',     'debit'),
    ('2000', 'Accounts Payable',          'liability', 'credit'),
    ('2100', 'BSP Payable (IATA)',        'liability', 'credit'),
    ('3000', 'Owner''s Equity',           'equity',    'credit'),
    ('4000', 'Ticket Sales Income',       'income',    'credit'),
    ('4010', 'Visa Service Income',       'income',    'credit'),
    ('4020', 'Hotel Booking Income',      'income',    'credit'),
    ('4030', 'Package Sales Income',      'income',    'credit'),
    ('4090', 'Commission Income',         'income',    'credit'),
    ('5000', 'Ticket Purchase Cost',      'expense',   'debit'),
    ('5010', 'Visa Purchase Cost',        'expense',   'debit'),
    ('5020', 'Hotel Purchase Cost',       'expense',   'debit'),
    ('5030', 'Package Purchase Cost',     'expense',   'debit'),
    ('5100', 'Refunds & Cancellations',   'expense',   'debit'),
    ('5900', 'Office & Admin Expenses',   'expense',   'debit')
) AS defaults(code, name, type, bal)
JOIN account_groups ag ON ag.agency_id = :agency_id
    AND ag.group_type = defaults.type
    AND ag.name = (CASE defaults.type
        WHEN 'asset' THEN 'Current Assets'
        WHEN 'liability' THEN 'Current Liabilities'
        WHEN 'equity' THEN 'Equity'
        WHEN 'income' THEN 'Income'
        WHEN 'expense' THEN CASE WHEN defaults.code LIKE '50%' THEN 'Direct Expenses' ELSE 'Indirect Expenses' END
    END);
