# **EnterpriseWorkflow System Technical Documentation**

*Current version: v2.5.18*

## **System Architecture**

### **Frontend (React/TypeScript)**
- **React**: Main UI framework  
- **TypeScript**: Static typing  
- **shadcn/ui**: UI components  
- **TanStack Query**: State and cache management  
- **WebSocket**: Real-time communication  
- **MQTT Client**: Communication with MQTT/Zigbee2MQTT broker  

### **Backend (Node.js)**
- **Express**: Web framework  
- **ffmpeg**: Video processing  
- **WebSocket**: Real-time video and data streaming  
- **MQTT Client**: Integration with MQTT/Zigbee2MQTT broker  
- **JSON Storage**: Data persistence  
- **archiver**: Data and recording packaging  

## **Main Components**

### **Camera System**
- RTSP connection management  
- Real-time streaming  
- Recording and storage  
- Status verification via HTTP  

### **Sensor System**
- Connection to MQTT/Zigbee2MQTT broker  
- Subscription to multiple topics  
- Dual data storage (individual and consolidated)  
- Support for up to 10,000 sensors  

### **Session System**
- Synchronized recording of cameras and sensors  
- Generation of ZIP packages with complete data  
- Configuration interface with checklist selection  
- Recording continuity even when browser tab changes  

### **Performance Monitoring**
- Real-time metrics  
- Camera and sensor statistics  
- Performance dashboard  

## **Implemented Design Patterns**
- **Observer/Publish-Subscribe**: For scalable sensor data handling  
- **Component Pattern**: Modular interface with reusable tabs and components  
- **Repository Pattern**: Data access abstraction  
- **Factory Pattern**: Instance creation for camera and sensor connections  

## **Data Flows**

1. **Video Streaming**  
   - RTSP Connection → ffmpeg → WebSocket → Client  

2. **Sensor Data Capture**  
   - MQTT Broker → MQTT Client → Dual Storage System → Client  

3. **Session Recording**  
   - Client → API → File System + JSON Storage  

4. **Session Download**  
   - Client → API → Archiver (ZIP) → Client  
