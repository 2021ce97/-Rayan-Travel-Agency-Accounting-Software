import { NextRequest, NextResponse } from "next/server";
import {
  db,
  vouchers,
  agencies,
  customers,
  suppliers,
  tickets,
  visas,
  hotels,
  refunds,
  packages,
  packageItems,
  currencies,
} from "@/lib/db";
import { requireSession } from "@/lib/auth/get-session";
import { eq, and } from "drizzle-orm";
import { generateVoucherPdf, type VoucherPdfInput } from "@/lib/pdf/voucher-pdf";

const typeLabels: Record<string, string> = {
  ticket: "Ticket Voucher",
  visa: "Visa Voucher",
  hotel: "Hotel Voucher",
  package: "Package Voucher",
  refund: "Refund Voucher",
  journal: "Journal Voucher",
  cash: "Cash Voucher",
  bank: "Bank Voucher",
  expense: "Expense Voucher",
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const voucherId = Number(id);

  if (!Number.isInteger(voucherId) || voucherId <= 0) {
    return NextResponse.json({ error: "Invalid voucher id" }, { status: 400 });
  }

  const [voucher] = await db
    .select()
    .from(vouchers)
    .where(and(eq(vouchers.id, voucherId), eq(vouchers.agencyId, session.agencyId)));

  if (!voucher) {
    return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
  }

  const [agency] = await db
    .select({ name: agencies.name, address: agencies.address, phone: agencies.phone, email: agencies.email })
    .from(agencies)
    .where(eq(agencies.id, session.agencyId));

  const [party] = voucher.customerId
    ? await db.select().from(customers).where(eq(customers.id, voucher.customerId))
    : voucher.supplierId
    ? await db.select().from(suppliers).where(eq(suppliers.id, voucher.supplierId))
    : [];

  let currencyCode: string | undefined;
  if (voucher.currencyId) {
    const [cur] = await db.select({ code: currencies.code }).from(currencies).where(eq(currencies.id, voucher.currencyId));
    currencyCode = cur?.code;
  }

  const input: VoucherPdfInput = {
    agencyName: agency?.name ?? "Travel Agency",
    agencyAddress: agency?.address ?? undefined,
    agencyPhone: agency?.phone ?? undefined,
    agencyEmail: agency?.email ?? undefined,

    voucherTypeLabel: typeLabels[voucher.voucherType] ?? voucher.voucherType,
    voucherNo: voucher.voucherNo,
    voucherDate: voucher.voucherDate,
    status: voucher.status,

    partyLabel: voucher.customerId ? "Billed To" : "Supplier",
    partyName: party && "name" in party ? party.name : "—",
    partyPhone: party && "phone" in party ? party.phone ?? undefined : undefined,
    partyEmail: party && "email" in party ? party.email ?? undefined : undefined,
    partyAddress: party && "address" in party ? (party as { address?: string | null }).address ?? undefined : undefined,

    fields: [],
    lineItems: [],
    totalAmount: Number(voucher.totalAmount),
    notes: voucher.notes ?? undefined,
    currencyCode,
  };

  switch (voucher.voucherType) {
    case "ticket": {
      const [t] = await db.select().from(tickets).where(eq(tickets.voucherId, voucher.id));
      if (t) {
        input.fields = [
          { label: "PNR", value: t.pnr ?? "" },
          { label: "Ticket No", value: t.ticketNo ?? "" },
          { label: "Passenger", value: t.passengerName ?? "" },
          { label: "Sector", value: [t.sectorFrom, t.sectorTo].filter(Boolean).join(" → ") },
          { label: "Travel Date", value: t.travelDate ?? "" },
          { label: "Issue Date", value: t.issueDate ?? "" },
        ];
        input.lineItems = [
          { label: "Base Fare", amount: Number(t.baseFare) },
          { label: "Tax", amount: Number(t.taxAmount) },
          { label: "Service Charge", amount: Number(t.serviceCharge) },
        ].filter((l) => l.amount !== 0);
      }
      break;
    }
    case "visa": {
      const [v] = await db.select().from(visas).where(eq(visas.voucherId, voucher.id));
      if (v) {
        input.fields = [
          { label: "Visa Type", value: v.visaType ?? "" },
          { label: "Visa No", value: v.visaNo ?? "" },
          { label: "Passport No", value: v.passportNo ?? "" },
          { label: "Issue Date", value: v.issueDate ?? "" },
        ];
        input.lineItems = [{ label: "Visa Service Fee", amount: Number(v.sellingAmount) }];
      }
      break;
    }
    case "hotel": {
      const [h] = await db.select().from(hotels).where(eq(hotels.voucherId, voucher.id));
      if (h) {
        input.fields = [
          { label: "Hotel", value: h.hotelName ?? "" },
          { label: "Room Type", value: h.roomType ?? "" },
          { label: "Check-in", value: h.checkInDate ?? "" },
          { label: "Check-out", value: h.checkOutDate ?? "" },
          { label: "Nights", value: h.nights?.toString() ?? "" },
          { label: "Rooms / Guests", value: `${h.rooms ?? "?"} room(s), ${h.adults ?? 0} adult(s)` },
        ];
        input.lineItems = [{ label: "Hotel Booking", detail: h.hotelName ?? undefined, amount: Number(h.sellingAmount) }];
      }
      break;
    }
    case "package": {
      const [pkg] = await db.select().from(packages).where(eq(packages.voucherId, voucher.id));
      if (pkg) {
        input.fields = [
          { label: "Package", value: pkg.packageName },
          { label: "Destination", value: pkg.destination ?? "" },
          { label: "Start Date", value: pkg.startDate ?? "" },
          { label: "End Date", value: pkg.endDate ?? "" },
        ];
        const items = await db.select().from(packageItems).where(eq(packageItems.packageId, pkg.id));
        input.lineItems =
          items.length > 0
            ? items.map((i) => ({ label: i.description || i.itemType, amount: Number(i.amount) }))
            : [{ label: pkg.packageName, amount: Number(pkg.totalSaleAmount) }];
      }
      break;
    }
    case "refund": {
      const [r] = await db.select().from(refunds).where(eq(refunds.voucherId, voucher.id));
      if (r) {
        let relatedNo: string | undefined;
        if (r.relatedVoucherId) {
          const [rv] = await db.select({ voucherNo: vouchers.voucherNo }).from(vouchers).where(eq(vouchers.id, r.relatedVoucherId));
          relatedNo = rv?.voucherNo;
        }
        input.fields = [
          { label: "Refund Against", value: relatedNo ?? "" },
          { label: "Refund Date", value: r.refundDate },
        ];
        input.lineItems = [{ label: r.reason || "Refund", amount: Number(r.amount) }];
      }
      break;
    }
    default: {
      // journal / cash / bank / expense — no dedicated detail table, fall
      // back to the voucher's own notes and total.
      input.lineItems = [{ label: voucher.notes || typeLabels[voucher.voucherType] || "Amount", amount: Number(voucher.totalAmount) }];
    }
  }

  const pdfBytes = await generateVoucherPdf(input);

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${voucher.voucherNo}.pdf"`,
    },
  });
}
