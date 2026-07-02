# Guía del proyecto de presupuesto

Este documento explica la estructura general del backend y la lógica principal para que puedas entender dónde modificar cada funcionalidad.

## 1. Estructura general

### Carpeta app/
Contiene las páginas y acciones del sistema. Aquí está la interfaz web y la lógica de cada pantalla.

- app/page.tsx
  - Página inicial del sistema.

- app/login/
  - login/page.tsx: formulario de acceso.
  - login/actions.ts: procesa el inicio y cierre de sesión.

- app/admin/
  - admin/page.tsx: panel principal del administrador.
  - admin/unidades/page.tsx: gestión de unidades y topes.
  - admin/unidades/actions.ts: acciones para crear unidades y actualizar topes.
  - admin/items-obligatorios/page.tsx: página para marcar ítems obligatorios.
  - app/api/admin/items-obligatorios/route.ts: endpoint para guardar los ítems obligatorios.

- app/unidad/
  - unidad/page.tsx: pantalla para que una unidad registre su presupuesto.
  - unidad/actions.ts: acción para agregar un detalle presupuestario.

### Carpeta lib/
Contiene la lógica de negocio y servicios reutilizables.

- lib/db.ts
  - Cliente de Prisma para conectar con la base de datos.

- lib/auth/
  - login.ts: validación del usuario al iniciar sesión.
  - password.ts: encriptación y comparación de contraseñas.
  - session.ts: manejo de sesión y roles.

- lib/services/
  - catalogo.ts: búsqueda de ítems del catálogo.
  - presupuesto.ts: creación de detalles, validaciones de tope e ítems obligatorios.
  - unidades.ts: creación de unidades, usuarios y asignación de topes.
  - usuarios.ts: creación de usuarios desde el backend.

### Carpeta prisma/
Contiene el esquema de base de datos y scripts de carga.

- prisma/schema.prisma
  - Define los modelos de la base de datos: User, Unidad, Gestion, Item, Objeto, DetallePresupuesto, etc.

- prisma/seed.js
  - Crea datos iniciales como usuario administrador y unidad base.

- prisma/import-catalogo.js
  - Importa el archivo Excel con el catálogo de ítems.

- prisma/migrations/
  - Historial de cambios del esquema.

### Carpeta data/
Contiene archivos de importación.

- data/catalogo.xlsx
  - Archivo Excel que se usa para cargar ítems y objetos al sistema.

## 2. Lógica principal del negocio

### Autenticación
- El login valida usuario y contraseña.
- Si es correcto, crea una sesión y redirige según el rol.
- Los roles actuales son ADMIN y UNIDAD.

### Administrador
- Puede ver el resumen general del presupuesto.
- Puede crear unidades nuevas.
- Puede asignar topes presupuestarios por gestión.
- Puede marcar ítems obligatorios para todas las unidades.

### Unidad
- Puede buscar ítems del catálogo.
- Puede agregar detalles al presupuesto.
- El sistema valida:
  - que la gestión esté abierta,
  - que exista un tope para la unidad,
  - que no supere el presupuesto,
  - que cumpla con los ítems obligatorios si los hay.

## 3. Archivos clave y para qué sirven

### app/login/actions.ts
Procesa el login y logout.

Si quieres modificar:
- cómo se autentica un usuario,
- qué pasa tras iniciar sesión,
- los mensajes de error del login.

### app/admin/page.tsx
Página principal del panel administrador.

Si quieres modificar:
- resumen global,
- métricas,
- botones del panel,
- vista de unidades.

### app/admin/unidades/page.tsx
Pantalla para administrar unidades y sus topes.

Si quieres modificar:
- formulario para crear unidad,
- tabla/lista de unidades,
- cómo se visualiza el tope y el disponible.

### app/admin/unidades/actions.ts
Contiene acciones del servidor para crear unidades y actualizar topes.

Si quieres modificar:
- reglas al crear una unidad,
- validaciones adicionales,
- mensajes de error al guardar.

### app/admin/items-obligatorios/page.tsx
Pantalla para seleccionar los ítems que serán obligatorios para la gestión activa.

Si quieres modificar:
- cómo se muestran los ítems,
- filtros de búsqueda,
- diseño visual de la lista.

