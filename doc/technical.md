# Documentación Técnica del Sistema EnterpriseWorkflow

*Versión actual: v2.5.18*

## Arquitectura del Sistema

### Frontend (React/TypeScript)
- **React**: Framework principal para UI
- **TypeScript**: Tipado estático
- **shadcn/ui**: Componentes UI
- **TanStack Query**: Gestión de estado y caché
- **WebSocket**: Comunicación en tiempo real
- **MQTT Client**: Comunicación con broker MQTT/Zigbee2MQTT

### Backend (Node.js)
- **Express**: Framework web
- **ffmpeg**: Procesamiento de video
- **WebSocket**: Streaming de video y datos en tiempo real
- **MQTT Client**: Integración con broker MQTT/Zigbee2MQTT
- **JSON Storage**: Persistencia de datos
- **archiver**: Empaquetado de datos y grabaciones

## Componentes Principales

### Sistema de Cámaras
- Gestión de conexiones RTSP
- Streaming en tiempo real
- Grabación y almacenamiento
- Verificación de estado vía HTTP

### Sistema de Sensores
- Conexión a broker MQTT/Zigbee2MQTT
- Suscripción a múltiples topics
- Almacenamiento dual de datos (individual y consolidado)
- Soporte para hasta 10,000 sensores

### Sistema de Sesiones
- Grabación sincronizada de cámaras y sensores
- Generación de paquetes ZIP con datos completos
- Interfaz de configuración con selección por checklist
- Continuidad de grabaciones aunque cambie la pestaña del navegador

### Monitoreo de Rendimiento
- Métricas en tiempo real
- Estadísticas de cámaras y sensores
- Dashboard de rendimiento

## Patrones de Diseño Implementados
- **Observer/Publish-Subscribe**: Para manejo escalable de datos de sensores
- **Component Pattern**: Interfaz modular con pestañas y componentes reusables
- **Repository Pattern**: Abstracción de acceso a datos
- **Factory Pattern**: Creación de instancias para conexiones de cámaras y sensores

## Flujos de Datos
1. **Streaming de Video**
   - Conexión RTSP -> ffmpeg -> WebSocket -> Cliente
   
2. **Captura de Datos de Sensores**
   - MQTT Broker -> MQTT Client -> Sistema dual de almacenamiento -> Cliente
   
3. **Grabación de Sesiones**
   - Cliente -> API -> Sistema de archivos + Almacenamiento JSON
   
4. **Descarga de Sesiones**
   - Cliente -> API -> Archiver (ZIP) -> Cliente
