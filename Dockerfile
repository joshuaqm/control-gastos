# Etapa de desarrollo (backend + frontend comparten imagen con todas las dependencias)
FROM node:22-alpine AS development

WORKDIR /app

# Dependencias del sistema
RUN apk add --no-cache python3 make g++ postgresql-client

# Copiar package.json y lockfile
COPY package.json pnpm-lock.yaml ./

# Instalar dependencias
RUN pnpm install --no-frozen-lockfile

# Copiar código fuente
COPY . .

# Compilar TypeScript del backend (para la etapa de producción)
RUN pnpm run build:backend

# Exponer puertos
EXPOSE 8000 3000 5173 8443

# Etapa de producción (backend)
FROM node:22-alpine AS production

WORKDIR /app

# Dependencias del sistema
RUN apk add --no-cache postgresql-client

# Copiar package.json y lockfile
COPY package.json pnpm-lock.yaml ./

# Instalar solo dependencias de producción
RUN pnpm install --prod --no-frozen-lockfile

# Copiar código compilado desde etapa de desarrollo
COPY --from=development /app/backend/dist ./backend/dist
COPY --from=development /app/backend/src ./backend/src

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 8000

CMD ["node", "backend/dist/index.js"]
