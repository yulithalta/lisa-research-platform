# LISA System Database Configuration

## Arquitectura Distribuida (v3.0.0) - Abril 2025

Este directorio contiene archivos de configuración para la infraestructura distribuida del sistema LISA, utilizando PostgreSQL y Redis con Docker Swarm en servidores separados.

## Descripción General de la Arquitectura

El sistema LISA versión 3.0.0 implementa una arquitectura distribuida con dos servidores principales:

- **Servidor de Aplicación Web (192.168.0.20)**: Aloja la aplicación Node.js, el servidor MQTT y el proxy Nginx
- **Servidor de Base de Datos (192.168.0.21)**: Aloja PostgreSQL, Redis y el servicio de respaldo

Esta separación proporciona:

- **Alta Disponibilidad**: Distribución de cargas para mayor confiabilidad
- **Escalabilidad Mejorada**: La arquitectura puede soportar más de 10,000 sensores y cámaras
- **Seguridad Reforzada**: Aislamiento de la capa de datos en una red separada
- **Mejor Rendimiento**: Recursos dedicados para la base de datos y aplicación
- **Cumplimiento GDPR**: Implementación completa de características para cumplimiento normativo

### Roles de los Componentes de Base de Datos

La arquitectura utiliza dos tecnologías complementarias para el manejo de datos:

#### PostgreSQL
- **Almacenamiento persistente primario** para todos los datos del sistema
- Almacenamiento relacional para usuarios, cámaras, sensores, sesiones y configuraciones
- Repositorio histórico de lecturas de sensores (con capacidad para mantener datos hasta por 3 meses)
- Soporte para consultas complejas y relaciones entre entidades
- Almacenamiento estructurado para cumplimiento GDPR y auditoría

#### Redis
- **Sistema de caché y buffer de alta velocidad**
- Gestión de sesiones de usuario y tokens de autenticación
- Buffer en memoria para lecturas recientes de sensores antes de persistirlas en PostgreSQL
- Caché para consultas frecuentes y datos de tiempo real
- Mensajería entre componentes del sistema mediante pub/sub
- Almacenamiento temporal para datos de alto rendimiento

Esta combinación permite que el sistema maneje eficientemente tanto los datos en tiempo real (Redis) como el almacenamiento a largo plazo (PostgreSQL), creando una solución robusta capaz de soportar la diversidad de sensores requerida para entornos de investigación clínica.

## Contenido del Directorio

- `schema.sql`: Esquema de base de datos PostgreSQL con tablas y relaciones (actualizado para GDPR v3.0.0)
- `migration.js`: Script para migrar datos desde archivos JSON a PostgreSQL
- `backup.js`: Script para crear copias de seguridad regulares
- `db-storage.js`: Implementación de la interfaz de almacenamiento usando PostgreSQL
- `Dockerfile`: Configuración Docker para la aplicación LISA
- `docker-compose.yml`: Configuración Docker Compose para toda la infraestructura distribuida
- `.env.example`: Configuración de entorno de ejemplo (copiar a `.env` y personalizar)

## Instrucciones de Implementación

### Requisitos Previos

- Docker y Docker Swarm instalados en ambos servidores
- Conectividad de red entre los servidores 192.168.0.20 y 192.168.0.21
- Node.js 18+ (para desarrollo y ejecución de scripts de migración)
- Git (para control de versiones)

### Pasos de Instalación

1. **Preparación de Ambos Servidores**:
   
   En ambos servidores:
   ```bash
   # Inicia Docker Swarm en el servidor principal (solo una vez)
   docker swarm init --advertise-addr 192.168.0.20
   
   # Obtén el token para unir nodos
   docker swarm join-token manager
   ```
   
   En el servidor de base de datos:
   ```bash
   # Unir al swarm como manager
   docker swarm join --token <token> 192.168.0.20:2377
   ```

2. **Etiquetado de Nodos**:
   
   En el servidor principal:
   ```bash
   # Etiquetar el nodo de aplicación
   docker node update --label-add role=app-server $(hostname)
   
   # Etiquetar el nodo de base de datos
   docker node update --label-add role=db-server <hostname-db-server>
   ```

3. **Crear Archivo de Entorno**:
   ```bash
   cp .env.example .env
   ```
   Edita el archivo `.env` y configura contraseñas seguras y valores de configuración.

4. **Creación de Directorios para Volúmenes**:
   
   En el servidor de aplicación (192.168.0.20):
   ```bash
   mkdir -p /app/recordings /app/media
   chmod -R 777 /app
   ```
   
   En el servidor de base de datos (192.168.0.21):
   ```bash
   mkdir -p /db/postgres /db/redis /db/backups
   chmod -R 777 /db
   ```

5. **Despliegue del Stack**:
   
   Desde el servidor de aplicación:
   ```bash
   docker stack deploy -c docker-compose.yml lisa
   ```

6. **Verificar Instalación**:
   ```bash
   docker stack ps lisa
   ```
   Todos los servicios deben estar en estado "running".

7. **Configurar la Comunicación Entre Contenedores**:
   ```bash
   # Crear red overlay para comunicación entre servidores
   docker network create --driver overlay --attachable lisa-external-network
   ```

