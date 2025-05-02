# Usar la imagen oficial de Node.js 22 como base
FROM node:22-alpine

# Establecer directorio de trabajo
WORKDIR /app

# Instalar dependencias primero (para aprovechar caché de capas)
COPY package*.json ./
RUN npm ci

# Copiar archivos de la aplicación
COPY . .

# Establecer variables de entorno
ENV NODE_ENV=production
ENV PORT=3002
ENV REACT_APP_MQTT_BROKER_URLS=ws://192.168.0.20:9001,ws://mqtt:9001
ENV REACT_APP_MQTT_TOPICS=zigbee2mqtt/#

# Construir la aplicación
RUN npm run build

# Instalar un servidor ligero para servir la aplicación
RUN npm install -g serve

# Exponer el puerto en el que se ejecutará la aplicación
EXPOSE 3002

# Crear un volumen para persistir datos
VOLUME /app/data

# Comando para iniciar la aplicación en producción
CMD ["serve", "-s", "build", "-l", "3002"]