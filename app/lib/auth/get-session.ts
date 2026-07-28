import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, verifySession, type SessionPayload } from "./session";
import { db, agencies } from "@/lib/db";
import { eq } from "drizzle-orm";

/**
 * Reads and verifies the session cookie for the current request.
 * Returns null if there's no valid session — callers that require
 * auth should use requireSession() instead, which redirects to /login.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

/**
 * Use this at the top of any protected server component or server
 * action. Redirects to /login if there's no valid session, so callers
 * can trust the returned session is real.
 */
export async function requireSession(options?: { skipBillingCheck?: boolean }): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (!options?.skipBillingCheck) {
    const [agency] = await db
      .select({ trialEndsAt: agencies.trialEndsAt, planStatus: agencies.planStatus })
      .from(agencies)
      .where(eq(agencies.id, session.agencyId))
      .limit(1);

    if (agency) {
      if (agency.planStatus === "suspended" || (agency.trialEndsAt && new Date() > agency.trialEndsAt)) {
        redirect("/billing");
      }
    }
  }

  return session;
}
