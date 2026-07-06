# Arquitectura del Proyecto de Presupuestos (Next.js + PostgreSQL crudo)

Al dejar de usar Prisma y pasar a usar consultas SQL puras con `pg`, es fundamental **separar tus consultas SQL de tus rutas HTTP**. Si mezclas todo en un solo archivo, el código se volverá muy difícil de mantener.

Aquí tienes la estructura recomendada para tu proyecto.

```text
backend/
├── app/                      # 🌐 Capa de Rutas y API (Next.js App Router)
│   ├── api/                  # Endpoints de tu servidor
│   │   ├── auth/             # Rutas: login, logout, verificar token
│   │   ├── presupuestos/     # Rutas: GET /api/presupuestos, POST /api/presupuestos
│   │   ├── unidades/         # Rutas para gestionar las Unidades
│   │   └── gestiones/        # Rutas para gestionar las Gestiones
│   ├── layout.tsx            # (Si usas React aquí) Layout principal
│   └── page.tsx              # (Si usas React aquí) Página de inicio
│
├── models/                   # 💾 Capa de Acceso a Datos (Data Access Layer)
│   ├── unidad.model.ts       # Todo el SQL relacionado a la tabla "Unidad"
│   ├── gestion.model.ts      # Todo el SQL relacionado a la tabla "Gestion"
│   ├── item.model.ts         # Todo el SQL relacionado a la tabla "Item"
│   └── usuario.model.ts      # Todo el SQL relacionado a la tabla "UsuarioAdmin"
│
├── lib/                      # 🛠️ Utilidades e Instancias Centrales
│   └── db.ts                 # Instancia de Pool de 'pg' (El que ya creaste)
│
├── types/                    # 🏷️ Interfaces de TypeScript (Tipado)
│   └── index.d.ts            # Interfaces como `Unidad`, `Gestion`, `DetallePresupuesto`
│
├── middleware.ts             # 🛡️ Seguridad y Protección de Rutas (Interceptar peticiones)
└── schema.sql                # 📜 Tu respaldo de la estructura de la BD
```

---

## ¿Qué tiene que tener cada parte?

### 1. `app/api/...` (Tus Controladores / Rutas)
**Responsabilidad:** Recibir la petición HTTP (GET, POST), extraer los datos del cuerpo (body) o la URL, llamar a los Modelos para obtener/guardar datos, y devolver una respuesta JSON.
**Lo que NO debe tener:** Consultas SQL crudas (`SELECT * FROM...`).
**Ejemplo de lo que habría en `app/api/unidades/route.ts`:**
```typescript
import { NextResponse } from 'next/server';
import { UnidadModel } from '@/models/unidad.model';

export async function GET() {
  try {
    const unidades = await UnidadModel.obtenerTodas();
    return NextResponse.json(unidades);
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
```

### 2. `models/` (Tus Modelos de Datos)
**Responsabilidad:** Es el **único lugar** donde escribirás código SQL (`SELECT`, `INSERT`, `UPDATE`, `DELETE`). Aquí importas la conexión `pool` que creaste en `lib/db.ts`.
**Ejemplo de lo que habría en `models/unidad.model.ts`:**
```typescript
import pool from '@/lib/db';
import type { Unidad } from '@/types';

export const UnidadModel = {
  obtenerTodas: async (): Promise<Unidad[]> => {
    const resultado = await pool.query('SELECT * FROM "Unidad" ORDER BY "codigo"');
    return resultado.rows;
  },
  
  crear: async (nombre: string, codigo: string) => {
    const texto = 'INSERT INTO "Unidad"(nombre, codigo) VALUES($1, $2) RETURNING *';
    const valores = [nombre, codigo];
    const resultado = await pool.query(texto, valores);
    return resultado.rows[0];
  }
}
```

### 3. `types/` (Tipos de TypeScript)
**Responsabilidad:** Como ya no tienes a Prisma para que adivine los tipos por ti, aquí escribes cómo lucen tus tablas para que TypeScript te ayude con el autocompletado y evitar errores de escritura.
**Ejemplo de lo que habría en `types/index.d.ts`:**
```typescript
export interface Unidad {
  id: number;
  nombre: string;
  codigo: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 4. `middleware.ts`
**Responsabilidad:** Validar si un usuario está logueado ANTES de que siquiera llegue a la carpeta `app/api/`. Por ejemplo, verificar que en las cabeceras de la petición venga un token JWT válido (usando la librería `jsonwebtoken` que vi en tu `package.json`). Si no tiene token, lo rechazas con un error 401.

---

### ¿Por qué esta arquitectura?
El **Patrón Modelo-Controlador (Separación de Capas)** te salva la vida:
Si mañana decides cambiar una columna de tu base de datos, solo vas al archivo dentro de `models/` y lo cambias ahí. No tienes que andar buscando en los 20 archivos de rutas dentro de `app/api/` dónde está el SQL escrito. 

Esta estructura mantiene tu proyecto ordenado, escalable y profesional.
