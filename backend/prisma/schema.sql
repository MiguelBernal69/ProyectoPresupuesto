-- Tabla: Unidad
CREATE TABLE "Unidad" (
  "id" SERIAL PRIMARY KEY,
  "nombre" VARCHAR(255) UNIQUE NOT NULL,
  "usuario" VARCHAR(255) UNIQUE NOT NULL,
  "passwordHash" VARCHAR(255) NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: Gestion
CREATE TABLE "Gestion" (
  "id" SERIAL PRIMARY KEY,
  "anio" INT UNIQUE NOT NULL,
  "estado" VARCHAR(50) DEFAULT 'abierta',
  "fechaCierre" TIMESTAMP NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: TopeUnidad
CREATE TABLE "TopeUnidad" (
  "id" SERIAL PRIMARY KEY,
  "unidadId" INT NOT NULL,
  "gestionId" INT NOT NULL,
  "montoTope" NUMERIC(12, 2) NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("unidadId") REFERENCES "Unidad"("id") ON DELETE CASCADE,
  FOREIGN KEY ("gestionId") REFERENCES "Gestion"("id") ON DELETE CASCADE,
  UNIQUE ("unidadId", "gestionId")
);

-- Tabla: Objeto
CREATE TABLE "Objeto" (
  "codigo" VARCHAR(50) PRIMARY KEY,
  "descripcion" VARCHAR(255) NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: Item
CREATE TABLE "Item" (
  "codigo" VARCHAR(50) PRIMARY KEY,
  "nombre" TEXT NOT NULL,
  "objetoCodigo" VARCHAR(50) NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("objetoCodigo") REFERENCES "Objeto"("codigo") ON DELETE CASCADE
);

CREATE INDEX idx_item_objeto ON "Item"("objetoCodigo");

-- Tabla: DetallePresupuesto
CREATE TABLE "DetallePresupuesto" (
  "id" SERIAL PRIMARY KEY,
  "unidadId" INT NOT NULL,
  "gestionId" INT NOT NULL,
  "itemCodigo" VARCHAR(50) NOT NULL,
  "cantidad" NUMERIC(10, 2) NOT NULL,
  "precioUnitario" NUMERIC(12, 2) NOT NULL,
  "subtotal" NUMERIC(14, 2) NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("unidadId") REFERENCES "Unidad"("id") ON DELETE CASCADE,
  FOREIGN KEY ("gestionId") REFERENCES "Gestion"("id") ON DELETE CASCADE,
  FOREIGN KEY ("itemCodigo") REFERENCES "Item"("codigo") ON DELETE RESTRICT,
  UNIQUE ("unidadId", "gestionId", "itemCodigo")
);

CREATE INDEX idx_detalle_unidad_gestion ON "DetallePresupuesto"("unidadId", "gestionId");

-- Tabla: UsuarioAdmin
CREATE TABLE "UsuarioAdmin" (
  "id" SERIAL PRIMARY KEY,
  "email" VARCHAR(255) UNIQUE NOT NULL,
  "passwordHash" VARCHAR(255) NOT NULL,
  "nombreCompleto" VARCHAR(255) NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);