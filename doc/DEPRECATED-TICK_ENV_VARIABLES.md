# Environment Variables for the TICK Stack

This document details all environment variables required to properly configure the TICK stack (Telegraf, InfluxDB, Chronograf, Kapacitor) in the LISA environment.

---

## InfluxDB

| Variable | Description | Default Value | Required |
|----------|-------------|---------------|---------|
| `INFLUXDB_USER` | Admin user for InfluxDB | `admin` | No |
| `INFLUXDB_PASSWORD` | Password for admin user | `admin123` | **Yes** (change in production) |
| `INFLUXDB_ORG` | Organization name in InfluxDB | `lisaorganization` | No |
| `INFLUXDB_BUCKET` | Main bucket name for data | `mqtt_data` | No |
| `INFLUXDB_TOKEN` | Authentication token for API access | `lisatokenadmin` | **Yes** (change in production) |
| `INFLUXDB_RETENTION` | Data retention policy | `90d` | No |
| `INFLUXDB_URL` | URL to connect to InfluxDB | `http://influxdb:8086` | No |

---

## Telegraf

| Variable | Description | Default Value | Required |
|----------|-------------|---------------|---------|
| `MQTT_HOST` | IP address of the MQTT broker | `192.168.0.20` | **Yes** |
| `MQTT_PORT` | Port of the MQTT broker | `1883` | No |
| `INFLUXDB_TOKEN` | Token for writing to InfluxDB | `lisatokenadmin` | **Yes** (same as above) |
| `INFLUXDB_ORG` | Organization in InfluxDB | `lisaorganization` | **Yes** (same as above) |
| `INFLUXDB_BUCKET` | Target bucket in InfluxDB | `mqtt_data` | **Yes** (same as above) |

---

## Kapacitor

| Variable | Description | Default Value | Required |
|----------|-------------|---------------|---------|
| `KAPACITOR_INFLUXDB_0_TOKEN` | Token for InfluxDB access | `lisatokenadmin` | **Yes** (same as above) |
| `KAPACITOR_INFLUXDB_0_ORG` | Organization in InfluxDB | `lisaorganization` | **Yes** (same as above) |

---

## Environment Variables in the LISA Application

To properly integrate LISA with the TICK stack, the following variables must be set in the application environment:

| Variable | Description | Default Value | Required |
|----------|-------------|---------------|---------|
| `INFLUXDB_TOKEN` | Token for InfluxDB access | `my-secret-token` | **Yes** (must match InfluxDB) |
| `INFLUXDB_URL` | URL to connect to InfluxDB | `http://influxdb:8086` | **Yes** |
| `INFLUXDB_ORG` | Organization in InfluxDB | `myorganization` | **Yes** |
| `INFLUXDB_BUCKET` | Bucket for querying data | `mqtt_data` | **Yes** |

---

## Example .env File

```env
# InfluxDB Configuration
INFLUXDB_USER=admin
INFLUXDB_PASSWORD=secure-production-password
INFLUXDB_ORG=lisa_organization
INFLUXDB_BUCKET=mqtt_data
INFLUXDB_TOKEN=secure-production-token-here
INFLUXDB_RETENTION=90d
INFLUXDB_URL=http://192.168.0.20:8086

# MQTT Configuration
MQTT_HOST=192.168.0.20
MQTT_PORT=1883

# Kapacitor Variables
KAPACITOR_INFLUXDB_0_TOKEN=${INFLUXDB_TOKEN}
KAPACITOR_INFLUXDB_0_ORG=${INFLUXDB_ORG}
