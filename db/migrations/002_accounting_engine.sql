-- =====================================================================
-- Migration 002: Chart of Accounts & Double-Entry Accounting Engine
-- =====================================================================
-- Every voucher writes debit/credit lines here. This is the single
-- source of truth that ledgers, trial balance, and P&L are computed from.
-- =====================================================================

BEGIN;

CREATE TABLE account_groups (
    id              BIGSERIAL PRIMARY KEY,
    agency_id       BIGINT NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    name            VARCHAR(150) NOT NULL,
    parent_id       BIGINT REFERENCES account_groups(id),
    group_type      VARCHAR(30) NOT NULL,  -- asset, liability, equity, income, expense
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chart_of_accounts (
    id                  BIGSERIAL PRIMARY KEY,
    agency_id           BIGINT NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    account_code        VARCHAR(30) NOT NULL,
    account_name        VARCHAR(200) NOT NULL,
    group_id            BIGINT NOT NULL REFERENCES account_groups(id),
    parent_account_id   BIGINT REFERENCES chart_of_accounts(id),
    account_type        VARCHAR(30) NOT NULL,  -- asset, liability, equity, income, expense
    opening_balance     NUMERIC(18,2) NOT NULL DEFAULT 0,
    balance_type        VARCHAR(10) NOT NULL DEFAULT 'debit',
    is_system           BOOLEAN NOT NULL DEFAULT false, -- true for auto-created accounts (e.g. per-customer receivable)
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (agency_id, account_code)
);

-- Link customers/suppliers/airlines to their control account, so
-- "customer receivable" and "supplier payable" postings have a target.
ALTER TABLE customers ADD COLUMN account_id BIGINT REFERENCES chart_of_accounts(id);
ALTER TABLE suppliers ADD COLUMN account_id BIGINT REFERENCES chart_of_accounts(id);
ALTER TABLE airlines  ADD COLUMN account_id BIGINT REFERENCES chart_of_accounts(id);

-- ---------------------------------------------------------------------
-- Vouchers — the header table for every transaction type
-- ---------------------------------------------------------------------

CREATE TABLE vouchers (
    id              BIGSERIAL PRIMARY KEY,
    agency_id       BIGINT NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    branch_id       BIGINT REFERENCES branches(id),
    voucher_no      VARCHAR(50) NOT NULL,
    voucher_type    VARCHAR(30) NOT NULL,  -- ticket, visa, hotel, refund, journal, cash, bank,
                                            -- expense, foreign_payment, foreign_received, package
    voucher_date    DATE NOT NULL,
    reference_no    VARCHAR(100),
    customer_id     BIGINT REFERENCES customers(id),
    supplier_id     BIGINT REFERENCES suppliers(id),
    airline_id      BIGINT REFERENCES airlines(id),
    consultant_id   BIGINT REFERENCES consultants(id),
    currency_id     BIGINT REFERENCES currencies(id),
    exchange_rate   NUMERIC(18,6) NOT NULL DEFAULT 1,
    total_amount    NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_cost      NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_profit    NUMERIC(18,2) NOT NULL DEFAULT 0,
    notes           TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, posted, cancelled
    created_by      BIGINT REFERENCES users(id),
    approved_by     BIGINT REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,
    UNIQUE (agency_id, voucher_no)
);

CREATE TABLE voucher_lines (
    id                  BIGSERIAL PRIMARY KEY,
    voucher_id          BIGINT NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
    account_id          BIGINT NOT NULL REFERENCES chart_of_accounts(id),
    line_type           VARCHAR(30) NOT NULL,
    description         TEXT,
    debit_amount        NUMERIC(18,2) NOT NULL DEFAULT 0,
    credit_amount       NUMERIC(18,2) NOT NULL DEFAULT 0,
    tax_amount          NUMERIC(18,2) NOT NULL DEFAULT 0,
    commission_amount   NUMERIC(18,2) NOT NULL DEFAULT 0,
    cost_amount         NUMERIC(18,2) NOT NULL DEFAULT 0,
    profit_amount       NUMERIC(18,2) NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_single_side CHECK (
        (debit_amount = 0 OR credit_amount = 0) AND NOT (debit_amount = 0 AND credit_amount = 0)
    )
);

-- Journal entries: an alternate/legacy view of postings, kept for manual
-- journal vouchers and for source-tracing (source_type/source_id point
-- back to whichever voucher generated the entry).
CREATE TABLE journal_entries (
    id              BIGSERIAL PRIMARY KEY,
    agency_id       BIGINT NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    journal_no      VARCHAR(50) NOT NULL,
    journal_date    DATE NOT NULL,
    source_type     VARCHAR(30),    -- 'voucher', 'manual', etc.
    source_id       BIGINT,
    narration       TEXT,
    total_debit     NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_credit    NUMERIC(18,2) NOT NULL DEFAULT 0,
    created_by      BIGINT REFERENCES users(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'posted',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (agency_id, journal_no),
    CONSTRAINT chk_balanced CHECK (total_debit = total_credit)
);

CREATE TABLE journal_entry_lines (
    id                  BIGSERIAL PRIMARY KEY,
    journal_entry_id    BIGINT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id          BIGINT NOT NULL REFERENCES chart_of_accounts(id),
    debit_amount        NUMERIC(18,2) NOT NULL DEFAULT 0,
    credit_amount       NUMERIC(18,2) NOT NULL DEFAULT 0,
    description         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payments (
    id              BIGSERIAL PRIMARY KEY,
    agency_id       BIGINT NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    payment_no      VARCHAR(50) NOT NULL,
    payment_date    DATE NOT NULL,
    party_type      VARCHAR(30) NOT NULL,  -- customer, supplier, airline
    party_id        BIGINT NOT NULL,
    account_id      BIGINT REFERENCES chart_of_accounts(id),
    amount          NUMERIC(18,2) NOT NULL DEFAULT 0,
    currency_id     BIGINT REFERENCES currencies(id),
    payment_method  VARCHAR(30),   -- cash, bank, cheque
    reference_no    VARCHAR(100),
    narration       TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'posted',
    created_by      BIGINT REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (agency_id, payment_no)
);

CREATE TABLE receipts (
    id              BIGSERIAL PRIMARY KEY,
    agency_id       BIGINT NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    receipt_no      VARCHAR(50) NOT NULL,
    receipt_date    DATE NOT NULL,
    party_type      VARCHAR(30) NOT NULL,
    party_id        BIGINT NOT NULL,
    account_id      BIGINT REFERENCES chart_of_accounts(id),
    amount          NUMERIC(18,2) NOT NULL DEFAULT 0,
    currency_id     BIGINT REFERENCES currencies(id),
    receipt_method  VARCHAR(30),
    reference_no    VARCHAR(100),
    narration       TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'posted',
    created_by      BIGINT REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (agency_id, receipt_no)
);

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------

CREATE INDEX idx_coa_agency ON chart_of_accounts(agency_id);
CREATE INDEX idx_vouchers_agency_type_date ON vouchers(agency_id, voucher_type, voucher_date);
CREATE INDEX idx_vouchers_customer ON vouchers(customer_id);
CREATE INDEX idx_vouchers_supplier ON vouchers(supplier_id);
CREATE INDEX idx_voucher_lines_voucher ON voucher_lines(voucher_id);
CREATE INDEX idx_voucher_lines_account ON voucher_lines(account_id);
CREATE INDEX idx_journal_entries_agency ON journal_entries(agency_id);
CREATE INDEX idx_journal_entries_source ON journal_entries(source_type, source_id);
CREATE INDEX idx_journal_lines_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX idx_payments_agency ON payments(agency_id);
CREATE INDEX idx_receipts_agency ON receipts(agency_id);

COMMIT;
