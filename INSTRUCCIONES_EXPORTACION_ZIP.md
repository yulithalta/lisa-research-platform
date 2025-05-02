# Instrucciones para Implementar la Solución de Exportación ZIP

## Cambios Realizados

Se han realizado las siguientes mejoras en el sistema de exportación ZIP de sesiones:

1. **Consolidación de datos de sensores** en un único archivo JSON y CSV para facilitar análisis
2. **Reorganización de la estructura de archivos** en carpetas 'data' y 'recordings'
3. **Mejora en la búsqueda de archivos** para incluir todos los archivos relevantes en el ZIP
4. **Mejora del README** con información detallada sobre la estructura y contenido
5. **Adición de metadatos** para mejor compatibilidad y claridad

## Archivos Modificados

1. **server/fileManager.ts**: Simplificación de la búsqueda de archivos
2. **server/mqtt-client-simple.ts**: Consolidación de datos de sensores en archivos únicos
3. **server/services/archive.service.ts**: Reorganización de la estructura del ZIP

## Estructura de Carpetas y Archivos

La estructura en el archivo ZIP exportado es la siguiente:

```
/
├── README.txt            # Información detallada sobre la sesión y contenidos
├── data/                 # Carpeta con todos los datos de sensores y metadatos
│   ├── zigbee-data.json      # Datos completos de sensores en formato JSON
│   ├── zigbee-sensors.csv    # Datos de sensores en formato CSV para análisis
│   ├── devices.json          # Lista de todos los dispositivos
│   ├── bridge.json           # Estado del puente zigbee
│   ├── session_metadata.json # Metadatos técnicos de la sesión
│   └── sensor_data/          # Carpeta con datos adicionales de sensores
└── recordings/           # Carpeta con grabaciones de vídeo
    └── *.mp4                 # Archivos de grabación MP4
```

## Instrucciones para Probar Localmente

Para probar la funcionalidad de exportación ZIP en tu entorno local:

1. **Crea los directorios necesarios**:
   ```bash
   mkdir -p data recordings temp
   ```

2. **Copia el archivo de prueba**:
   - Utiliza el archivo `test-zip-creation.js` proporcionado
   - Para ejecutarlo:
   ```bash
   node test-zip-creation.js
   ```

3. **Verifica la estructura** del archivo ZIP resultante en la carpeta `temp/`

## Cómo Funciona

1. **mqtt-client-simple.ts** ahora guarda datos unificados:
   - Un solo archivo `zigbee-data.json` con todos los datos en formato JSON
   - Un solo archivo `zigbee-sensors.csv` con datos en formato CSV para análisis
   - Un archivo `devices.json` con información sobre todos los dispositivos

2. **archive.service.ts** busca archivos en estas ubicaciones:
   - Primero busca en la carpeta `data/` por los archivos consolidados
   - Luego busca en `recordings/` por archivos MP4
   - Finalmente busca en cualquier ubicación adicional por compatibilidad

3. La estructura de carpetas en el ZIP es simplificada:
   - Solo dos carpetas principales: `/data` y `/recordings`
   - Un archivo README.txt claro y detallado

## Solución de Problemas

Si el archivo ZIP sigue vacío o incompleto:

1. **Verifica los permisos** de los directorios `data/` y `recordings/`
2. **Comprueba las rutas** en el código - deben ser relativas desde el directorio raíz
3. **Revisa los logs** para identificar errores durante la búsqueda de archivos
4. **Ejecuta el script de prueba** para verificar que la funcionalidad básica funciona
5. **Asegúrate de que los archivos existen** en las ubicaciones esperadas

## Notas Adicionales

- La carpeta `data/` debe contener los archivos de datos consolidados
- La carpeta `recordings/` debe contener los archivos MP4
- El sistema ahora busca los archivos en múltiples ubicaciones para maximizar éxito