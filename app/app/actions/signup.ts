"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, agencies, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { onboardAgency } from "@/lib/onboarding/onboard-agency";
import { signSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

const signupSchema = z
  .object({
    agencyName: z.string().min(2, "Agency name is required"),
    baseCurrency: z.string().min(3).max(10).default("PKR"),
    ownerName: z.string().min(1, "Your name is required"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignupFormState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "agency"
  );
}

async function uniqueSlug(base: string): Promise<string> {
  let candidate = base;
  let suffix = 1;
  // Small, bounded loop — agency signups aren't high-frequency enough
  // to need a fancier collision strategy than "try appending -2, -3...".
  while (suffix < 50) {
    const [existing] = await db.select({ id: agencies.id }).from(agencies).where(eq(agencies.slug, candidate));
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return `${base}-${Date.now()}`;
}

export async function signup(_prevState: SignupFormState, formData: FormData): Promise<SignupFormState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { agencyName, baseCurrency, ownerName, email, password } = parsed.data;

  // Email uniqueness is enforced per-agency in the schema, but since
  // this is a brand-new agency, this email can't collide with itself —
  // the only failure mode here would be a genuine duplicate signup
  // attempt, which the transaction below will safely reject via the
  // unique constraint if it somehow races.

  const slug = await uniqueSlug(slugify(agencyName));
  const passwordHash = await bcrypt.hash(password, 10);

  let newUserId: number;
  let newAgencyId: number;
  let newRoleId: number;

  try {
    const result = await db.transaction(async (tx) => {
      const [agency] = await tx
        .insert(agencies)
        .values({
          name: agencyName,
          slug,
          email,
          baseCurrency: baseCurrency.toUpperCase(),
          plan: "trial",
          planStatus: "active",
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
        })
        .returning({ id: agencies.id });

      const { ownerRoleId } = await onboardAgency(agency.id, tx as unknown as typeof db);

      const [user] = await tx
        .insert(users)
        .values({
          agencyId: agency.id,
          roleId: ownerRoleId,
          name: ownerName,
          email,
          passwordHash,
          status: "active",
        })
        .returning({ id: users.id });

      return { agencyId: agency.id, userId: user.id, roleId: ownerRoleId };
    });

    newAgencyId = result.agencyId;
    newUserId = result.userId;
    newRoleId = result.roleId;
  } catch (err) {
    // Unique constraint on (agency_id, email) can't fire for a brand
    // new agency; a slug collision is handled by uniqueSlug above. Any
    // remaining failure is unexpected — surface it plainly.
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Failed to create your account. Please try again.",
    };
  }

  const token = await signSession({
    userId: newUserId,
    agencyId: newAgencyId,
    branchId: null,
    roleId: newRoleId,
    name: ownerName,
    email,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect("/dashboard");
}
