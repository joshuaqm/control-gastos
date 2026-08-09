# Etapa de desarrollo
FROM node:20-alpine AS development

WORKDIR /app

# Instalar dependencias del sistema necesarias
RUN apk add --no-cache python3 make g++ postgresql-client

# Copiar package.json y package-lock.json
COPY package*.json ./

# CAMBIO: Usar npm install en lugar de npm ci para desarrollo
RUN npm install

# Copiar código fuente
COPY . .

# Compilar TypeScript
RUN npm run build

# Exponer puerto
EXPOSE 8000

# Etapa de producción
FROM node:20-alpine AS production

WORKDIR /app

# Instalar dependencias del sistema
RUN apk add --no-cache postgresql-client

# Copiar package.json y package-lock.json
COPY package*.json ./

# CAMBIO: Usar npm install --only=production
RUN npm install --only=production

# Copiar código compilado desde etapa de desarrollo
COPY --from=development /app/dist ./dist
COPY --from=development /app/node_modules ./node_modules

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 8000

CMD ["node", "dist/index.js"]