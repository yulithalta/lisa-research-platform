# **Frequently Asked Questions (FAQ)**

## **General**

### **What is EnterpriseWorkflow?**
EnterpriseWorkflow is an advanced system for managing synchronized recordings from IP cameras and capturing data from MQTT/Zigbee2MQTT sensors.  
It is designed for professional environments that require maximum precision and reliability, such as clinical research and real-time monitoring.

### **What are the minimum system requirements?**
- **Hardware:** 2-core CPU, 4GB RAM, 20GB storage  
- **Software:** Modern browser (Chrome, Firefox, Edge)  
- **Network:** Connectivity to IP cameras and MQTT broker  

### **How are system updates managed?**
Updates are distributed by the development team.  
The current system version can be found in the application footer or in the `VERSION.md` file.

---

## **Configuration**

### **How do I configure the connection to the MQTT broker?**
Edit the `.env` file with the appropriate values for `VITE_MQTT_HOST` and `VITE_MQTT_PORT`.  
If your broker requires authentication, also include `VITE_MQTT_USERNAME` and `VITE_MQTT_PASSWORD`.

### **Why can’t I connect to my MQTT broker?**
Check that:
1. The broker has WebSocket support enabled  
2. The WebSocket port (usually 9001) is open and accessible  
3. The credentials are correct (if applicable)  
4. There are no network restrictions or firewalls blocking the connection  

### **How do I add a camera that isn’t on the default list?**
In the **Device Management** section, under the **Camera Management** tab, use the **Add Camera** button and manually enter your camera’s RTSP connection details.

---

## **Cameras and Sensors**

### **What camera formats are supported?**
Any camera providing a valid RTSP URL is supported.  
The system has been tested with brands such as Hikvision, Dahua, Axis, and generic IP cameras.

### **Can the system automatically detect Zigbee sensors?**
Yes, the system automatically subscribes to the relevant topics on the MQTT broker and detects Zigbee devices registered through Zigbee2MQTT.

### **Can I add sensors with custom topics?**
Yes, the system allows subscribing to additional topics beyond the default ones.  
This can be configured in the **Sensor Management** section.

### **How many sensors can I monitor simultaneously?**
The system is designed to scale from 6 up to 10,000 sensors without significant performance degradation.

---

## **Recordings and Sessions**

### **What happens if I close the browser during a recording?**
The recording will continue on the server as long as the session remains active.  
However, it is recommended to keep the browser open to monitor status.

### **What does the session ZIP file contain?**
The ZIP file includes:
1. All video recordings in MP4 format  
2. A consolidated JSON file with all sensor data  
3. Individual JSON files with sensor data as backup  
4. Session metadata  

### **How can I fix the “413 Payload Too Large” error?**
This issue was resolved in version **2.5.16** through session payload optimization.  
If you still experience it, make sure you are using the latest system version.

### **Can I download only the sensor data without videos?**
Currently, the system generates a single ZIP file containing all data.  
A selective download feature is planned for future releases.

---

## **Common Issues**

### **Sensor data appears empty in the download**
This issue was resolved in version **2.5.17** with the implementation of a dual data storage system.  
Ensure you are running the latest version.

### **The monitoring page shows “WebSocket Connection Error”**
Check that:
1. The MQTT broker is running  
2. `VITE_MQTT_HOST` and `VITE_MQTT_PORT` environment variables are correctly configured  
3. The WebSocket port is open and accessible from your network  

### **Some cameras show as “Offline”**
The system performs a basic HTTP status check. Make sure that:
1. The camera is powered on and connected to the network  
2. The IP and credentials are correct  
3. The camera responds to basic HTTP requests  

### **Performance degrades with many cameras**
To optimize performance:
1. Set camera resolution to reasonable values (720p recommended)  
2. Consider distributing cameras across multiple instances for large-scale recordings  
3. Ensure the server hardware meets the recommended requirements  
