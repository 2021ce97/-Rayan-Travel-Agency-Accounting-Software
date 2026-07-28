"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { db, users, roles } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/get-session";

export type CreateUserState = {
  status: "idle" | "error" | "success";
  message?: string;
  inviteLink?: string;
  fieldErrors?: Record<string, string[]>;
};

const createUserSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Enter a valid email address"),
  roleId: z.coerce.number().int().positive("Select a role"),
});

export async function createAgencyUser(
  _prevState: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  const session = await requireSession();

  const [actorRole] = await db
    .select({ name: roles.name })
    .from(roles)
    .where(eq(roles.id, session.roleId))
    .limit(1);

  if (!actorRole || !["owner", "admin"].includes(actorRole.name)) {
    return { status: "error", message: "Only owners and admins can create users." };
  }

  const parsed = createUserSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, email, roleId } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  const [selectedRole] = await db
    .select({ id: roles.id, name: roles.name })
    .from(roles)
    .where(and(eq(roles.id, roleId), eq(roles.agencyId, session.agencyId)))
    .limit(1);

  if (!selectedRole) {
    return { status: "error", message: "The selected role is not available for this agency." };
  }

  if (selectedRole.name === "owner" && actorRole.name !== "owner") {
    return { status: "error", message: "Only the owner can create another owner account." };
  }

  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.agencyId, session.agencyId), eq(users.email, normalizedEmail)))
    .limit(1);

  if (existingUser) {
    return { status: "error", message: "A user with this email already exists in this agency." };
  }

  const inviteToken = crypto.randomBytes(32).toString("hex");
  // They will set their real password when they accept the invite
  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);

  await db.insert(users).values({
    agencyId: session.agencyId,
    roleId: selectedRole.id,
    name,
    email: normalizedEmail,
    passwordHash,
    status: "invited",
    inviteToken,
  });

  revalidatePath("/settings");

  return {
    status: "success",
    message: "User invited successfully. Share this link with them:",
    inviteLink: `/invite?token=${inviteToken}`,
  };
}
