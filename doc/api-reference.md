# Referencia de API

## Estructura Base
- Endpoint Base: `/api`
- Formato de respuesta: JSON
- Autenticación: Basada en sesiones

## Endpoints de Cámaras

### GET `/api/cameras`
Obtiene la lista de todas las cámaras configuradas.

**Respuesta:**
```json
[
  {
    "id": "string",
    "name": "string",
    "rtspUrl": "string",
    "username": "string",
    "password": "string",
    "status": "online | offline",
    "createdAt": "timestamp"
  }
]
```

### POST `/api/cameras`
Crea una nueva cámara en el sistema.

**Cuerpo de la solicitud:**
```json
{
  "name": "string",
  "rtspUrl": "string",
  "username": "string",
  "password": "string"
}
```

### GET `/api/cameras/:id`
Obtiene información detallada de una cámara específica.

### PUT `/api/cameras/:id`
Actualiza los datos de una cámara existente.

### DELETE `/api/cameras/:id`
Elimina una cámara del sistema.

## Endpoints de Sensores

### GET `/api/sensors`
Obtiene la lista de todos los sensores MQTT/Zigbee2MQTT.

**Parámetros de consulta:**
- `page`: Número de página (default: 1)
- `limit`: Límite de resultados por página (default: 20)
- `filter`: Filtro por nombre o ID (opcional)

**Respuesta:**
```json
{
  "data": [
    {
      "id": "string",
      "friendly_name": "string",
      "topic": "string",
      "type": "string",
      "lastValue": "any",
      "lastUpdate": "timestamp",
      "status": "online | offline"
    }
  ],
  "pagination": {
    "total": "number",
    "page": "number",
    "limit": "number",
    "pages": "number"
  }
}
```

### GET `/api/sensors/:id`
Obtiene información detallada de un sensor específico.

### PUT `/api/sensors/:id`
Actualiza los datos de un sensor existente.

## Endpoints de Sesiones

### GET `/api/sessions`
Obtiene la lista de todas las sesiones de grabación.

**Respuesta:**
```json
[
  {
    "id": "string",
    "name": "string",
    "description": "string",
    "status": "active | completed",
    "startTime": "timestamp",
    "endTime": "timestamp | null",
    "cameras": ["cameraId1", "cameraId2"],
    "sensors": ["sensorId1", "sensorId2"],
    "recordingsCount": "number",
    "dataSize": "number"
  }
]
```

### POST `/api/sessions`
Crea una nueva sesión de grabación.

**Cuerpo de la solicitud:**
```json
{
  "name": "string",
  "description": "string",
  "cameras": ["cameraId1", "cameraId2"],
  "sensorMetadata": [
    {
      "id": "string",
      "friendly_name": "string",
      "topic": "string",
      "type": "string"
    }
  ]
}
```

**Nota:** Se envía sólo los metadatos de los sensores para evitar problemas con payloads grandes (413 Payload Too Large).

### GET `/api/sessions/:id`
Obtiene información detallada de una sesión específica.

### PUT `/api/sessions/:id/complete`
Marca una sesión como completada.

**Respuesta:**
```json
{
  "id": "string",
  "status": "completed",
  "endTime": "timestamp"
}
```

### GET `/api/sessions/:id/download`
Descarga los datos completos de una sesión en formato ZIP.

**Contenido del ZIP:**
- Grabaciones de cámaras en formato MP4
- Datos de sensores en formato JSON (consolidado e individuales)
- Metadata de la sesión en formato JSON

## Endpoints de Monitoreo en Tiempo Real

### GET `/api/live/cameras/:id`
Establece una conexión WebSocket para streaming de video en tiempo real.

### GET `/api/live/sensors`
Establece una conexión WebSocket para recibir actualizaciones en tiempo real de los sensores.

**Formato de mensajes WebSocket:**
```json
{
  "topic": "string",
  "payload": "any",
  "timestamp": "number"
}
```

## Códigos de Error

- `400`: Bad Request - Datos de entrada inválidos
- `401`: Unauthorized - Autenticación requerida
- `403`: Forbidden - Sin permisos suficientes
- `404`: Not Found - Recurso no encontrado
- `409`: Conflict - Conflicto con recursos existentes (ej: cámara duplicada)
- `413`: Payload Too Large - Cuerpo de la solicitud demasiado grande
- `500`: Internal Server Error - Error interno del servidor
- `503`: Service Unavailable - Servicio no disponible temporalmente
