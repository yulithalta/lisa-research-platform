# Instrucciones para la Exportación de Sesiones

## ¿Qué es la exportación de sesiones?

La exportación de sesiones permite empaquetar todos los datos relacionados con una sesión específica en un único archivo ZIP, incluyendo grabaciones de vídeo y datos de sensores. Esta funcionalidad es crucial para preservar y compartir los datos recolectados durante las sesiones de monitoreo.

## ¿Qué contiene el archivo ZIP?

Cada archivo ZIP de sesión contiene:

1. **Grabaciones de video** - Todos los archivos MP4 asociados a la sesión
2. **Datos de sensores** - Archivos JSON y CSV con datos de sensores
3. **Metadatos de la sesión** - Información sobre la sesión, fecha, y descripción
4. **Archivo README.txt** - Explicación detallada del contenido del ZIP

## Cómo se identifican las grabaciones por sesión

El sistema busca grabaciones relacionadas con una sesión de varias formas:

1. **Por prefijo de cámara y ID de sesión**: Los archivos MP4 que contienen el ID de la sesión en su nombre, como:
   - `cam1_session42_20250502.mp4`
   - `c32_livinglab_s42_video.mp4`
   - `cam2-session42-20250502.mp4`

2. **Por ubicación**: Archivos MP4 que se encuentran en el directorio específico de la sesión:
   - `/sessions/Session42/recordings/cualquier_grabacion.mp4`

## Estructura del archivo ZIP

La estructura interna del archivo ZIP es la siguiente:

```
/
├── README.txt                        # Información sobre la sesión y contenido
├── recordings/                      # Directorio con grabaciones de vídeo
│   ├── cam1_session42_20250502.mp4   # Grabaciones identificadas por ID de sesión
│   ├── cam2-session42-20250502.mp4
│   ├── c32_livinglab_s42_video.mp4
│   └── ...
├── data/                           # Directorio con datos y metadatos
│   ├── zigbee-data.json            # Datos unificados en formato JSON
│   ├── zigbee-sensors.csv           # Datos unificados en formato CSV
│   ├── devices.json                # Información sobre dispositivos
│   ├── session_metadata.json        # Metadatos de la sesión
│   └── sensor_data/                # Directorio con datos específicos de sensores
│       ├── sensor_readings.json     # Lecturas de sensores en formato JSON
│       └── sensor_readings.csv      # Lecturas de sensores en formato CSV
└── ...
```

## Recomendaciones para nombrar grabaciones

Para asegurar que las grabaciones se asocien correctamente con las sesiones, se recomienda:

1. **Uso del prefijo de cámara**: Configure el prefijo en la configuración de cada cámara
2. **Incluir el ID de sesión** en el nombre del archivo usando alguno de estos formatos:
   - `prefijo_session{ID}_fecha.mp4`
   - `prefijo-session{ID}-fecha.mp4`
   - `prefijo_s{ID}_fecha.mp4`

## Resoluciones de problemas comunes

1. **Grabaciones no incluidas en el ZIP**: Verificar que el nombre del archivo siga las convenciones mencionadas e incluya el ID de sesión
2. **ZIP sin datos de sensores**: Asegurarse de que los archivos `zigbee-data.json` y `zigbee-sensors.csv` existen en el directorio `data/`
3. **Archivo ZIP vacío o solo con README**: Verificar que las carpetas `/recordings` y `/sessions/Session{ID}` existen y contienen archivos

## Notas adicionales

- La exportación crea un archivo temporal que se elimina automáticamente después de ser descargado
- Para sesiones con muchos archivos, la generación del ZIP puede tardar varios minutos
- El sistema excluye automáticamente grabaciones que no están relacionadas con la sesión seleccionada
