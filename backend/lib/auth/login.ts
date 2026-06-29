import { RolUsuario } from "@prisma/client";
import prisma from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";

export type SessionUser = {
  id: number;
  username: string;
  nombreCompleto: string;
  rol: RolUsuario;
  unidadId: number | null;
};

export async function validateLogin(
  username: string,
  password: string,
): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      passwordHash: true,
      nombreCompleto: true,
      rol: true,
      activo: true,
      unidadId: true,
    },
  });

  if (!user || !user.activo) {
    return null;
  }

  const isValid = await verifyPassword(password, user.passwordHash);

  if (!isValid) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    nombreCompleto: user.nombreCompleto,
    rol: user.rol,
    unidadId: user.unidadId,
  };
}
