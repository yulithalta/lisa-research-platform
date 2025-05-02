# Guía de Instalación y Configuración

## Requisitos Previos
- Node.js 18.x o superior
- ffmpeg instalado en el sistema
- Acceso a cámaras IP con RTSP

## Instalación

1. **Clonar Repositorio**
```bash
git clone <repository-url>
cd camera-management-system
```

2. **Instalar Dependencias**
```bash
npm install
```

3. **Configuración**
- Crear archivo `.env` basado en `.env.example`
- Configurar variables de entorno:
  - `PORT`: Puerto del servidor
  - `SESSION_SECRET`: Secreto para sesiones
  - `STORAGE_PATH`: Ruta para almacenamiento

4. **Iniciar Aplicación**
```bash
npm run dev
```

## Configuración de Cámaras
1. Asegurarse que las cámaras estén en la misma red
2. Obtener credenciales RTSP
3. Configurar en la interfaz de usuario

## Mantenimiento
- Los archivos de grabación se almacenan en `/recordings`
- Los datos de configuración en `/data`
- Logs del sistema en `/logs`
