# Control de Versiones

## Versión Actual:  v3.0.0
-	Gestión de la RGPD incluida

### Historial de Versiones

#### v2.5.18 (4 de Abril, 2025)
- Modificada la interfaz de navegación con sistema de pestañas para "Live Monitoring" y "Gestión de Dispositivos"
- Eliminados submenús de la barra lateral para una navegación más limpia y eficiente
- Invertido el orden de pestañas en secciones para priorizar sensores antes que cámaras

#### v2.5.17 (3 de Abril, 2025)
- Corregido problema con el archivo JSON vacío en descarga de datos de sensores
- Implementado sistema dual de almacenamiento para datos de sensores (archivos individuales + JSON consolidado)
- Mejorado el endpoint de descarga para siempre incluir datos completos de sensores

#### v2.5.16
- Resuelto problema "413 Payload Too Large" al crear sesiones con muchos sensores
- Modificado el endpoint POST /api/sessions para usar sensorMetadata en lugar de sensorData completo

#### v2.5.15
- Implementado patrón Observer combinado con Publish-Subscribe para gestionar sensores de manera escalable
- Añadida paginación para visualización de sensores con control de navegación

#### v2.5.10 - v2.5.14
- Optimizaciones y correcciones en la captura de datos de sensores
- Mejorada la interfaz de selección de dispositivos para sesiones
- Integración mejorada con broker MQTT usando WebSockets

#### v2.5.9
- Añadido sistema para capturar topics personalizados de MQTT/Zigbee
- Extendida la compatibilidad para soportar entre 6 y 10,000 sensores

#### v2.5.8
- Añadido soporte para configuración de MQTT mediante variables de entorno
- Implementada verificación básica de cámaras mediante HTTP

#### v2.5.7
- Mejorada la interfaz con bloques informativos destacados sobre grabación y captura de datos
- Añadido comportamiento para mantener grabaciones activas aunque el usuario cambie de ventana

#### v2.5.6
- Arreglado problema con la selección de sensores MQTT/Zigbee2MQTT
- Implementada validación para evitar duplicación de cámaras con la misma IP o nombre
- Mejorada interfaz de sensores con indicadores visuales de estado
- Optimizada la comunicación WebSocket con sensores

#### v2.5.5
- Añadida visualización de estado con código de colores para las sesiones
- Implementada barra lateral con submenús siempre desplegados 

#### v2.5.4
- Cambiado "Live Now Session" a "Live Monitoring"
- Añadido diálogo de confirmación visual al completar sesiones

#### v2.5.3
- Integración con sensores MQTT/Zigbee2MQTT
- Implementada vista en cuadrícula ajustable para mejorar navegabilidad

#### v2.5.2
- Añadidas notificaciones WebSocket para actualizaciones en tiempo real
- Mejorada la gestión de sesiones

#### v2.5.1
- Implementada descarga de archivos ZIP de sesiones
- Añadida funcionalidad para marcar sesiones como completadas

#### v2.5.0
- Primera versión con gestión completa de sesiones
- Integración de cámaras IP con RTSP
