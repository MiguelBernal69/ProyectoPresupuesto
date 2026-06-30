require("dotenv/config");

const path = require("path");
const xlsx = require("xlsx");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const filePath = path.join(process.cwd(), "data", "catalogo.xlsx");

function normalize(value) {
  return String(value ?? "").trim();
}

function pickFirst(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return "";
}

async function main() {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("El archivo Excel no tiene hojas.");
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

  if (!rows.length) {
    throw new Error("La hoja principal esta vacia.");
  }

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const objetoCodigo = normalize(
      pickFirst(row, ["PARTIDA", "OBJETO", "CODIGO_OBJETO", "CODIGO"]),
    );
    const objetoDescripcion = normalize(
      pickFirst(row, [
        "OBJETO DESCRIPCION",
        "DESCRIPCION OBJETO",
        "NOMBRE OBJETO",
        "DESCRIPCION",
      ]),
    );
    const itemCodigo = normalize(pickFirst(row, ["ITEM", "CODIGO_ITEM"]));
    const itemNombre = normalize(
      pickFirst(row, ["NOMBRE", "MOMBRE", "ITEM DESCRIPCION", "DESCRIPCION ITEM"]),
    );

    if (!objetoCodigo || !itemCodigo || !itemNombre) {
      skipped += 1;
      continue;
    }

    await prisma.objeto.upsert({
      where: { codigo: objetoCodigo },
      update: {
        descripcion: objetoDescripcion || objetoCodigo,
      },
      create: {
        codigo: objetoCodigo,
        descripcion: objetoDescripcion || objetoCodigo,
      },
    });

    await prisma.item.upsert({
      where: { codigo: itemCodigo },
      update: {
        nombre: itemNombre,
        objetoCodigo,
      },
      create: {
        codigo: itemCodigo,
        nombre: itemNombre,
        objetoCodigo,
      },
    });

    imported += 1;
  }

  console.log(`Importacion terminada. Importados: ${imported}, omitidos: ${skipped}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
