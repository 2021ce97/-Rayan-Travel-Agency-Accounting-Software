import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, verifySession, type SessionPayload } from "./session";

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
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}
