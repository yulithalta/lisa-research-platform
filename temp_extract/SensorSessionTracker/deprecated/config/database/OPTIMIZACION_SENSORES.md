# Optimización de LISA para Alta Densidad de Sensores

## Visión de Escalabilidad - LISA v3.0.0

Este documento complementa la documentación principal de implementación, enfocándose específicamente en la optimización de la arquitectura para soportar una alta densidad y diversidad de sensores en entornos de investigación clínica.

## Escenarios de Uso Avanzados

El sistema LISA debe estar preparado para los siguientes escenarios:

- **Diversidad de sensores**: Plantillas de presión, sensores biométricos (SpO2, temperatura corporal), cámaras infrarrojas, sensores ambientales (temperatura, humedad, calidad del aire, ruido), sensores de movimiento, etc.
- **Alta frecuencia de muestreo**: Algunos sensores pueden generar datos a frecuencias de 100Hz o más
- **Consultas históricas**: Investigadores necesitarán acceder a datos históricos de hasta 3 meses para análisis comparativos
- **Exportación eficiente**: Capacidad para exportar conjuntos de datos completos de sesiones en formato ZIP

## Optimizaciones Fundamentales para PostgreSQL

### 1. Particionamiento de Tablas por Tiempo

Implementar particionamiento por tiempo en la tabla `sensor_readings`:

```sql
-- Crear tabla particionada por rango de tiempo
CREATE TABLE sensor_readings (
  id BIGSERIAL,
  sensor_id INTEGER NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  value JSONB NOT NULL,
  topic VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (timestamp);

-- Crear particiones mensuales
CREATE TABLE sensor_readings_y2025m04 PARTITION OF sensor_readings
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
    
CREATE TABLE sensor_readings_y2025m05 PARTITION OF sensor_readings
    FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');

-- Índices específicos por partición
CREATE INDEX idx_sensor_readings_y2025m04_sensor_id ON sensor_readings_y2025m04(sensor_id);
CREATE INDEX idx_sensor_readings_y2025m04_timestamp ON sensor_readings_y2025m04(timestamp);
CREATE INDEX idx_sensor_readings_y2025m04_session_id ON sensor_readings_y2025m04(session_id);
```

### 2. Índices Optimizados para JSON

```sql
-- Índice GIN para valores específicos dentro del JSON de datos de sensores
CREATE INDEX idx_sensor_readings_value_gin ON sensor_readings USING GIN (value);

-- Índices específicos para tipos de datos comunes
CREATE INDEX idx_sensor_readings_value_temperature 
  ON sensor_readings ((value->>'temperature')) 
  WHERE value ? 'temperature';
  
CREATE INDEX idx_sensor_readings_value_pressure 
  ON sensor_readings ((value->>'pressure')) 
  WHERE value ? 'pressure';
```

### 3. Función para Mantenimiento Automático de Particiones

