FROM node:20-alpine AS base

# Dependencias base
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Instalar dependencias
RUN npm ci

# Construcción
FROM base AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Deshabilitar telemetría
ENV NEXT_TELEMETRY_DISABLED=1

# Proveer una URL de BD falsa solo para que Prisma pueda compilar el cliente sin llorar
ENV DATABASE_URL="postgresql://fake_user:fake_password@localhost:5432/fake_db"

# Generar cliente de Prisma y construir la app
RUN npx prisma generate
RUN npm run build

# Imagen de producción
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar archivos públicos y prisma (necesario si quieres correr migraciones desde el contenedor)
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# Copiar archivos generados por el modo standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Crear directorio de datos (si suben archivos localmente, útil montar volumen aquí)
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Iniciar la aplicación
CMD ["node", "server.js"]
