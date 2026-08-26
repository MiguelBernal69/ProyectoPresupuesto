const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const nuevoAnio = parseInt(process.argv[2]);

  if (!nuevoAnio || isNaN(nuevoAnio)) {
    console.error("❌ Por favor indica el año de la nueva gestión. Ejemplo: node nueva-gestion.js 2028");
    process.exit(1);
  }

  console.log(`\nCerrando gestiones anteriores y abriendo la gestión ${nuevoAnio}...`);

  // 1. Cerrar todas las gestiones que estén ABIERTAS
  const cerradas = await prisma.gestion.updateMany({
    where: { estado: "ABIERTA" },
    data: {
      estado: "CERRADA",
      fechaCierre: new Date(),
    },
  });
  console.log(`✅ Se cerraron ${cerradas.count} gestión(es) anterior(es).`);

  // 2. Verificar si la nueva gestión ya existe
  const existe = await prisma.gestion.findUnique({
    where: { anio: nuevoAnio }
  });

  if (existe) {
    // Si ya existe, simplemente la marcamos como ABIERTA
    await prisma.gestion.update({
      where: { anio: nuevoAnio },
      data: { estado: "ABIERTA", fechaCierre: null }
    });
    console.log(`✅ La gestión ${nuevoAnio} ya existía y ha sido re-abierta.`);
  } else {
    // Si no existe, la creamos desde cero
    await prisma.gestion.create({
      data: {
        anio: nuevoAnio,
        estado: "ABIERTA",
      }
    });
    console.log(`✅ ¡Gestión ${nuevoAnio} creada y ABIERTA con éxito!`);
  }

  console.log("\n🚀 El sistema ya está operando en la nueva gestión. Ya puedes asignar los nuevos topes presupuestarios a las unidades.");
}

main()
  .catch((e) => {
    console.error("❌ Error al procesar:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
