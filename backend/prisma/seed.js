

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const anioActual = new Date().getFullYear();

  const unidad = await prisma.unidad.upsert({
    where: { nombre: "Unidad Central" },
    update: {},
    create: {
      nombre: "Unidad Central",
      activa: true,
    },
  });

  await prisma.gestion.upsert({
    where: { anio: anioActual },
    update: {},
    create: {
      anio: anioActual,
      estado: "ABIERTA",
    },
  });

  const passwordHash = await bcrypt.hash("admin123", 10);

  const usuario = await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      passwordHash,
      nombreCompleto: "Administrador",
      rol: "ADMIN",
      activo: true,
    },
    create: {
      username: "admin",
      passwordHash,
      nombreCompleto: "Administrador",
      rol: "ADMIN",
      activo: true,
    },
  });

  console.log(`Seed completado. Unidad: ${unidad.nombre}, usuario: ${usuario.username}`);
}

main()
  .catch((error) => {
    console.error("Error al ejecutar el seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