## Esquema de Base de Datos

El sistema utiliza las siguientes tablas principales:

- `users`: Cuentas de usuario y autenticación
- `cameras`: Configuraciones de cámaras IP
- `sensors`: Configuraciones de sensores MQTT/Zigbee
- `sessions`: Datos de sesiones de grabación
- `session_cameras`: Relación entre sesiones y cámaras (muchos a muchos)
- `session_sensors`: Relación entre sesiones y sensores (muchos a muchos)
- `sensor_readings`: Datos de lecturas de sensores
- `system_logs`: Registros de la aplicación

### Tablas GDPR (nuevas en v3.0.0)

- `consent_forms`: Formularios de consentimiento y sus versiones
- `user_consents`: Consentimientos de usuarios registrados
- `access_logs`: Registro de acceso a datos personales
- `data_deletion_requests`: Solicitudes de eliminación de datos
- `data_export_requests`: Solicitudes de exportación de datos
- `gdpr_settings`: Configuraciones relacionadas con GDPR

Ver `schema.sql` para la definición completa del esquema.

## Copias de Seguridad y Recuperación

Las copias de seguridad se realizan diariamente y se almacenan en el directorio `/db/backups` en el servidor de base de datos.

### Copia de Seguridad Manual

Para crear una copia de seguridad manual:

```bash
docker exec lisa_backup.1 node /app/config/database/backup.js
```

### Restaurar desde Copia de Seguridad

Para restaurar desde una copia de seguridad:

1. Detener la aplicación:
   ```bash
   docker service scale lisa_lisa-app=0
   ```

2. Restaurar la base de datos:
   ```bash
   gunzip -c /db/backups/lisa-db-backup-YYYY-MM-DD.sql.gz | docker exec -i lisa_postgres.1 psql -U lisa -d lisa
   ```

3. Reiniciar la aplicación:
   ```bash
   docker service scale lisa_lisa-app=2
   ```

## Solución de Problemas

### Problemas Comunes

1. **Errores de Conexión a Base de Datos**:
   - Verificar que el contenedor PostgreSQL está ejecutándose
   - Comprobar credenciales de base de datos en `.env`
   - Asegurar conectividad de red entre los servidores

2. **Problemas de Conexión Redis**:
   - Verificar estado del contenedor Redis
   - Comprobar contraseña de Redis en `.env`
   - Verificar conectividad de red

3. **Errores de Migración**:
   - Asegurar que el esquema de base de datos está aplicado antes de la migración
   - Verificar que los archivos JSON existen y son válidos
   - Buscar mensajes de error específicos en los logs

### Visualización de Logs

Para ver los logs de los contenedores:

```bash
# Ver logs de la aplicación
docker service logs lisa_lisa-app

# Ver logs de la base de datos
docker service logs lisa_postgres

# Ver logs de Redis
docker service logs lisa_redis
```

## Consideraciones de Rendimiento

Para un rendimiento óptimo:

- Usar almacenamiento SSD para el volumen de datos PostgreSQL
- Asignar memoria suficiente a PostgreSQL (al menos 2GB, recomendado 32GB para producción)
- Considerar aumentar shared_buffers en la configuración de PostgreSQL
- Monitorizar el uso de disco y configurar alertas para poco espacio en disco
- Configurar operaciones regulares de vacuum y analyze en PostgreSQL

### Optimizaciones para Alta Densidad de Sensores

El sistema está diseñado para soportar múltiples tipos de sensores de alta frecuencia (plantillas de presión, sensores biométricos, cámaras infrarrojas, ambientales, etc.) y debe permitir análisis de datos históricos de hasta 3 meses.

Para casos de uso avanzados con alta densidad de sensores, consulte el documento:
[OPTIMIZACION_SENSORES.md](./OPTIMIZACION_SENSORES.md)

Este documento detalla:
- Particionamiento de tablas PostgreSQL por tiempo
- Uso efectivo de Redis como buffer y caché
- Estrategias de sincronización eficiente
- Optimizaciones para consultas y exportaciones
- Configuraciones recomendadas para servidores de alta carga

## Consideraciones de Seguridad

Para mejorar la seguridad:

- Usar contraseñas fuertes en el archivo `.env`
- Restringir el acceso de red a PostgreSQL y Redis
- Actualizar regularmente las imágenes Docker
- Habilitar TLS para todas las conexiones en producción
- Configurar roles y permisos adecuados en PostgreSQL

## Configuración de Firewall

Configure las siguientes reglas de firewall para proteger su infraestructura:

### Servidor de Aplicación (192.168.0.20)
- Permitir entrada: 80/tcp, 443/tcp (HTTP/HTTPS)
- Permitir entrada: 1883/tcp, 8883/tcp (MQTT)
- Permitir entrada desde 192.168.0.21 (servidor DB)
- Permitir salida a 192.168.0.21:5432/tcp (PostgreSQL)
- Permitir salida a 192.168.0.21:6379/tcp (Redis)

### Servidor de Base de Datos (192.168.0.21)
- Permitir entrada desde 192.168.0.20:5432/tcp (PostgreSQL)
- Permitir entrada desde 192.168.0.20:6379/tcp (Redis)
- Bloquear resto de conexiones entrantes