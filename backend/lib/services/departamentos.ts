import { hashPassword } from "@/lib/auth/password";
import prisma from "@/lib/db";

export type CrearDepartamentoInput = {
  nombre: string;
  username: string;
  password?: string;
  nombreUsuario: string;
};

export async function crearDepartamento(input: CrearDepartamentoInput) {
  if (!input.nombre || !input.username || !input.password || !input.nombreUsuario) {
    throw new Error("Todos los campos son obligatorios");
  }

  const existingDept = await prisma.departamento.findUnique({
    where: { nombre: input.nombre },
  });

  if (existingDept) {
    throw new Error("Ya existe un departamento con ese nombre");
  }

  const existingUser = await prisma.user.findUnique({
    where: { username: input.username },
  });

  if (existingUser) {
    throw new Error("El nombre de usuario ya está en uso");
  }

  const passwordHash = await hashPassword(input.password);

  return prisma.$transaction(async (tx) => {
    const departamento = await tx.departamento.create({
      data: {
        nombre: input.nombre,
      },
    });

    const user = await tx.user.create({
      data: {
        username: input.username,
        passwordHash,
        nombreCompleto: input.nombreUsuario,
        rol: "DEPARTAMENTO",
        departamentoId: departamento.id,
      },
    });

    return { departamento, user };
  });
}

export type EditarDepartamentoInput = {
  departamentoId: number;
  nombre: string;
  username: string;
  password?: string;
  nombreUsuario: string;
};

export async function editarDepartamento(input: EditarDepartamentoInput) {
  if (!input.nombre || !input.username || !input.nombreUsuario) {
    throw new Error("Nombre, usuario y responsable son obligatorios");
  }

  const departamento = await prisma.departamento.findUnique({
    where: { id: input.departamentoId },
    include: { usuarios: true },
  });

  if (!departamento) {
    throw new Error("Departamento no encontrado");
  }

  const existingDept = await prisma.departamento.findFirst({
    where: { nombre: input.nombre, id: { not: input.departamentoId } },
  });

  if (existingDept) {
    throw new Error("Ya existe otro departamento con ese nombre");
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      username: input.username,
      id: { not: (departamento as any).usuarios?.id },
    },
  });

  if (existingUser) {
    throw new Error("El nombre de usuario ya está en uso");
  }

  return prisma.$transaction(async (tx) => {
    await tx.departamento.update({
      where: { id: input.departamentoId },
      data: { nombre: input.nombre },
    });

    const userData: any = {
      username: input.username,
      nombreCompleto: input.nombreUsuario,
    };

    if (input.password) {
      userData.passwordHash = await hashPassword(input.password);
    }

    if ((departamento as any).usuarios) {
      await tx.user.update({
        where: { id: (departamento as any).usuarios.id },
        data: userData,
      });
    } else {
      if (!input.password) throw new Error("Debe proveer contraseña para nuevo usuario");
      await tx.user.create({
        data: {
          ...userData,
          rol: "DEPARTAMENTO",
          departamentoId: input.departamentoId,
          passwordHash: await hashPassword(input.password),
        },
      });
    }
  });
}

export async function toggleActivaDepartamento(departamentoId: number) {
  const dept = await prisma.departamento.findUnique({
    where: { id: departamentoId },
  });

  if (!dept) throw new Error("Departamento no encontrado");

  return prisma.departamento.update({
    where: { id: departamentoId },
    data: { activa: !dept.activa },
  });
}
