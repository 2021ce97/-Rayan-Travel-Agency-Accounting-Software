"use server";

import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export async function requestPasswordReset(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;

  if (!email) {
    return { status: "error", message: "Email is required." };
  }

  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, email),
  });

  if (!user) {
    // Return success anyway to prevent email enumeration
    return { status: "success", message: "If an account with that email exists, a reset link has been generated." };
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenExpiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour from now

  await db.update(users)
    .set({
      resetToken,
      resetTokenExpiresAt,
    })
    .where(eq(users.id, user.id));

  // In a real app, you would send an email here with the link:
  // `https://domain.com/reset-password?token=${resetToken}`
  
  // For this implementation, we will just return the token in the success message so the admin can copy it.
  return { 
    status: "success", 
    message: "Reset link generated successfully.", 
    resetLink: `/reset-password?token=${resetToken}` 
  };
}

export async function resetPassword(prevState: any, formData: FormData) {
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!token || !password || password !== confirmPassword) {
    return { status: "error", message: "Invalid input or passwords do not match." };
  }

  const user = await db.query.users.findFirst({
    where: (users, { eq, and, gt }) => and(
      eq(users.resetToken, token),
      gt(users.resetTokenExpiresAt, new Date())
    ),
  });

  if (!user) {
    return { status: "error", message: "Invalid or expired reset token." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await db.update(users)
    .set({
      passwordHash,
      resetToken: null,
      resetTokenExpiresAt: null,
    })
    .where(eq(users.id, user.id));

  return { status: "success", message: "Password has been reset successfully. You can now log in." };
}
