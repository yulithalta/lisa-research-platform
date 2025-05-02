# Preguntas Frecuentes (FAQ)

## Generales

### ¿Qué es EnterpriseWorkflow?
EnterpriseWorkflow es un sistema avanzado para la gestión de grabaciones sincronizadas de cámaras IP y captura de datos de sensores MQTT/Zigbee2MQTT. Está diseñado para entornos profesionales que requieren máxima precisión y fiabilidad, como investigación clínica y monitorización en tiempo real.

### ¿Cuáles son los requisitos mínimos del sistema?
- **Hardware**: CPU 2 núcleos, 4GB RAM, 20GB almacenamiento
- **Software**: Navegador moderno (Chrome, Firefox, Edge)
- **Red**: Conectividad a las cámaras IP y al broker MQTT

### ¿Cómo se gestionan las actualizaciones del sistema?
Las actualizaciones son distribuidas por el equipo de desarrollo. La versión actual del sistema puede verse en el pie de página de la aplicación o en el archivo VERSION.md.

## Configuración

### ¿Cómo configuro la conexión al broker MQTT?
Edite el archivo `.env` con los valores adecuados para `VITE_MQTT_HOST` y `VITE_MQTT_PORT`. Si su broker requiere autenticación, incluya también `VITE_MQTT_USERNAME` y `VITE_MQTT_PASSWORD`.

### ¿Por qué no puedo conectar con mi broker MQTT?
Verifique que:
1. El broker tiene habilitado el soporte para WebSockets
2. El puerto WebSocket (generalmente 9001) está abierto y accesible
3. Las credenciales son correctas (si aplica)
4. No hay restricciones de red o firewalls bloqueando la conexión

### ¿Cómo añado una cámara que no está en la lista predeterminada?
En la sección "Gestión de Dispositivos", pestaña "Gestión de Cámaras", use el botón "Agregar Cámara" e introduzca manualmente los detalles de conexión RTSP de su cámara.

## Cámaras y Sensores

### ¿Qué formatos de cámara son compatibles?
Cualquier cámara que proporcione una URL RTSP válida es compatible. El sistema ha sido probado con fabricantes como Hikvision, Dahua, Axis y cámaras genéricas IP.

### ¿El sistema puede detectar automáticamente sensores Zigbee?
Sí, el sistema se suscribe automáticamente a los topics relevantes en el broker MQTT y detecta los dispositivos Zigbee registrados a través de Zigbee2MQTT.

### ¿Puedo añadir sensores con topics personalizados?
Sí, el sistema permite suscribirse a topics adicionales más allá de los predeterminados. Esto puede configurarse en la sección de "Gestión de Sensores".

### ¿Cuántos sensores puedo monitorizar simultáneamente?
El sistema está diseñado para escalar desde 6 hasta 10,000 sensores sin degradación significativa del rendimiento.

## Grabaciones y Sesiones

### ¿Qué sucede si cierro el navegador durante una grabación?
La grabación continuará en el servidor mientras la sesión esté activa. Sin embargo, se recomienda mantener el navegador abierto para monitorizar el estado.

### ¿Qué contiene el archivo ZIP de una sesión?
El archivo ZIP incluye:
1. Todas las grabaciones de video en formato MP4
2. Un archivo JSON consolidado con todos los datos de sensores
3. Archivos individuales con datos de sensores como respaldo
4. Metadatos de la sesión

### ¿Cómo soluciono el error "413 Payload Too Large"?
Este error ha sido resuelto en la versión 2.5.16 mediante la optimización del payload de creación de sesiones. Si aún lo experimenta, verifique que está utilizando la última versión del sistema.

### ¿Puedo descargar sólo los datos de sensores sin los videos?
Actualmente, el sistema genera un único archivo ZIP con todos los datos. Una función para descargar selectivamente está planificada para futuras versiones.

## Problemas Comunes

### Los datos de sensores aparecen vacíos en la descarga
Este problema fue resuelto en la versión 2.5.17 implementando un sistema dual de almacenamiento. Asegúrese de estar utilizando la última versión.

### La página de monitoreo muestra "Error de conexión WebSocket"
Verifique:
1. Que el broker MQTT está en funcionamiento
2. Que las variables de entorno `VITE_MQTT_HOST` y `VITE_MQTT_PORT` están correctamente configuradas
3. Que el puerto WebSocket está abierto y accesible desde su red

### Algunas cámaras aparecen como "Sin conexión"
El sistema realiza una verificación básica mediante HTTP. Asegúrese de que:
1. La cámara está encendida y conectada a la red
2. La IP y credenciales son correctas
3. La cámara responde a peticiones HTTP básicas

### El rendimiento se degrada con muchas cámaras
Para optimizar el rendimiento:
1. Ajuste la resolución de las cámaras a valores razonables (720p recomendado)
2. Considere distribuir cámaras en múltiples instancias para grabaciones de gran escala
3. Asegúrese de que el hardware del servidor cumple con los requisitos recomendados
