# **Configuration Guide**

## **Environment Variables**

The system uses the following environment variables for configuration.  
These should be set in the `.env` file located at the root of the project.

### **General Configuration**
- `PORT`: Port where the server will run (default: 5000)  
- `NODE_ENV`: Execution environment (`development`, `production`)  
- `LOG_LEVEL`: Log verbosity level (`debug`, `info`, `warn`, `error`)  

### **MQTT Configuration**
- `VITE_MQTT_HOST`: IP address or hostname of the MQTT broker (e.g., 192.168.0.20)  
- `VITE_MQTT_PORT`: WebSocket port of the MQTT broker (e.g., 9001)  
- `VITE_MQTT_USERNAME`: Username for MQTT authentication (optional)  
- `VITE_MQTT_PASSWORD`: Password for MQTT authentication (optional)  
- `VITE_MQTT_TOPIC_PREFIX`: Topic prefix for filtering (default: `zigbee2mqtt/livinglab/`)  

### **Storage Configuration**
- `STORAGE_PATH`: Path for storing recordings and data (default: `./data`)  
- `MAX_STORAGE_GB`: Maximum storage limit in GB (default: 100)  
- `CLEANUP_INTERVAL`: Automatic cleanup interval in days (default: 30)  

## **Example .env File**

```bash
PORT=5000
NODE_ENV=production
LOG_LEVEL=info

VITE_MQTT_HOST=192.168.0.20
VITE_MQTT_PORT=9001
VITE_MQTT_USERNAME=
VITE_MQTT_PASSWORD=
VITE_MQTT_TOPIC_PREFIX=zigbee2mqtt/livinglab/

STORAGE_PATH=./data
MAX_STORAGE_GB=100
CLEANUP_INTERVAL=30
````

## **MQTT Broker Configuration**

For the system to work properly with the MQTT broker, make sure to:

1. **Enable WebSockets on the MQTT broker:**

   * **Mosquitto:** Add `listener 9001` and `protocol websockets` to `mosquitto.conf`
   * **EMQ X:** Enable the WebSockets plugin in the admin console
   * **HiveMQ:** Enable WebSockets in the configuration options

2. **Set appropriate permissions:**

   * Ensure the client has permissions to subscribe to relevant topics
   * If authentication is used, provide the correct credentials

3. **Verify connectivity:**

   * The WebSocket port (usually 9001) must be accessible from the network
   * Check firewalls or network restrictions that could block the connection

## **IP Camera Configuration**

For successful IP camera integration:

1. **Camera requirements:**

   * Must support RTSP streaming
   * Optional: basic HTTP API support

2. **RTSP URL formats:**

   * Generic: `rtsp://username:password@ip-address:port/stream`
   * **Hikvision:** `rtsp://username:password@ip-address:554/Streaming/Channels/101`
   * **Dahua:** `rtsp://username:password@ip-address:554/cam/realmonitor?channel=1&subtype=0`
   * **Axis:** `rtsp://username:password@ip-address:554/axis-media/media.amp`

3. **Connectivity verification:**

   * The system performs basic HTTP checks
   * It’s recommended that cameras have an accessible web interface

## **System Optimization**

For optimal performance:

1. **Resource management:**

   * **CPU:** Minimum 2 cores for fewer than 10 cameras
   * **RAM:** 4GB minimum, add 1GB per additional 5 cameras
   * **Storage:** SSD recommended for better performance

2. **Network configuration:**

   * **Bandwidth:** Estimate ~2 Mbps per camera at 720p
   * **Latency:** Preferably <50 ms to the MQTT broker
   * **Firewall:** Allow traffic on relevant ports (RTSP, MQTT, HTTP)

3. **Scalability:**

   * The system is designed to support between 6 and 10,000 sensors
   * For more than 20 simultaneous cameras, consider distributing across multiple instances

