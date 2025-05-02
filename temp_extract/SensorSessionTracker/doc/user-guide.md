# Guía de Usuario

## Inicio
1. **Registro/Login**
   - Crear cuenta nueva o iniciar sesión
   - Las credenciales son requeridas para acceder al sistema

2. **Dashboard Principal**
   - Vista general de cámaras y sensores conectados
   - Estado de grabaciones actuales
   - Métricas de rendimiento
   - Acceso rápido a funcionalidades principales

## Gestión de Dispositivos
1. **Gestión de Sensores** (Pestaña principal)
   - Visualización de sensores MQTT/Zigbee2MQTT disponibles
   - Agregar, editar o eliminar sensores
   - Configuración de nombres amigables y ubicaciones
   - Verificación de estado de conexión con indicadores visuales

2. **Gestión de Cámaras** (Pestaña secundaria)
   - Agregar cámaras con datos de conexión RTSP
   - Configurar credenciales y parámetros
   - Verificar estado de conexión mediante HTTP
   - Editar propiedades de cámaras existentes

## Live Monitoring
1. **Monitoreo de Sensores** (Pestaña principal)
   - Visualización en tiempo real de datos de sensores
   - Indicadores visuales de estado y valores
   - Gráficos de tendencias y valores históricos
   - Actualización automática mediante WebSockets

2. **Monitoreo de Cámaras** (Pestaña secundaria)
   - Vista en tiempo real de todas las cámaras
   - Indicadores de estado y rendimiento
   - Controles de visualización y zoom

## Grabaciones y Sesiones
1. **Crear Nueva Sesión**
   - Seleccionar cámaras mediante checklist
   - Seleccionar sensores MQTT/Zigbee2MQTT mediante checklist
   - Configurar nombre y descripción de la sesión
   - Iniciar grabación sincronizada

2. **Gestión de Sesiones**
   - Lista de sesiones actuales y completadas con indicadores visuales
   - Iniciar/Detener grabaciones mediante botones específicos
   - Marcar sesiones como completadas
   - Descargar datos completos en formato ZIP (grabaciones + datos de sensores)

3. **Visualización de Sesiones**
   - Reproducción de grabaciones
   - Visualización de datos de sensores capturados
   - Exportación de datos para análisis

## Características Importantes
- Las grabaciones continúan incluso si cambia de pestaña en el navegador
- La captura de datos MQTT incluye topics específicos y personalizados
- El sistema está optimizado para gestionar entre 6 y 10,000 sensores
- Los bloques informativos proporcionan retroalimentación clara sobre el estado del sistema
