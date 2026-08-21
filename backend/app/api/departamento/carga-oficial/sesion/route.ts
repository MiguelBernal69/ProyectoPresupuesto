import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { loginSistemaExterno } from "@/lib/automation/pre2027";
import prisma from "@/lib/db";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// ── Cifrado AES-256-GCM para las cookies de sesión externa ───────────────────
// NUNCA se cifra la contraseña aquí — solo las cookies PHP obtenidas post-login

function getEncKey(): Buffer {
  const secret = process.env.SESSION_SECRET ?? "dev-secret-change-me";
  // Derivar 32 bytes desde el SESSION_SECRET usando SHA-256 compatible
  const { createHash } = require("crypto");
  return createHash("sha256").update(secret).digest();
}

function cifrarCookies(cookies: string): string {
  const key = getEncKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(cookies, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function descifrarCookies(cifrado: string): string {
  const key = getEncKey();
  const [ivHex, tagHex, encHex] = cifrado.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(encHex, "hex");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
}

// ── POST /api/departamento/carga-oficial/sesion ───────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("DEPARTAMENTO");

    const body = await req.json();
    const { dirId, userId, password } = body as {
      dirId?: string;
      userId?: string;
      password?: string;
    };

    if (!dirId || !userId || !password) {
      return NextResponse.json(
        { ok: false, error: "DA, Actividad y contraseña son requeridos." },
        { status: 400 }
      );
    }

    // Intentar login en el sistema externo
    // La contraseña nunca se guarda — se descarta inmediatamente tras el login
    const resultado = await loginSistemaExterno(dirId, userId, password);
    // ⚠️ password no se usa más desde aquí

    if (!resultado.ok || !resultado.cookies) {
      return NextResponse.json(
        { ok: false, error: resultado.error ?? "Login fallido." },
        { status: 401 }
      );
    }

    // Cifrar y guardar las cookies de sesión (NO la contraseña)
    const cookiesCifradas = cifrarCookies(resultado.cookies);
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 horas

    await prisma.sesionCargaExterna.upsert({
      where: { usuarioId: user.id },
      update: { cookiescifradas: cookiesCifradas, expiresAt },
      create: { usuarioId: user.id, cookiescifradas: cookiesCifradas, expiresAt },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[sesion] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}

// ── DELETE /api/departamento/carga-oficial/sesion ─────────────────────────────
// Cierra la sesión externa y elimina las cookies guardadas

export async function DELETE() {
  try {
    const user = await requireRole("DEPARTAMENTO");

    await prisma.sesionCargaExterna.deleteMany({
      where: { usuarioId: user.id },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
