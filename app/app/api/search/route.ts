import { NextRequest, NextResponse } from "next/server";
import { db, customers, suppliers, airlines, consultants, vouchers, chartOfAccounts, tickets, users, roles } from "@/lib/db";
import { getSession } from "@/lib/auth/get-session";
import { and, eq, ilike, or, isNull, inArray } from "drizzle-orm";

type PartyType = "customer" | "supplier" | "airline" | "consultant" | "voucher" | "account" | "ticket";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as PartyType | null;
  const q = searchParams.get("q")?.trim() ?? "";

  if (!type) {
    return NextResponse.json({ error: "Missing type" }, { status: 400 });
  }

  const term = `%${q}%`;

  switch (type) {
    case "customer": {
      const rows = await db
        .select({ id: customers.id, label: customers.name, sublabel: customers.phone })
        .from(customers)
        .where(
          and(
            eq(customers.agencyId, session.agencyId),
            q ? or(ilike(customers.name, term), ilike(customers.customerCode, term)) : undefined
          )
        )
        .limit(20);
      return NextResponse.json({ results: rows });
    }
    case "supplier": {
      const rows = await db
        .select({ id: suppliers.id, label: suppliers.name, sublabel: suppliers.type })
        .from(suppliers)
        .where(
          and(
            eq(suppliers.agencyId, session.agencyId),
            q ? or(ilike(suppliers.name, term), ilike(suppliers.supplierCode, term)) : undefined
          )
        )
        .limit(20);
      return NextResponse.json({ results: rows });
    }
    case "airline": {
      const rows = await db
        .select({ id: airlines.id, label: airlines.name, sublabel: airlines.iataCode })
        .from(airlines)
        .where(
          and(
            eq(airlines.agencyId, session.agencyId),
            q ? or(ilike(airlines.name, term), ilike(airlines.iataCode, term)) : undefined
          )
        )
        .limit(20);
      return NextResponse.json({ results: rows });
    }
    case "consultant": {
      // Auto-sync: find all users with the "consultant" role in this agency
      // and ensure each one has a matching record in the consultants table.
      // This bridges the gap between user accounts (users table) and party
      // records (consultants table) without requiring a DB schema migration.
      const consultantRoleUsers = await db
        .select({ name: users.name, email: users.email, phone: users.phone })
        .from(users)
        .innerJoin(roles, eq(users.roleId, roles.id))
        .where(
          and(
            eq(users.agencyId, session.agencyId),
            eq(roles.name, "consultant"),
            inArray(users.status, ["active", "invited"])
          )
        );

      for (const cu of consultantRoleUsers) {
        if (!cu.email) continue;
        const [existing] = await db
          .select({ id: consultants.id })
          .from(consultants)
          .where(
            and(
              eq(consultants.agencyId, session.agencyId),
              eq(consultants.email, cu.email)
            )
          )
          .limit(1);

        if (!existing) {
          await db.insert(consultants).values({
            agencyId: session.agencyId,
            name: cu.name,
            email: cu.email,
            phone: cu.phone ?? undefined,
          });
        }
      }

      // Now query the consultants table normally (which now includes synced users)
      const rows = await db
        .select({ id: consultants.id, label: consultants.name, sublabel: consultants.phone })
        .from(consultants)
        .where(
          and(
            eq(consultants.agencyId, session.agencyId),
            q ? ilike(consultants.name, term) : undefined
          )
        )
        .limit(20);
      return NextResponse.json({ results: rows });
    }
    case "voucher": {
      const rows = await db
        .select({
          id: vouchers.id,
          label: vouchers.voucherNo,
          sublabel: vouchers.voucherType,
        })
        .from(vouchers)
        .where(
          and(
            eq(vouchers.agencyId, session.agencyId),
            eq(vouchers.status, "posted"),
            isNull(vouchers.deletedAt),
            q ? ilike(vouchers.voucherNo, term) : undefined
          )
        )
        .limit(20);
      return NextResponse.json({ results: rows });
    }
    case "ticket": {
      const rows = await db
        .select({
          id: tickets.id,
          label: tickets.ticketNo,
          sublabel: tickets.pnr,
        })
        .from(tickets)
        .where(
          and(
            eq(tickets.agencyId, session.agencyId),
            eq(tickets.status, "active"),
            eq(tickets.isBsp, false),
            q ? or(ilike(tickets.ticketNo, term), ilike(tickets.pnr, term)) : undefined
          )
        )
        .limit(20);
      return NextResponse.json({
        results: rows.map((r) => ({ ...r, label: r.label || "(no ticket no.)" })),
      });
    }
    case "account": {
      const rows = await db
        .select({
          id: chartOfAccounts.id,
          label: chartOfAccounts.accountName,
          sublabel: chartOfAccounts.accountCode,
        })
        .from(chartOfAccounts)
        .where(
          and(
            eq(chartOfAccounts.agencyId, session.agencyId),
            eq(chartOfAccounts.isActive, true),
            q ? or(ilike(chartOfAccounts.accountName, term), ilike(chartOfAccounts.accountCode, term)) : undefined
          )
        )
        .limit(20);
      return NextResponse.json({ results: rows });
    }
    default:
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
}
