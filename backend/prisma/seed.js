require("dotenv/config");

const bcrypt = require("bcryptjs");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient, RolUsuario } = require("@prisma/client");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);
  const unidadPasswordHash = await bcrypt.hash("unidad123", 10);

  const gestion = await prisma.gestion.upsert({
    where: { anio: 2026 },
    update: {},
    create: { anio: 2026 },
  });

  const direccionAdministrativa = await prisma.unidad.upsert({
    where: { nombre: "Direccion Administrativa" },
    update: {},
    create: { nombre: "Direccion Administrativa" },
  });

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      passwordHash,
      nombreCompleto: "Secretaria Administrativa",
      rol: RolUsuario.ADMIN,
      unidadId: null,
      activo: true,
    },
    create: {
      username: "admin",
      passwordHash,
      nombreCompleto: "Secretaria Administrativa",
      rol: RolUsuario.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { username: "unidad.admin" },
    update: {
      passwordHash: unidadPasswordHash,
      nombreCompleto: "Usuario Direccion Administrativa",
      rol: RolUsuario.UNIDAD,
      unidadId: direccionAdministrativa.id,
      activo: true,
    },
    create: {
      username: "unidad.admin",
      passwordHash: unidadPasswordHash,
      nombreCompleto: "Usuario Direccion Administrativa",
      rol: RolUsuario.UNIDAD,
      unidadId: direccionAdministrativa.id,
    },
  });

  await prisma.topeUnidad.upsert({
    where: {
      unidadId_gestionId: {
        unidadId: direccionAdministrativa.id,
        gestionId: gestion.id,
      },
    },
    update: { montoTope: "100000.00" },
    create: {
      unidadId: direccionAdministrativa.id,
      gestionId: gestion.id,
      montoTope: "100000.00",
    },
  });

  await prisma.objeto.upsert({
    where: { codigo: "24110" },
    update: {
      descripcion: "Mantenimiento y reparacion de inmuebles",
    },
    create: {
      codigo: "24110",
      descripcion: "Mantenimiento y reparacion de inmuebles",
    },
  });

  await prisma.item.upsert({
    where: { codigo: "15404" },
    update: {
      nombre: "Servicio de mantenimiento y reparacion de oficinas tipo pintado",
      objetoCodigo: "24110",
    },
    create: {
      codigo: "15404",
      nombre: "Servicio de mantenimiento y reparacion de oficinas tipo pintado",
      objetoCodigo: "24110",
    },
  });

  console.log("Seed completado.");
  console.log("Admin: admin / admin123");
  console.log("Unidad: unidad.admin / unidad123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
