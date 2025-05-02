# Guía de Configuración

## Variables de Entorno

El sistema utiliza las siguientes variables de entorno para su configuración. Estas deben establecerse en el archivo `.env` en la raíz del proyecto.

### Configuración General
- `PORT`: Puerto en el que se ejecutará el servidor (default: 5000)
- `NODE_ENV`: Entorno de ejecución ('development', 'production')
- `LOG_LEVEL`: Nivel de detalle en logs ('debug', 'info', 'warn', 'error')

### Configuración MQTT
- `VITE_MQTT_HOST`: Dirección IP o hostname del broker MQTT (ej: 192.168.0.20)
- `VITE_MQTT_PORT`: Puerto WebSocket del broker MQTT (ej: 9001)
- `VITE_MQTT_USERNAME`: Usuario para autenticación MQTT (opcional)
- `VITE_MQTT_PASSWORD`: Contraseña para autenticación MQTT (opcional)
- `VITE_MQTT_TOPIC_PREFIX`: Prefijo de topics para filtrado (default: zigbee2mqtt/livinglab/)

### Configuración de Almacenamiento
- `STORAGE_PATH`: Ruta para almacenar grabaciones y datos (default: ./data)
- `MAX_STORAGE_GB`: Límite máximo de almacenamiento en GB (default: 100)
- `CLEANUP_INTERVAL`: Intervalo de limpieza automática en días (default: 30)

## Ejemplo de Archivo .env

```
PORT=5000
NODE_ENV=production
LOG_LEVEL=info

VITE_MQTT_HOST=192.168.0.20
VITE_MQTT_PORT=9001
VITE_MQTT_USERNAME=
VITE_MQTT_PASSWORD=
VITE_MQTT_TOPIC_PREFIX=zigbee2mqtt/livinglab/

STORAGE_PATH=./data
MAX_STORAGE_GB=100
CLEANUP_INTERVAL=30
```

## Configuración del Broker MQTT

Para que el sistema funcione correctamente con el broker MQTT, asegúrese de:

1. **Habilitar WebSockets en el broker MQTT**:
   - Mosquitto: Añadir `listener 9001` y `protocol websockets` en mosquitto.conf
   - EMQ X: Activar el plugin de WebSockets en la consola de administración
   - HiveMQ: Activar WebSockets en las opciones de configuración

2. **Configurar permisos adecuados**:
   - Asegurar que el cliente tiene permisos para suscribirse a los topics relevantes
   - Si se usa autenticación, proporcionar las credenciales correctas

3. **Verificar conectividad**:
   - El puerto WebSocket (generalmente 9001) debe estar accesible desde la red
   - Comprobar firewalls o restricciones de red que puedan bloquear la conexión

## Configuración de Cámaras IP

Para una integración exitosa de cámaras IP:

1. **Requisitos de las cámaras**:
   - Soporte para streaming RTSP
   - Opcional: soporte para API HTTP básica

2. **Formato de URL RTSP**:
   - Genérico: `rtsp://username:password@ip-address:port/stream`
   - Hikvision: `rtsp://username:password@ip-address:554/Streaming/Channels/101`
   - Dahua: `rtsp://username:password@ip-address:554/cam/realmonitor?channel=1&subtype=0`
   - Axis: `rtsp://username:password@ip-address:554/axis-media/media.amp`

3. **Verificación de conectividad**:
   - El sistema realiza comprobaciones HTTP básicas
   - Se recomienda que las cámaras tengan una interfaz web accesible

## Optimización del Sistema

Para un rendimiento óptimo:

1. **Gestión de recursos**:
   - CPU: Mínimo 2 núcleos para menos de 10 cámaras
   - RAM: 4GB mínimo, añadir 1GB por cada 5 cámaras adicionales
   - Almacenamiento: SSD recomendado para mejor rendimiento

2. **Configuración de red**:
   - Ancho de banda: Calcular ~2Mbps por cámara a 720p
   - Latencia: Preferiblemente <50ms al broker MQTT
   - Firewall: Permitir tráfico en puertos relevantes (RTSP, MQTT, HTTP)

3. **Escalabilidad**:
   - El sistema está diseñado para soportar entre 6 y 10,000 sensores
   - Para más de 20 cámaras simultáneas, considerar distribuir en múltiples instancias
