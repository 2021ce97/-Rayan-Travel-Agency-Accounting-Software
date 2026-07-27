"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, users, agencies } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { signSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function login(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { email, password } = parsed.data;

  // Email is unique per-agency, not globally, so a user could in theory
  // exist under multiple agencies with the same address. For a first
  // version we take the first active match; a "which agency?" picker
  // is a reasonable follow-up if that scenario comes up in practice.
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), eq(users.status, "active")))
    .limit(1);

  if (!user) {
    return { status: "error", message: "Invalid email or password." };
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return { status: "error", message: "Invalid email or password." };
  }

  const [agency] = await db
    .select({ isActive: agencies.isActive, planStatus: agencies.planStatus })
    .from(agencies)
    .where(eq(agencies.id, user.agencyId));

  if (!agency?.isActive || agency.planStatus === "suspended") {
    return { status: "error", message: "This agency's account is not active. Contact support." };
  }

  const token = await signSession({
    userId: user.id,
    agencyId: user.agencyId,
    branchId: user.branchId ?? null,
    roleId: user.roleId,
    name: user.name,
    email: user.email,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

  redirect("/dashboard");
}

export async function logout() {
  "use server";
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
