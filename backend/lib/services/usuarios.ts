import { RolUsuario } from "@prisma/client";
import prisma from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

type CrearUsuarioInput = {
  username: string;
  password: string;
  nombreCompleto: string;
  rol: RolUsuario;
  unidadId?: number;
};

export async function crearUsuario(input: CrearUsuarioInput) {
  if (input.rol === "UNIDAD" && !input.unidadId) {
    throw new Error("Un usuario de unidad debe estar vinculado a una unidad.");
  }

  if (input.rol === "ADMIN" && input.unidadId) {
    throw new Error("Un usuario administrador no debe estar vinculado a una unidad.");
  }

  const passwordHash = await hashPassword(input.password);

  return prisma.user.create({
    data: {
      username: input.username,
      passwordHash,
      nombreCompleto: input.nombreCompleto,
      rol: input.rol,
      unidadId: input.unidadId,
    },
  });
}
