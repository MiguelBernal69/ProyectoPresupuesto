const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const gestion = await prisma.gestion.findFirst({ where: { estado: "ABIERTA" } });
  console.log("Gestion Activa:", gestion);
}
main().finally(() => prisma.$disconnect());
