# LISA - Changelog

Este archivo documenta los cambios significativos en cada versión del sistema LISA (Living-lab Integrated Sensing Architecture).

## [3.0.0] - 2025-04-10

### Añadido
- Implementación completa de conformidad con RGPD/GDPR
  - Sistema de gestión de consentimientos con versiones y auditoría
  - Registro de accesos a datos para auditoría y cumplimiento
  - Mecanismos de exportación de datos personales (derecho a la portabilidad)
  - Funcionalidad de eliminación de datos (derecho al olvido)
  - Inventario de procesamiento de datos
- Nueva pestaña GDPR en el centro de ayuda
- Documentación técnica detallada sobre la implementación GDPR
- Estructura de directorios para almacenamiento de datos GDPR
- Métodos en la capa de almacenamiento para operaciones GDPR

### Cambiado
- Renombrado "Monitoring System" a "LISA - Living-lab Integrated Sensing Architecture" en Dashboard
- Actualizada versión en barra lateral a "v3.0.0 - GDPR Compliant"
- Mejorada la estructura del código para mayor modularidad y mantenibilidad
- Refactorización de la clase MemStorage para soportar operaciones GDPR

### Corregido
- Reparados problemas en el sistema de almacenamiento de datos
- Mejorado manejo de errores para operaciones fallidas
- Optimizado el proceso de carga de datos al iniciar la aplicación

### Seguridad
- Implementada capa adicional de auditoría para acciones sensibles
- Mejorado el sistema de registro para capturar intentos de acceso no autorizados
- Añadida validación adicional para operaciones de escritura

## [2.5.20] - 2025-03-15

### Añadido
- Soporte para autentificación HTTP en cámaras
- Integración mejorada con sensores Zigbee
- Visualización en tiempo real de datos MQTT
- Exportación de grabaciones en formato ZIP con metadatos
- Nueva página de gestión de dispositivos con estructura por pestañas

### Cambiado
- Reorganización de menú lateral para mejor experiencia de usuario
- Optimización del procesamiento de video para menor consumo de recursos
- Mejora del sistema de búsqueda de sesiones con filtros avanzados

### Corregido
- Solucionado problema de conexión intermitente con cámaras
- Reparados errores en la grabación simultánea de múltiples cámaras
- Optimizada la conexión WebSocket para mayor estabilidad

## [2.0.0] - 2024-12-10

### Añadido
- Implementación completa del sistema de grabación sincronizada
- Soporte para múltiples cámaras IP simultáneas
- Integración con protocolo MQTT para sensores
- Estructura de base de datos para almacenamiento eficiente
- Interfaz de usuario moderna con React y Tailwind CSS
- Gestión básica de usuarios y permisos

### Cambiado
- Arquitectura completamente renovada para mayor escalabilidad
- Nuevo sistema de gestión de sesiones
- Interfaz rediseñada para mejor usabilidad

### Corregido
- Múltiples problemas de estabilidad
- Reducción significativa del uso de recursos

## [1.0.0] - 2024-05-01

### Añadido
- Primera versión del sistema
- Soporte básico para cámaras IP
- Interfaz web simple
- Grabación manual de video
- Sistema básico de usuarios