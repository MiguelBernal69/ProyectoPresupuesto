"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession, getHomePathByRole } from "@/lib/auth/session";
import { validateLogin } from "@/lib/auth/login";

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    redirect("/login?error=missing");
  }

  const user = await validateLogin(username, password);

  if (!user) {
    redirect("/login?error=invalid");
  }

  await createSession(user);
  redirect(getHomePathByRole(user.rol));
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
