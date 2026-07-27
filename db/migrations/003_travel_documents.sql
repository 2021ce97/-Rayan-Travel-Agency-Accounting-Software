-- =====================================================================
-- Migration 003: Travel Document Tables
-- Tickets, Visas, Hotels, Refunds, Packages, BSP
-- =====================================================================

BEGIN;

CREATE TABLE tickets (
    id                  BIGSERIAL PRIMARY KEY,
    agency_id           BIGINT NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    voucher_id          BIGINT NOT NULL UNIQUE REFERENCES vouchers(id) ON DELETE CASCADE,
    customer_id         BIGINT REFERENCES customers(id),
    supplier_id         BIGINT REFERENCES suppliers(id),
    airline_id          BIGINT REFERENCES airlines(id),
    consultant_id       BIGINT REFERENCES consultants(id),
    pnr                 VARCHAR(50),
    ticket_no           VARCHAR(80),
    passenger_name      VARCHAR(200),
    sector_from         VARCHAR(100),
    sector_to           VARCHAR(100),
    issue_date          DATE,
    travel_date         DATE,
    base_fare           NUMERIC(18,2) NOT NULL DEFAULT 0,
    tax_amount          NUMERIC(18,2) NOT NULL DEFAULT 0,
    service_charge      NUMERIC(18,2) NOT NULL DEFAULT 0,
    commission_amount   NUMERIC(18,2) NOT NULL DEFAULT 0,
    sale_amount         NUMERIC(18,2) NOT NULL DEFAULT 0,
    purchase_amount     NUMERIC(18,2) NOT NULL DEFAULT 0,
    profit_amount       NUMERIC(18,2) NOT NULL DEFAULT 0,
    is_bsp              BOOLEAN NOT NULL DEFAULT false,
    status              VARCHAR(20) NOT NULL DEFAULT 'active', -- active, refunded, void
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE visas (
    id                  BIGSERIAL PRIMARY KEY,
    agency_id           BIGINT NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    voucher_id          BIGINT NOT NULL UNIQUE REFERENCES vouchers(id) ON DELETE CASCADE,
    customer_id         BIGINT REFERENCES customers(id),
    supplier_id         BIGINT REFERENCES suppliers(id),
    consultant_id       BIGINT REFERENCES consultants(id),
    visa_type           VARCHAR(100),
    visa_no             VARCHAR(100),
    passport_no         VARCHAR(100),
    country_id          BIGINT REFERENCES countries(id),
    issue_date          DATE,
    selling_amount      NUMERIC(18,2) NOT NULL DEFAULT 0,
    purchase_amount     NUMERIC(18,2) NOT NULL DEFAULT 0,
    exchange_rate       NUMERIC(18,6) NOT NULL DEFAULT 1,
    profit_amount       NUMERIC(18,2) NOT NULL DEFAULT 0,
    status              VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE hotels (
    id                  BIGSERIAL PRIMARY KEY,
    agency_id           BIGINT NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    voucher_id          BIGINT NOT NULL UNIQUE REFERENCES vouchers(id) ON DELETE CASCADE,
    customer_id         BIGINT REFERENCES customers(id),
    supplier_id         BIGINT REFERENCES suppliers(id),
    consultant_id       BIGINT REFERENCES consultants(id),
    hotel_name          VARCHAR(200),
    country_id          BIGINT REFERENCES countries(id),
    city_id             BIGINT REFERENCES cities(id),
    check_in_date       DATE,
    check_out_date      DATE,
    nights              INT,
    rooms               INT,
    adults              INT,
    children            INT,
    room_type           VARCHAR(100),
    selling_amount      NUMERIC(18,2) NOT NULL DEFAULT 0,
    purchase_amount     NUMERIC(18,2) NOT NULL DEFAULT 0,
    profit_amount       NUMERIC(18,2) NOT NULL DEFAULT 0,
    status              VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE refunds (
    id                  BIGSERIAL PRIMARY KEY,
    agency_id           BIGINT NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    voucher_id          BIGINT NOT NULL UNIQUE REFERENCES vouchers(id) ON DELETE CASCADE,
    related_voucher_id  BIGINT REFERENCES vouchers(id),
    refund_date         DATE NOT NULL,
    reason              TEXT,
    amount              NUMERIC(18,2) NOT NULL DEFAULT 0,
    currency_id         BIGINT REFERENCES currencies(id),
    status              VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE packages (
    id                      BIGSERIAL PRIMARY KEY,
    agency_id               BIGINT NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    voucher_id              BIGINT NOT NULL UNIQUE REFERENCES vouchers(id) ON DELETE CASCADE,
    customer_id             BIGINT REFERENCES customers(id),
    package_name            VARCHAR(200) NOT NULL,
    destination             VARCHAR(200),
    start_date              DATE,
    end_date                DATE,
    total_sale_amount       NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_purchase_amount   NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_profit            NUMERIC(18,2) NOT NULL DEFAULT 0,
    status                  VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Breaks a package into its component parts (flight, hotel, transport, visa)
-- item_type + reference_id point to the relevant ticket/hotel/visa row.
CREATE TABLE package_items (
    id              BIGSERIAL PRIMARY KEY,
    package_id      BIGINT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    item_type       VARCHAR(50) NOT NULL,  -- ticket, hotel, visa, transport, other
    reference_id    BIGINT,
    description     TEXT,
    amount          NUMERIC(18,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- BSP settlement batches (IATA Billing & Settlement Plan reconciliation)
CREATE TABLE bsp_sales (
    id                  BIGSERIAL PRIMARY KEY,
    agency_id           BIGINT NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    ticket_id           BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    bsp_period          VARCHAR(20) NOT NULL,  -- e.g. '2026-07-1' for first half of July
    airline_id          BIGINT REFERENCES airlines(id),
    gross_amount        NUMERIC(18,2) NOT NULL DEFAULT 0,
    commission_amount   NUMERIC(18,2) NOT NULL DEFAULT 0,
    net_remittance      NUMERIC(18,2) NOT NULL DEFAULT 0,
    settlement_status   VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, submitted, settled
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Cross-cutting: audit log & attachments (for supporting docs, e-tickets, etc.)
-- ---------------------------------------------------------------------

CREATE TABLE audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    agency_id       BIGINT NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    user_id         BIGINT REFERENCES users(id),
    action_type     VARCHAR(50) NOT NULL,   -- create, update, delete, post, cancel
    module_name     VARCHAR(100) NOT NULL,
    record_id       BIGINT,
    old_data        JSONB,
    new_data        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE attachments (
    id              BIGSERIAL PRIMARY KEY,
    agency_id       BIGINT NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    source_type     VARCHAR(50) NOT NULL,
    source_id       BIGINT NOT NULL,
    file_name       VARCHAR(255) NOT NULL,
    file_path       TEXT NOT NULL,
    file_type       VARCHAR(100),
    uploaded_by     BIGINT REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------

CREATE INDEX idx_tickets_agency ON tickets(agency_id);
CREATE INDEX idx_tickets_pnr ON tickets(pnr);
CREATE INDEX idx_tickets_ticket_no ON tickets(ticket_no);
CREATE INDEX idx_visas_agency ON visas(agency_id);
CREATE INDEX idx_visas_visa_no ON visas(visa_no);
CREATE INDEX idx_hotels_agency ON hotels(agency_id);
CREATE INDEX idx_hotels_dates ON hotels(check_in_date, check_out_date);
CREATE INDEX idx_packages_agency ON packages(agency_id);
CREATE INDEX idx_package_items_package ON package_items(package_id);
CREATE INDEX idx_bsp_sales_agency_period ON bsp_sales(agency_id, bsp_period);
CREATE INDEX idx_audit_logs_agency ON audit_logs(agency_id, module_name, record_id);
CREATE INDEX idx_attachments_source ON attachments(source_type, source_id);

COMMIT;
