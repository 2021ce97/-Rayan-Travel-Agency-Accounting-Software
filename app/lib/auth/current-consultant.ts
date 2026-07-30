import { and, eq } from "drizzle-orm";
import { db, consultants, roles, users } from "@/lib/db";
import type { SessionPayload } from "./session";

/**
 * Returns the consultant record for the active consultant user. The record is
 * created only when that consultant first posts a voucher, keeping user
 * creation limited to creating the account itself.
 */
export async function getCurrentConsultantId(session: SessionPayload): Promise<number | undefined> {
  const [user] = await db
    .select({ name: users.name, email: users.email, roleName: roles.name })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(and(eq(users.id, session.userId), eq(users.agencyId, session.agencyId)))
    .limit(1);

  if (!user || user.roleName !== "consultant") return undefined;

  const [existingConsultant] = await db
    .select({ id: consultants.id })
    .from(consultants)
    .where(and(eq(consultants.agencyId, session.agencyId), eq(consultants.email, user.email)))
    .limit(1);

  if (existingConsultant) return existingConsultant.id;

  const [consultant] = await db
    .insert(consultants)
    .values({ agencyId: session.agencyId, name: user.name, email: user.email })
    .returning({ id: consultants.id });

  return consultant.id;
}