### app/api/admin/items-obligatorios/route.ts
Endpoint que guarda los ítems obligatorios seleccionados.

Si quieres modificar:
- cómo se guardan,
- qué pasa si no hay selección,
- mensajes de éxito o error.

### app/unidad/page.tsx
Pantalla de la unidad para registrar presupuesto.

Si quieres modificar:
- formulario de búsqueda,
- formulario de carga de detalle,
- tabla de items agregados.

### app/unidad/actions.ts
Acción para agregar un detalle presupuestario.

Si quieres modificar:
- validaciones del lado del servidor,
- redirecciones tras guardar.

### lib/services/presupuesto.ts
Lógica de negocio del presupuesto.

Aquí ocurre lo más importante:
- validación de gestión abierta,
- validación de tope,
- validación de ítems obligatorios,
- creación de un detalle.

Si quieres modificar reglas de negocio, este es uno de los archivos centrales.

### lib/services/unidades.ts
Lógica para crear unidad, usuario y tope.

Si quieres modificar:
- creación automática del usuario responsable,
- reglas al crear una unidad,
- monto inicial del tope.

### lib/services/catalogo.ts
Búsqueda de ítems del catálogo.

Si quieres modificar:
- filtros de búsqueda,
- ordenamiento,
- límite de resultados.

### lib/auth/session.ts
Manejo de sesiones y roles.

Si quieres modificar:
- duración de sesión,
- permisos de acceso,
- rutas de redirección según rol.

### prisma/schema.prisma
Define todos los modelos y relaciones de la base de datos.

Si quieres modificar:
- agregar una nueva tabla,
- cambiar campos,
- crear nuevas relaciones.

### prisma/seed.js
Carga datos iniciales.

Si quieres modificar:
- usuario administrador por defecto,
- unidades base,
- gestión inicial.

### prisma/import-catalogo.js
Importa datos del Excel al sistema.

Si quieres modificar:
- columnas esperadas del Excel,
- lógica de mapeo,
- carga de más datos.

## 4. Flujo típico de una funcionalidad

1. La vista en app/ llama a una acción o servicio.
2. El servicio en lib/services/ realiza la lógica de negocio.
3. Usa Prisma para consultar o guardar en la base de datos.
4. La vista muestra el resultado o redirige a otra página.

Ejemplo:
- El usuario en app/unidad/page.tsx presiona “Agregar item”.
- app/unidad/actions.ts llama a crearDetallePresupuesto.
- lib/services/presupuesto.ts valida el tope y los ítems obligatorios.
- Prisma guarda el detalle en DetallePresupuesto.
- La página vuelve a cargar con el nuevo registro.

## 5. Dónde modificar según lo que quieras hacer

### Si quieres cambiar reglas de presupuesto
- revisar lib/services/presupuesto.ts

### Si quieres agregar una nueva pantalla de admin
- crear una carpeta en app/admin/
- agregar una página en app/admin/nombre/page.tsx

### Si quieres crear una nueva tabla
- modificar prisma/schema.prisma
- generar migración con Prisma

### Si quieres cambiar la forma de autenticarse
- revisar app/login/actions.ts
- revisar lib/auth/session.ts

### Si quieres cambiar cómo se cargan los ítems
- revisar lib/services/catalogo.ts
- revisar prisma/import-catalogo.js

## 6. Recomendación práctica

Cuando quieras arreglar algo, sigue este orden:
1. Identifica la pantalla que ves en la interfaz.
2. Busca el archivo en app/ que la renderiza.
3. Revisa el servicio en lib/services/ que contiene la lógica.
4. Si es una base de datos, revisa prisma/schema.prisma.

## 7. Comandos útiles

- Ejecutar el proyecto:
  ```bash
  npm run dev
  ```

- Generar cliente de Prisma:
  ```bash
  npx prisma generate
  ```

- Crear migración:
  ```bash
  npx prisma migrate dev --name nombre_del_cambio
  ```

- Cargar datos iniciales:
  ```bash
  npm run db:seed
  ```

- Importar catálogo desde Excel:
  ```bash
  npm run import:catalogo
  ```
