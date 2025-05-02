#!/bin/bash
# Script para configurar la política de retención de datos en InfluxDB (90 días)

# Esperar a que InfluxDB esté disponible
echo "Esperando a que InfluxDB se inicie..."
until curl -s http://influxdb:8086/ping > /dev/null; do
  sleep 1
done
echo "InfluxDB está en funcionamiento."

# Configurar la política de retención usando la API de InfluxDB v2
echo "Configurando política de retención de 90 días..."

# Variables de entorno
TOKEN="${DOCKER_INFLUXDB_INIT_ADMIN_TOKEN}"
ORG="${DOCKER_INFLUXDB_INIT_ORG}"
BUCKET="${DOCKER_INFLUXDB_INIT_BUCKET}"

# Obtener ID del bucket
BUCKET_ID=$(curl -s -H "Authorization: Token ${TOKEN}" \
  "http://influxdb:8086/api/v2/buckets?name=${BUCKET}" | \
  grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$BUCKET_ID" ]; then
  echo "Error: No se pudo obtener el ID del bucket"
  exit 1
fi

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

echo "Política de retención configurada exitosamente para 90 días."