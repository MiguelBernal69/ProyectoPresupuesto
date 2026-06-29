import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RolUsuario } from "@prisma/client";
import type { SessionUser } from "@/lib/auth/login";

const SESSION_COOKIE = "presupuesto_session";
const ONE_DAY_SECONDS = 60 * 60 * 24;

function getSessionSecret() {
  return process.env.SESSION_SECRET ?? "dev-secret-change-me";
}

function encodeBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string) {
  return createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");
}

export async function createSession(user: SessionUser) {
  const payload = encodeBase64Url(
    JSON.stringify({
      ...user,
      exp: Math.floor(Date.now() / 1000) + ONE_DAY_SECONDS,
    }),
  );
  const signature = sign(payload);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, `${payload}.${signature}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_DAY_SECONDS,
    path: "/",
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = sign(payload);
  const current = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (current.length !== expected.length || !timingSafeEqual(current, expected)) {
    return null;
  }

  try {
    const session = JSON.parse(decodeBase64Url(payload)) as SessionUser & {
      exp: number;
    };

    if (session.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      id: session.id,
      username: session.username,
      nombreCompleto: session.nombreCompleto,
      rol: session.rol,
      unidadId: session.unidadId,
    };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireRole(rol: RolUsuario) {
  const user = await requireUser();

  if (user.rol !== rol) {
    redirect(user.rol === "ADMIN" ? "/admin" : "/unidad");
  }

  return user;
}

export function getHomePathByRole(rol: RolUsuario) {
  return rol === "ADMIN" ? "/admin" : "/unidad";
}
