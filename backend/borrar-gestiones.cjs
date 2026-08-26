const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const anios = process.argv.slice(2).map(Number).filter(Boolean);

if (anios.length === 0) {
  console.error("Uso: node borrar-gestiones.cjs 2027 2028");
  process.exit(1);
}

prisma.gestion.deleteMany({ where: { anio: { in: anios } } })
  .then(r => console.log(`✅ Eliminadas ${r.count} gestión(es): ${anios.join(", ")}`))
  .catch(e => { console.error("❌ Error:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());



// # Borrar un solo año
// node borrar-gestiones.cjs 2027
// # Borrar varios años a la vez
// node borrar-gestiones.cjs 2027 2028