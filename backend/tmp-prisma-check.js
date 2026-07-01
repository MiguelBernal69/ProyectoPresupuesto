const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
console.log('has itemObligatorio:', typeof prisma.itemObligatorio);
prisma.$disconnect();
