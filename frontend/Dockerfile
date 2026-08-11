# Etapa de desarrollo
FROM node:20-alpine AS development

WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm ci && chmod +x node_modules/.bin/*

# Copiar código fuente
COPY . .

# Exponer puertos
EXPOSE 3000 5173

# Etapa de construcción
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Etapa de producción
FROM nginx:alpine AS production

COPY --from=builder /public /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]