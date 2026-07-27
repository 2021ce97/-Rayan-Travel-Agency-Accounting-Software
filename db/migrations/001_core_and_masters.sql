-- =====================================================================
-- Rayan Solutions — Travel Agency Management System
-- Migration 001: Tenancy, Auth, Roles, Master Data
-- =====================================================================
-- Multi-tenant design: every agency (tenant) that subscribes gets its
-- own row in `agencies`, and every business table carries agency_id so
-- one database can serve many agencies with row-level isolation.
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

-- ---------------------------------------------------------------------
-- Tenancy
-- ---------------------------------------------------------------------

CREATE TABLE agencies (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    slug            VARCHAR(100) NOT NULL UNIQUE,          -- subdomain / URL slug
    email           VARCHAR(200),
    phone           VARCHAR(50),
    address         TEXT,
    country         VARCHAR(100),
    base_currency   VARCHAR(10) NOT NULL DEFAULT 'PKR',
    logo_url        TEXT,
    plan            VARCHAR(30) NOT NULL DEFAULT 'trial',  -- trial, basic, pro, enterprise
    plan_status     VARCHAR(20) NOT NULL DEFAULT 'active', -- active, past_due, suspended, cancelled
    trial_ends_at   TIMESTAMPTZ,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Auth & access
-- ---------------------------------------------------------------------

CREATE TABLE roles (
    id              BIGSERIAL PRIMARY KEY,
    agency_id       BIGINT REFERENCES agencies(id) ON DELETE CASCADE, -- NULL = system-wide default role
    name            VARCHAR(50) NOT NULL,          -- owner, admin, accountant, consultant, viewer
    description     TEXT,
    permissions     JSONB NOT NULL DEFAULT '{}',   -- e.g. {"vouchers.create": true, "reports.view": true}
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (agency_id, name)
);

CREATE TABLE branches (
    id              BIGSERIAL PRIMARY KEY,
    agency_id       BIGINT NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    name            VARCHAR(150) NOT NULL,
    phone           VARCHAR(50),
    address         TEXT,
    is_head_office  BOOLEAN NOT NULL DEFAULT false,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    agency_id       BIGINT NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    branch_id       BIGINT REFERENCES branches(id),
    role_id         BIGINT NOT NULL REFERENCES roles(id),
    name            VARCHAR(150) NOT NULL,
    email           VARCHAR(200) NOT NULL,
    password_hash   TEXT NOT NULL,
    phone           VARCHAR(50),
    status          VARCHAR(20) NOT NULL DEFAULT 'active', -- active, suspended, invited
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (agency_id, email)
);

-- ---------------------------------------------------------------------
-- Reference / lookup data (shared across all agencies — no agency_id)
-- ---------------------------------------------------------------------

CREATE TABLE countries (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    iso_code        VARCHAR(3) NOT NULL UNIQUE
);

CREATE TABLE cities (
    id              BIGSERIAL PRIMARY KEY,
    country_id      BIGINT NOT NULL REFERENCES countries(id),
    name            VARCHAR(150) NOT NULL
);

CREATE TABLE currencies (
    id              BIGSERIAL PRIMARY KEY,
    code            VARCHAR(10) NOT NULL UNIQUE,   -- PKR, USD, SAR
    name            VARCHAR(100) NOT NULL,
    symbol          VARCHAR(10)
);

-- Per-agency, since exchange rates and "which currencies we deal in" vary by agency
CREATE TABLE agency_exchange_rates (
    id              BIGSERIAL PRIMARY KEY,
    agency_id       BIGINT NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    currency_id     BIGINT NOT NULL REFERENCES currencies(id),
    rate_to_base    NUMERIC(18,6) NOT NULL,
    effective_date  DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (agency_id, currency_id, effective_date)
);

-- ---------------------------------------------------------------------
-- Master parties: customers, suppliers, airlines, consultants
-- ---------------------------------------------------------------------

CREATE TABLE customers (
    id              BIGSERIAL PRIMARY KEY,
    agency_id       BIGINT NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    customer_code   VARCHAR(30),
    name            VARCHAR(200) NOT NULL,
    phone           VARCHAR(50),
    email           VARCHAR(200),
    address         TEXT,
    passport_no     VARCHAR(50),
    country_id      BIGINT REFERENCES countries(id),
    opening_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
    balance_type    VARCHAR(10) NOT NULL DEFAULT 'debit', -- debit/credit
    notes           TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (agency_id, customer_code)
);

CREATE TABLE suppliers (
    id              BIGSERIAL PRIMARY KEY,
    agency_id       BIGINT NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    supplier_code   VARCHAR(30),
    name            VARCHAR(200) NOT NULL,
    type            VARCHAR(50),        -- airline, hotel, visa_agent, transport, other
    phone           VARCHAR(50),
    email           VARCHAR(200),
    opening_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
    balance_type    VARCHAR(10) NOT NULL DEFAULT 'credit',
    notes           TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (agency_id, supplier_code)
);

CREATE TABLE airlines (
    id              BIGSERIAL PRIMARY KEY,
    agency_id       BIGINT NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    airline_code    VARCHAR(30),
    name            VARCHAR(150) NOT NULL,
    iata_code       VARCHAR(10),
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE consultants (
    id              BIGSERIAL PRIMARY KEY,
    agency_id       BIGINT NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    consultant_code VARCHAR(30),
    name            VARCHAR(150) NOT NULL,
    phone           VARCHAR(50),
    email           VARCHAR(200),
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------

CREATE INDEX idx_users_agency ON users(agency_id);
CREATE INDEX idx_customers_agency ON customers(agency_id);
CREATE INDEX idx_suppliers_agency ON suppliers(agency_id);
CREATE INDEX idx_airlines_agency ON airlines(agency_id);
CREATE INDEX idx_consultants_agency ON consultants(agency_id);
CREATE INDEX idx_cities_country ON cities(country_id);

COMMIT;
