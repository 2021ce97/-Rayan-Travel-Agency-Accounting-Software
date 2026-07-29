import { HotelVoucherForm } from "./hotel-voucher-form";
import { getSession } from "@/lib/auth/get-session";
import { db, consultants, roles, users } from "@/lib/db";
import { and, eq } from "drizzle-orm";

export default async function HotelVoucherPage() {
  // If the logged-in user holds the "consultant" role, pre-populate the
  // Consultant field by matching their email against the consultants table.
  let defaultConsultant: { id: number; name: string } | undefined;

  const session = await getSession();
  if (session) {
    // Check whether the user's role is named "consultant"
    const [role] = await db
      .select({ name: roles.name })
      .from(roles)
      .where(eq(roles.id, session.roleId))
      .limit(1);

    if (role?.name === "consultant") {
      // Find the matching consultant record by email
      const [user] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);

      if (user?.email) {
        const [consultant] = await db
          .select({ id: consultants.id, name: consultants.name })
          .from(consultants)
          .where(
            and(
              eq(consultants.agencyId, session.agencyId),
              eq(consultants.email, user.email)
            )
          )
          .limit(1);

        if (consultant) {
          defaultConsultant = consultant;
        }
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900">New Hotel Voucher</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Posting this voucher automatically creates the matching double-entry accounting lines.
        </p>
      </div>
      <HotelVoucherForm defaultConsultant={defaultConsultant} />
    </div>
  );
}
