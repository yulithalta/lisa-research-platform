# Documentación Técnica del Stack TICK en LISA

## Índice
1. [Introducción](#introducción)
2. [Arquitectura General](#arquitectura-general)
3. [Componentes](#componentes)
   - [Telegraf](#telegraf)
   - [InfluxDB](#influxdb)
   - [Chronograf](#chronograf)
   - [Kapacitor](#kapacitor)
4. [Integración con LISA](#integración-con-lisa)
5. [Configuraciones Específicas](#configuraciones-específicas)
6. [Flujo de Datos](#flujo-de-datos)
7. [API de Exportación](#api-de-exportación)
8. [Gestión de Retención de Datos](#gestión-de-retención-de-datos)
9. [Alertas y Monitorización](#alertas-y-monitorización)
10. [Escalabilidad](#escalabilidad)
11. [Mantenimiento y Backup](#mantenimiento-y-backup)

---

## Introducción

El stack TICK (Telegraf, InfluxDB, Chronograf, Kapacitor) ha sido implementado en LISA (Living-lab Integrated Sensing Architecture) para proporcionar una solución robusta y escalable de gestión de datos de series temporales, especialmente orientada a capturar, almacenar, visualizar y procesar datos de sensores MQTT/Zigbee.

Este stack permite a LISA cumplir con requerimientos clave:
- Captura de datos de hasta 10,000 sensores diferentes
- Almacenamiento de datos por un período mínimo de 90 días
- Implementación de un buffer de 1000 puntos antes de realizar escrituras en la base de datos
- Monitorización y alerta en tiempo real
- Exportación flexible de datos para análisis

---

## Arquitectura General

![Arquitectura TICK Stack](../attached_assets/tick_architecture.png)

La arquitectura del stack TICK en LISA está diseñada para optimizar tanto la captura como el procesamiento de datos en un entorno médico/clínico donde la precisión y la confiabilidad son críticas.

Todo el stack se ejecuta en el servidor de aplicaciones (192.168.0.20) para reducir la latencia de captura de datos MQTT y simplificar la arquitectura, manteniendo el servidor de bases de datos (192.168.0.21) dedicado a PostgreSQL y Redis.

---

## Componentes

### Telegraf

**Función**: Recolector de datos que captura métricas y eventos de múltiples fuentes.

**Configuración en LISA**:
- Implementa un buffer de 1000 puntos (`metric_batch_size = 1000`)
- Captura datos MQTT de todos los temas configurados
- Configuración específica para sensores Zigbee
- Intervalo de recolección de 10 segundos

Telegraf está configurado para suscribirse a todos los temas MQTT relevantes, procesando los mensajes en formato JSON y agregando etiquetas para facilitar el filtrado y la consulta posteriores.

### InfluxDB

**Función**: Base de datos de series temporales optimizada para datos de alta disponibilidad y alto rendimiento.

**Configuración en LISA**:
- Política de retención de 90 días
- Configurado para manejar alto throughput de datos de sensores
- Organización y bucket dedicados para datos MQTT
- Autenticación basada en tokens para seguridad

InfluxDB almacena todas las mediciones con timestamps precisos, facilitando consultas temporales eficientes y proporcionando capacidades de agregación y downsampling.

### Chronograf

**Función**: Interfaz de usuario para visualización de datos y administración de InfluxDB y Kapacitor.

**Configuración en LISA**:
- Dashboards preconfigurados para diferentes tipos de sensores
- Monitorización del estado del sistema
- Explorador de datos para consultas ad-hoc
- Interfaz para gestión de alertas

Chronograf proporciona una interfaz visual para que los administradores y usuarios técnicos puedan explorar datos y configurar el sistema sin necesidad de conocimientos profundos de las consultas Flux.

### Kapacitor

**Función**: Motor de procesamiento de datos en tiempo real para alertas y transformaciones.

**Configuración en LISA**:
- Scripts TICKscript para detección de anomalías en sensores
- Alertas configuradas para umbrales críticos (temperatura, humedad, etc.)
- Notificaciones a través de MQTT para integración con el sistema de alertas de LISA
- Procesamiento continuo de streams de datos

Kapacitor ejecuta consultas continuas sobre los datos entrantes, permitiendo detectar condiciones anómalas y ejecutar acciones automáticas sin intervención humana.

---

## Integración con LISA

El stack TICK se integra con la aplicación principal de LISA a través de:

1. **Captura de Datos**: Telegraf captura los mismos datos MQTT que la aplicación principal, proporcionando redundancia.

2. **API de Consulta**: Un servicio dedicado (`influxdb-service.js`) permite a la aplicación principal consultar datos históricos de InfluxDB.

3. **Exportación**: Endpoints específicos para exportar datos de sensores en formatos CSV y JSON, integrados con la funcionalidad de exportación existente.

4. **Alertas**: Las alertas generadas por Kapacitor se publican en temas MQTT específicos que la aplicación principal monitorea.

La integración es no-invasiva, lo que permite que LISA siga funcionando con su almacenamiento en memoria (MemStorage) mientras se beneficia de las capacidades adicionales del stack TICK.

---

## Configuraciones Específicas

### Configuración de Telegraf para Buffer de 1000 Puntos

```toml
[agent]
  interval = "10s"
  metric_batch_size = 1000
  metric_buffer_limit = 10000
  flush_interval = "60s"
```

Esta configuración garantiza que Telegraf acumule 1000 puntos de datos antes de escribir en InfluxDB, optimizando el rendimiento y reduciendo la carga en la base de datos.

### Configuración de Retención en InfluxDB (90 días)

El script `setup-retention.sh` configura automáticamente la política de retención:

```bash
# Actualizar la política de retención del bucket a 90 días (7776000 segundos)
curl -s -X PATCH \
  -H "Authorization: Token ${TOKEN}" \
  -H "Content-Type: application/json" \
  "http://influxdb:8086/api/v2/buckets/${BUCKET_ID}" \
  -d '{
    "retentionRules": [
      {
        "type": "expire",
        "everySeconds": 7776000,
        "shardGroupDurationSeconds": 86400
      }
    ]
  }'
```

---

## Flujo de Datos

El flujo de datos en el stack TICK sigue este patrón:

1. **Captura**: Los sensores publican datos en el broker MQTT (192.168.0.20:1883)
2. **Recolección**: Telegraf se suscribe a los temas relevantes y recolecta datos
3. **Buffering**: Telegraf acumula 1000 puntos de datos antes de continuar
4. **Almacenamiento**: Los datos se escriben en InfluxDB con etiquetas y campos apropiados
5. **Procesamiento**: Kapacitor procesa los datos en tiempo real para detectar anomalías
6. **Alerta**: Si se detectan anomalías, Kapacitor genera alertas vía MQTT
7. **Visualización**: Los datos pueden visualizarse a través de Chronograf
8. **Consulta**: La aplicación LISA puede consultar datos históricos a través de la API de InfluxDB
9. **Exportación**: Los datos pueden exportarse para análisis externos

---

## API de Exportación

La API de exportación proporciona tres endpoints principales:

1. **GET /api/sensor-data/latest**: Obtiene los datos más recientes de los sensores.
2. **GET /api/sessions/:sessionId/export-sensor-data**: Exporta datos de sensores para una sesión específica en formato CSV o JSON.
3. **GET /api/sessions/:sessionId/export-all**: Exporta tanto los datos de sensores como las grabaciones de cámaras en un archivo ZIP.

Esta API se integra con el sistema de sesiones existente en LISA y complementa la funcionalidad de exportación actual.

---

## Gestión de Retención de Datos

La política de retención de 90 días se configura durante la inicialización de InfluxDB y se verifica/corrige mediante el script `setup-retention.sh`.

Para datos críticos que necesiten conservarse más allá del período de retención, la API de exportación permite a los usuarios guardar esos datos de forma permanente en formatos estándar (CSV/JSON).

---

## Alertas y Monitorización

El sistema de alertas utiliza scripts TICKscript en Kapacitor para definir condiciones de alerta:

```js
// Alertas para sensores de temperatura
var temp_data = stream
    |from()
        .database(db)
        .measurement('zigbee_sensor_state')
        .groupBy('topic')
    |filter(lambda: "temperature" != 0)
    |alert()
        .id('{{ index .Tags "topic" }}/temp')
        .message('Temperatura fuera de rango: {{ .Level }} - Valor: {{ index .Fields "temperature" }}')
        .warn(lambda: "temperature" > temp_high OR "temperature" < temp_low)
        .crit(lambda: "temperature" > (temp_high + 10) OR "temperature" < (temp_low - 10))
        .topic('lisa/alerts/temperature')
```

Las alertas definidas incluyen:
- Temperaturas fuera de rango
- Humedad fuera de rango
- Detección de movimiento prolongado (posible intrusión o emergencia)

---

## Escalabilidad

El stack TICK está diseñado para escalar a los 10,000 sensores requeridos:

- **Escalado Vertical**: Aumentando recursos de CPU/memoria para InfluxDB
- **Escalado Horizontal**: Añadiendo más instancias de Telegraf para distribuir la carga de captura
- **Particionamiento**: Utilizando tiempo de retención downsampling para datos antiguos
- **Optimización de Consultas**: Usando selectivamente tags e índices para mejorar rendimiento

Para entornos con requisitos extremos, la arquitectura permite distribuir componentes en múltiples servidores.

---

## Mantenimiento y Backup

Para garantizar la integridad de los datos:

1. **Backups Automáticos**: Programar backups diarios de los buckets de InfluxDB
2. **Monitorización de Salud**: Configurar alertas para problemas del sistema
3. **Compactación**: Programar mantenimiento periódico para optimizar el almacenamiento
4. **Actualización**: Proceso documentado para actualizaciones seguras de componentes

El mantenimiento debe realizarse durante ventanas de bajo uso para minimizar el impacto.

---

**Documento Técnico creado para el proyecto LISA - Living-lab Integrated Sensing Architecture**
**Fecha: 21 de abril de 2025**
**Versión: 1.0**