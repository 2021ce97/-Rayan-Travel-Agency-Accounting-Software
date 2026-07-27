# Rayan Solutions — Setup Guide

## What's in this project

```
rayan-solutions/
├── db/
│   ├── migrations/          -- run these in order against Postgres
│   │   ├── 001_core_and_masters.sql
│   │   ├── 002_accounting_engine.sql
│   │   ├── 003_travel_documents.sql
│   │   └── 004_reporting_views.sql
│   └── seeds/
│       └── onboard_new_agency.sql   -- manual psql onboarding path
└── app/                      -- the Next.js application
```

The `db/` SQL files are the source of truth for the schema. The
`app/lib/db/schema-*.ts` files are a Drizzle ORM mirror of the same
tables, used by the app code to query with type safety.

There are now **two ways to onboard an agency**: the self-serve
`/signup` page (recommended — see step 7), or the manual psql seed
script (steps 5–6, still useful for scripting or support work). Both
create an identical chart of accounts — `app/lib/onboarding/onboard-agency.ts`
is a hand-kept TypeScript port of `db/seeds/onboard_new_agency.sql`.

## 1. Prerequisites

- Node.js 20+
- A PostgreSQL 14+ database (local install, Docker, or a hosted one
  like Supabase/Neon/Railway — any plain Postgres works)

## 2. Create the database

```bash
createdb rayan_solutions
```

Or with Docker:

```bash
docker run --name rayan-pg -e POSTGRES_PASSWORD=devpassword \
  -e POSTGRES_DB=rayan_solutions -p 5432:5432 -d postgres:16
```

## 3. Environment variables

In `app/`, create `.env.local`:

```
DATABASE_URL="postgres://postgres:devpassword@localhost:5432/rayan_solutions"
SESSION_SECRET="generate-a-long-random-string-here"
```

Generate a real `SESSION_SECRET` with:

```bash
openssl rand -base64 48
```

This signs the login session cookie (JWT). Don't reuse a placeholder
in production — anyone with it could forge a session.

## 4. Run the migrations

```bash
psql "$DATABASE_URL" -f db/migrations/001_core_and_masters.sql
psql "$DATABASE_URL" -f db/migrations/002_accounting_engine.sql
psql "$DATABASE_URL" -f db/migrations/003_travel_documents.sql
psql "$DATABASE_URL" -f db/migrations/004_reporting_views.sql
```

## 5. Install dependencies and run the app

```bash
cd app
npm install
npm run dev
```

Visit `http://localhost:3000` — redirects to `/login` if signed out,
`/dashboard` otherwise.

## 6. Recommended: create your first agency via /signup

Go to `http://localhost:3000/signup` and fill in your agency name,
base currency, your name, email, and password. This one form:

- creates the `agencies` row (on a 14-day trial by default)
- runs the full onboarding (default roles, Head Office branch, and
  the standard chart of accounts — cash/bank, receivables/payables,
  BSP payable, ticket/visa/hotel/package income & cost accounts,
  refunds account)
- creates you as the `owner` user
- logs you straight into `/dashboard`

All in one transaction — if anything fails partway, nothing is left
half-created.

## 6b. Alternative: manual onboarding via psql

Useful for scripting, bulk imports, or support work where you don't
want to go through the UI.

```sql
INSERT INTO agencies (name, slug, email, base_currency)
VALUES ('Skyline Travels & Tours', 'skyline', 'info@skyline.pk', 'PKR')
RETURNING id;
```

```bash
psql "$DATABASE_URL" -v agency_id=1 -f db/seeds/onboard_new_agency.sql
```

Then create a user manually:

```bash
cd app
node -e "console.log(require('bcryptjs').hashSync('your-password-here', 10))"
```

```sql
INSERT INTO users (agency_id, role_id, name, email, password_hash)
VALUES (
  1,
  (SELECT id FROM roles WHERE agency_id = 1 AND name = 'owner'),
  'Fazl',
  'fazl@skyline.pk',
  '<paste the bcrypt hash here>'
);
```

Log in at `/login` with that email and password.

## 7. Add customers and suppliers before posting vouchers

- `/customers` — auto-creates the linked receivable account
- `/suppliers` — auto-creates the linked payable account
- `/airlines` — used on ticket vouchers and airline-wise sales report

All voucher forms use a searchable, type-ahead picker (`PartyPicker`)
instead of raw numeric IDs — start typing a name and select from the
dropdown.

