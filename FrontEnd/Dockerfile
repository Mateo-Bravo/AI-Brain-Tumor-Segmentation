FROM node:22-alpine

WORKDIR /app

# Instalar dependencias del sistema
RUN apk add --no-cache curl

# Configurar npm para mejor rendimiento
RUN npm config set fetch-retry-mintimeout 20000
RUN npm config set fetch-retry-maxtimeout 120000

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar código fuente
COPY . .

# Crear directorio para logs
RUN mkdir -p /app/logs

# Exponer puerto 3000
EXPOSE 3000

# Health check mejorado
HEALTHCHECK --interval=30s --timeout=15s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# Variables de entorno para Vite
ENV VITE_HOST=0.0.0.0
ENV VITE_PORT=3000

# Comando para ejecutar Vite
CMD ["node_modules/.bin/vite", "--host", "0.0.0.0", "--port", "3000"]