```sql
CREATE OR REPLACE FUNCTION maintenance_sensor_readings_partitions()
RETURNS void AS $$
DECLARE
  next_month DATE;
  partition_name TEXT;
  retention_months INTEGER := 3; -- Retención de 3 meses
  old_partition TEXT;
  old_date DATE;
BEGIN
  -- Crear partición para el próximo mes
  next_month := date_trunc('month', now()) + interval '1 month';
  partition_name := 'sensor_readings_y' || 
                    to_char(next_month, 'YYYY') || 
                    'm' || 
                    to_char(next_month, 'MM');
  
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF sensor_readings
     FOR VALUES FROM (%L) TO (%L)',
    partition_name,
    date_trunc('month', next_month),
    date_trunc('month', next_month) + interval '1 month'
  );
  
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS idx_%s_sensor_id ON %I(sensor_id)',
    partition_name, partition_name
  );
  
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS idx_%s_timestamp ON %I(timestamp)',
    partition_name, partition_name
  );
  
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS idx_%s_session_id ON %I(session_id)',
    partition_name, partition_name
  );

  -- Eliminar particiones antiguas (más allá del período de retención)
  old_date := date_trunc('month', now() - (retention_months * interval '1 month'));
  old_partition := 'sensor_readings_y' || 
                   to_char(old_date, 'YYYY') || 
                   'm' || 
                   to_char(old_date, 'MM');
  
  -- Verificar si existe la partición antes de eliminarla
  IF EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = old_partition
  ) THEN
    EXECUTE format('DROP TABLE %I', old_partition);
    RAISE NOTICE 'Dropped partition: %', old_partition;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### 4. Programar el Mantenimiento de Particiones

Agregar al script de inicialización:

```sql
-- Crear una tarea programada para ejecutar el mantenimiento de particiones mensualmente
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule('0 0 1 * *', $$
  SELECT maintenance_sensor_readings_partitions();
$$);
```

## Optimizaciones de Redis para Datos en Tiempo Real

Redis debe aprovecharse para mejorar significativamente el rendimiento en tiempo real:

### 1. Estructura de Datos Óptima para Sensores en Redis

```
# Últimas lecturas por sensor (hash)
SENSOR:<sensor_id>:LATEST {
  "value": "{json_data}",
  "timestamp": "2025-04-14T10:54:27.049Z",
  "topic": "sensors/temperature/room1"
}

# Series temporales recientes por sensor (usando Redis Streams)
SENSOR:<sensor_id>:STREAM -> Stream con las últimas 1000 lecturas

# Agregaciones por sesión (set)
SESSION:<session_id>:SENSORS -> Set con IDs de sensores activos

# Datos agregados por sesión (hash)
SESSION:<session_id>:STATS {
  "start_time": "2025-04-14T09:00:00Z",
  "sensor_count": 42,
  "reading_count": 15768,
  "status": "active"
}
```

### 2. Políticas de Expiración en Redis

Configurar TTL (Time-To-Live) apropiados:

```
# Configurar datos de sensores para expirar después de 24 horas en Redis
EXPIRE SENSOR:<sensor_id>:STREAM 86400

# Configurar estadísticas de sesión para expirar después de 7 días
EXPIRE SESSION:<session_id>:STATS 604800
```

### 3. Configuración Óptima de Redis

En `config/database/redis.conf`:

```
# Persistencia
appendonly yes
appendfsync everysec

# Políticas de evicción de memoria
maxmemory 4gb
maxmemory-policy volatile-lru

# Optimizaciones para rendimiento
activedefrag yes
```

## Estrategia de Sincronización PostgreSQL-Redis

### 1. Buffer de Escritura para Altas Cargas

Implementar un proceso worker para sincronizar datos de Redis a PostgreSQL:

```javascript
// En worker.js
async function syncSensorDataToPostgres() {
  // Obtener lotes de 1000 lecturas del stream de Redis
  const readings = await redisClient.xrange(
    'SENSORS:BUFFER:STREAM', 
    '-', 
    '+', 
    'COUNT', 
    1000
  );
  
  if (readings.length === 0) return;
  
  // Preparar batch insert
  const values = readings.map(r => formatReading(r));
  
  // Insertar en PostgreSQL en una sola transacción
  await db.transaction(async (trx) => {
    await trx.batchInsert('sensor_readings', values);
    
    // Marcar como procesados en Redis
    await redisClient.xdel('SENSORS:BUFFER:STREAM', readings.map(r => r.id));
  });
}

