"use server";

import { db, users } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function acceptInvite(prevState: any, formData: FormData) {
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!token || !password || password !== confirmPassword) {
    return { status: "error", message: "Invalid input or passwords do not match." };
  }

  const user = await db.query.users.findFirst({
    where: (users, { eq, and }) => and(
      eq(users.inviteToken, token),
      eq(users.status, "invited")
    ),
  });

  if (!user) {
    return { status: "error", message: "Invalid or expired invite token." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await db.update(users)
    .set({
      passwordHash,
      inviteToken: null,
      status: "active",
    })
    .where(eq(users.id, user.id));

  revalidatePath("/settings");

  return { status: "success", message: "Account setup successfully. You can now log in." };
}
