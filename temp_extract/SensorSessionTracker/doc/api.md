# Documentación de API

## Endpoints

### Autenticación
```
POST /api/login
POST /api/register
POST /api/logout
```

### Cámaras
```
GET /api/cameras
POST /api/cameras
GET /api/cameras/:id
DELETE /api/cameras/:id
```

### Grabaciones
```
GET /api/recordings
POST /api/recordings
GET /api/recordings/:id
DELETE /api/recordings/:id
GET /api/recordings/count
```

### WebSocket
```
WS /ws
- Eventos:
  - camera_stream
  - performance_metrics
  - recording_status
```

## Modelos de Datos

### Camera
```typescript
{
  id: number
  name: string
  ipAddress: string
  port: number
  username: string
  password: string
  status: "online" | "offline"
}
```

### Recording
```typescript
{
  id: number
  cameraId: number
  startTime: string
  endTime: string
  filename: string
  tags: string[]
}
```
