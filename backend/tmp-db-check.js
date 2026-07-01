const prisma = require('./lib/db').default;
console.log('typeof itemObligatorio:', typeof prisma.itemObligatorio);
prisma.$disconnect();