// Programar para ejecutar cada 10 segundos
setInterval(syncSensorDataToPostgres, 10000);
```

### 2. Cacheo Inteligente para Lecturas

Implementar estrategias de cacheo para lecturas frecuentes:

```javascript
async function getSensorData(sensorId, timeRange, resolution) {
  const cacheKey = `CACHE:SENSOR:${sensorId}:${timeRange}:${resolution}`;
  
  // Intentar obtener del caché
  const cachedData = await redisClient.get(cacheKey);
  if (cachedData) return JSON.parse(cachedData);
  
  // Si no está en caché, consultar PostgreSQL
  const data = await db.raw(`
    SELECT 
      time_bucket('${resolution}', timestamp) AS time,
      avg((value->>'value')::numeric) AS avg_value,
      min((value->>'value')::numeric) AS min_value,
      max((value->>'value')::numeric) AS max_value,
      count(*) AS reading_count
    FROM sensor_readings
    WHERE 
      sensor_id = ? AND
      timestamp BETWEEN ? AND ?
    GROUP BY time
    ORDER BY time
  `, [sensorId, timeRange.start, timeRange.end]);
  
  // Guardar en caché con TTL de 5 minutos
  await redisClient.set(cacheKey, JSON.stringify(data), 'EX', 300);
  
  return data;
}
```

## Otras Optimizaciones de Rendimiento

### 1. Configuración de PostgreSQL para Datos de Sensores

En `postgresql.conf`:

```
# Memoria
shared_buffers = 4GB
work_mem = 128MB
maintenance_work_mem = 256MB

# Disco
effective_io_concurrency = 200
random_page_cost = 1.1

# Paralelismo
max_worker_processes = 16
max_parallel_workers_per_gather = 4
max_parallel_workers = 16

# Checkpoints
checkpoint_timeout = 15min
checkpoint_completion_target = 0.9
```

### 2. Servidor de Base de Datos Dedicado

Asegurarse de que el servidor de base de datos (192.168.0.21) esté optimizado:

- Discos SSD en RAID para mayor rendimiento
- Suficiente RAM (mínimo 32GB recomendado)
- CPU con múltiples núcleos (mínimo 8 cores)
- Red dedicada de 10Gbps entre servidores de aplicación y base de datos

## Consideraciones para Exportación Eficiente

### 1. Exportación de Datos por Lotes

```javascript
async function exportSessionData(sessionId, format = 'zip') {
  // Crear directorio temporal
  const tempDir = `/tmp/export-${sessionId}-${Date.now()}`;
  await fs.mkdir(tempDir, { recursive: true });
  
  // Exportar metadatos de la sesión
  const sessionData = await db.select().from('sessions').where({id: sessionId});
  await fs.writeFile(`${tempDir}/session.json`, JSON.stringify(sessionData));
  
  // Exportar datos de sensores por lotes usando streams
  await new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(`${tempDir}/sensor_readings.csv`);
    writeStream.write('timestamp,sensor_id,topic,value\n');
    
    // Usar cursores para reducir uso de memoria
    db.select()
      .from('sensor_readings')
      .where({session_id: sessionId})
      .orderBy('timestamp')
      .stream(stream => {
        stream.on('data', row => {
          writeStream.write(`${row.timestamp},${row.sensor_id},${row.topic},${JSON.stringify(row.value)}\n`);
        });
        stream.on('end', resolve);
        stream.on('error', reject);
      });
  });
  
  // Crear ZIP
  const zipFile = `/tmp/session-${sessionId}.zip`;
  await createZipArchive(tempDir, zipFile);
  
  // Limpiar
  await fs.rm(tempDir, { recursive: true });
  
  return zipFile;
}
```

## Monitoreo y Alerta

Para asegurar el rendimiento continuo:

1. Implementar métricas de monitoreo para PostgreSQL y Redis
2. Configurar alertas para:
   - Crecimiento excesivo de tablas de sensor_readings
   - Aumento de latencia en operaciones de escritura
   - Consumo elevado de recursos (CPU, memoria, disco)
   - Fallos en la sincronización Redis-PostgreSQL

## Conclusión

Esta configuración optimizada garantiza que LISA pueda manejar eficientemente:

- Alta diversidad de sensores (plantillas de presión, biométricos, ambientales, etc.)
- Altas frecuencias de muestreo (hasta cientos de Hz)
- Acceso eficiente a datos históricos de hasta 3 meses
- Exportación rápida y confiable de sesiones completas

Con estas optimizaciones, la arquitectura PostgreSQL + Redis es totalmente adecuada para el caso de uso avanzado descrito, sin necesidad de introducir tecnologías adicionales como InfluxDB.