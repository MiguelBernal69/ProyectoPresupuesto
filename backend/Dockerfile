FROM node:20-alpine AS base

# ─── STAGE 1: Instalar dependencias ───────────────────────────────────────────
FROM base AS deps
# openssl y libc6-compat son necesarios para los binarios de Prisma en Alpine
RUN apk add --no-cache libc6-compat openssl openssl-dev
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Instalar dependencias exactas del lockfile
RUN npm ci

# ─── STAGE 2: Build ───────────────────────────────────────────────────────────
FROM base AS builder
RUN apk add --no-cache openssl openssl-dev
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# DATABASE_URL se pasa como build arg para que Prisma pueda generar el cliente
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

# Generar cliente de Prisma (usa los binarios para linux-musl-openssl-3.0.x)
RUN npx prisma generate

# Construir la app Next.js en modo standalone
RUN npm run build

# ─── STAGE 3: Runner (imagen de producción) ───────────────────────────────────
FROM base AS runner
# openssl es necesario en runtime para que Prisma funcione en Alpine
RUN apk add --no-cache openssl openssl-dev
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Instalar prisma CLI globalmente para poder correr migraciones desde el contenedor
RUN npm install -g prisma@6.19.3

# Copiar archivos públicos
COPY --from=builder /app/public ./public

# Copiar carpeta prisma (para poder correr migraciones desde el contenedor)
COPY --from=builder /app/prisma ./prisma

# Copiar el build standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Crear directorios de datos
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

# Copiar node_modules de prisma al runner (necesario para migraciones y cliente)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma

# Copiar paquetes requeridos por los scripts de base de datos (seed e import)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/xlsx ./node_modules/xlsx

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
