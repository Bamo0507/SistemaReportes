# Imagen pequeña con Alpine
FROM node:20-alpine

# Carpeta de trabajo dentro del contenedor
WORKDIR /app

# Copiamos sólo package.json / package-lock.json para instalar deps primero
COPY package*.json ./

# Instala dependencias en modo producción
RUN npm ci --omit=dev

# Copiamos el resto del código
COPY . .

# Exponemos el puerto que usará la app (opcional, sólo documental)
EXPOSE 3000

# Comando de arranque
CMD ["npm", "start"]