## 8. Posting vouchers

- `/vouchers/ticket` — flight tickets, with commission split
- `/vouchers/visa` — visa services
- `/vouchers/hotel` — hotel bookings
- `/vouchers/package` — bundles of tickets/hotels/visas/transport
  into one customer sale, with an itemized breakdown for the invoice.
  Posts one income/cost pair — doesn't double-post components already
  sold as their own vouchers.
- `/vouchers/refund` — refunds against any existing posted voucher,
  kept as its own auditable entry rather than editing the original
- `/vouchers/journal` — the flexible fallback for manual journal,
  cash, bank, or expense entries with an arbitrary number of
  debit/credit lines (e.g. paying office rent, recording a cash
  deposit). Includes a live balanced/unbalanced indicator.
- `/vouchers/bsp` — IATA BSP settlement: mark posted tickets into a
  BSP period, see gross/commission/net remittance per batch, and
  update settlement status (pending → submitted → settled). Once you
  wire the actual bank transfer to IATA, record that as a journal
  voucher crediting Bank and debiting BSP Payable (2100).

Every posting engine refuses to post if debits don't equal credits —
this can't drift out of balance.

## 9. Voucher PDFs

Every posted voucher has a downloadable PDF at:

```
/api/vouchers/{id}/pdf
```

A "PDF" link appears next to every posted row on `/vouchers`. The PDF
includes your agency's letterhead (name, address, phone, email),
the customer/supplier block, type-specific fields (PNR/sector for
tickets, check-in/out for hotels, etc.), an itemized line table, and
the total — styled consistently across every voucher type via
`lib/pdf/voucher-pdf.ts`. Built with `pdf-lib`, so it needs no system
dependencies (fonts are embedded standard fonts).

## 10. Where to see the results

- `/vouchers` — every posted voucher, with quick-create buttons and
  a PDF download link per row
- `/ledger` — every individual debit/credit line
- `/trial-balance` — net balance per account, with a live
  balanced/out-of-balance badge
- `/reports` — profit & loss, airline-wise sales, and receivables
  aging in one screen

## 11. Generating Drizzle types after schema changes

```bash
npx drizzle-kit generate
```

(The hand-written SQL in `db/migrations/` is still the source of
truth; Drizzle is used for querying, not schema generation. Keep both
in sync manually — and if you add a new chart-of-accounts entry any
posting engine relies on, add it to **both**
`db/seeds/onboard_new_agency.sql` and
`app/lib/onboarding/onboard-agency.ts` so agencies onboarded either
way stay consistent.)

## What's built vs. what's next

**Built — the full core system:**
- Multi-tenant schema, full chart of accounts, double-entry engine
  with a balance-or-throw guard on every posting path
- Auth: JWT session cookies, login/logout, bcrypt hashing, route
  protection via `proxy.ts` and `requireSession()`
- Self-serve signup flow (`/signup`) that creates the agency, runs
  onboarding, creates the owner user, and logs them in — all in one
  transaction — plus the original manual psql onboarding path
- All seven voucher types: ticket, visa, hotel, package, refund,
  journal (covers cash/bank/expense too), and BSP settlement tracking
- Searchable type-ahead pickers for every party/account field
  (backed by a single `/api/search` endpoint)
- PDF generation for every posted voucher, with consistent agency
  letterhead styling across all types
- `/vouchers` list, `/ledger`, `/trial-balance`, `/reports` (P&L,
  airline-wise, aging) — all reading live from the SQL views
- Customer, supplier, and airline CRUD with automatic chart-of-
  accounts linkage

**Not yet built (polish, not core gaps):**
- User management UI (currently SQL-only, or add teammates by having
  them... well, there's no invite flow yet — only the first owner
  gets created via /signup)
- Multi-currency exchange rate management UI
  (`agency_exchange_rates` table exists, no UI yet — vouchers accept
  an `exchangeRate` field manually)
- Voucher edit/void flows (vouchers currently post once; cancelling
  one means posting an offsetting journal voucher rather than
  editing history — standard accounting practice, but a dedicated
  "void" button with confirmation would be a nice add)
- Branch-level reporting filters (branches exist in the schema and
  on vouchers, but reports currently aggregate across all branches)
- Billing/subscription enforcement (agencies have a `plan` and
  `trialEndsAt` field and the sidebar shows days remaining, but
  nothing currently blocks access when a trial expires)
- Password reset / forgot-password flow
