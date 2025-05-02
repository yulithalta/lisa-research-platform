# Variables de Entorno para el Stack TICK

Este documento detalla todas las variables de entorno necesarias para configurar correctamente el stack TICK (Telegraf, InfluxDB, Chronograf, Kapacitor) en el entorno de LISA.

## InfluxDB

| Variable | Descripción | Valor por defecto | Requerido |
|----------|-------------|-------------------|-----------|
| `INFLUXDB_USER` | Usuario administrador para InfluxDB | `admin` | No |
| `INFLUXDB_PASSWORD` | Contraseña del usuario administrador | `admin123` | **Sí** (cambiar en producción) |
| `INFLUXDB_ORG` | Nombre de la organización en InfluxDB | `lisaorganization` | No |
| `INFLUXDB_BUCKET` | Nombre del bucket principal para datos | `mqtt_data` | No |
| `INFLUXDB_TOKEN` | Token de autenticación para acceso a API | `lisatokenadmin` | **Sí** (cambiar en producción) |
| `INFLUXDB_RETENTION` | Política de retención para datos | `90d` | No |
| `INFLUXDB_URL` | URL para conexión a InfluxDB | `http://influxdb:8086` | No |

## Telegraf

| Variable | Descripción | Valor por defecto | Requerido |
|----------|-------------|-------------------|-----------|
| `MQTT_HOST` | Dirección IP del broker MQTT | `192.168.0.20` | **Sí** |
| `MQTT_PORT` | Puerto del broker MQTT | `1883` | No |
| `INFLUXDB_TOKEN` | Token para escribir en InfluxDB | `lisatokenadmin` | **Sí** (mismo que arriba) |
| `INFLUXDB_ORG` | Organización en InfluxDB | `lisaorganization` | **Sí** (mismo que arriba) |
| `INFLUXDB_BUCKET` | Bucket destino en InfluxDB | `mqtt_data` | **Sí** (mismo que arriba) |

## Kapacitor

| Variable | Descripción | Valor por defecto | Requerido |
|----------|-------------|-------------------|-----------|
| `KAPACITOR_INFLUXDB_0_TOKEN` | Token para acceso a InfluxDB | `lisatokenadmin` | **Sí** (mismo que arriba) |
| `KAPACITOR_INFLUXDB_0_ORG` | Organización en InfluxDB | `lisaorganization` | **Sí** (mismo que arriba) |

## Variables de Entorno en la Aplicación LISA

Para integrar correctamente la aplicación LISA con el stack TICK, las siguientes variables deben configurarse en el entorno de la aplicación:

| Variable | Descripción | Valor por defecto | Requerido |
|----------|-------------|-------------------|-----------|
| `INFLUXDB_TOKEN` | Token para acceso a InfluxDB | `mi-token-secreto` | **Sí** (debe coincidir con el configurado en InfluxDB) |
| `INFLUXDB_URL` | URL para conexión a InfluxDB | `http://influxdb:8086` | **Sí** |
| `INFLUXDB_ORG` | Organización en InfluxDB | `miorganizacion` | **Sí** |
| `INFLUXDB_BUCKET` | Bucket para consultar datos | `mqtt_data` | **Sí** |

## Ejemplo de Archivo .env

```env
# Configuración InfluxDB
INFLUXDB_USER=admin
INFLUXDB_PASSWORD=contraseña_segura_producción
INFLUXDB_ORG=lisa_organization
INFLUXDB_BUCKET=mqtt_data
INFLUXDB_TOKEN=token_seguro_producción_aquí
INFLUXDB_RETENTION=90d
INFLUXDB_URL=http://192.168.0.20:8086

# Configuración MQTT
MQTT_HOST=192.168.0.20
MQTT_PORT=1883

# Variables para Kapacitor
KAPACITOR_INFLUXDB_0_TOKEN=${INFLUXDB_TOKEN}
KAPACITOR_INFLUXDB_0_ORG=${INFLUXDB_ORG}
```

## Consideraciones de Seguridad

1. **En entornos de producción**, todas las contraseñas y tokens deben cambiarse a valores seguros y únicos.
2. Considerar el uso de un gestor de secretos para las credenciales en producción.
3. Limitar el acceso a las variables de entorno solo a los usuarios y servicios que lo requieran.
4. Configurar firewalls para restringir el acceso a los puertos de servicios (especialmente 8086 para InfluxDB).
5. En entornos de alta seguridad, considerar la habilitación de TLS para todas las comunicaciones.

## Notas de Despliegue

- En entornos Docker Swarm, estas variables deben configurarse como secrets o configs.
- Para despliegues de Kubernetes, utilizar ConfigMaps y Secrets para gestionar estas variables.
- Verificar que las variables estén correctamente propagadas a todos los servicios antes de iniciar la captura de datos.

---

**Documento Técnico creado para el proyecto LISA - Living-lab Integrated Sensing Architecture**  
**Fecha: 21 de abril de 2025**  
**Versión: 1.0**