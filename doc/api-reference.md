# **API Reference**

## **Base Structure**
- **Base Endpoint:** `/api`  
- **Response Format:** JSON  
- **Authentication:** Session-based  

---

## **Camera Endpoints**

### **GET** `/api/cameras`
Retrieves the list of all configured cameras.

**Response:**
```json
[
  {
    "id": "string",
    "name": "string",
    "rtspUrl": "string",
    "username": "string",
    "password": "string",
    "status": "online | offline",
    "createdAt": "timestamp"
  }
]
````

### **POST** `/api/cameras`

Creates a new camera in the system.

**Request Body:**

```json
{
  "name": "string",
  "rtspUrl": "string",
  "username": "string",
  "password": "string"
}
```

### **GET** `/api/cameras/:id`

Retrieves detailed information about a specific camera.

### **PUT** `/api/cameras/:id`

Updates data for an existing camera.

### **DELETE** `/api/cameras/:id`

Removes a camera from the system.

---

## **Sensor Endpoints**

### **GET** `/api/sensors`

Retrieves a list of all MQTT/Zigbee2MQTT sensors.

**Query Parameters:**

* `page`: Page number (default: 1)
* `limit`: Number of results per page (default: 20)
* `filter`: Filter by name or ID (optional)

**Response:**

```json
{
  "data": [
    {
      "id": "string",
      "friendly_name": "string",
      "topic": "string",
      "type": "string",
      "lastValue": "any",
      "lastUpdate": "timestamp",
      "status": "online | offline"
    }
  ],
  "pagination": {
    "total": "number",
    "page": "number",
    "limit": "number",
    "pages": "number"
  }
}
```

### **GET** `/api/sensors/:id`

Retrieves detailed information about a specific sensor.

### **PUT** `/api/sensors/:id`

Updates data for an existing sensor.

---

## **Session Endpoints**

### **GET** `/api/sessions`

Retrieves a list of all recording sessions.

**Response:**

```json
[
  {
    "id": "string",
    "name": "string",
    "description": "string",
    "status": "active | completed",
    "startTime": "timestamp",
    "endTime": "timestamp | null",
    "cameras": ["cameraId1", "cameraId2"],
    "sensors": ["sensorId1", "sensorId2"],
    "recordingsCount": "number",
    "dataSize": "number"
  }
]
```

### **POST** `/api/sessions`

Creates a new recording session.

**Request Body:**

```json
{
  "name": "string",
  "description": "string",
  "cameras": ["cameraId1", "cameraId2"],
  "sensorMetadata": [
    {
      "id": "string",
      "friendly_name": "string",
      "topic": "string",
      "type": "string"
    }
  ]
}
```

**Note:** Only sensor metadata is sent to avoid large payload issues (`413 Payload Too Large`).

### **GET** `/api/sessions/:id`

Retrieves detailed information about a specific session.

### **PUT** `/api/sessions/:id/complete`

Marks a session as completed.

**Response:**

```json
{
  "id": "string",
  "status": "completed",
  "endTime": "timestamp"
}
```

### **GET** `/api/sessions/:id/download`

Downloads the full session data as a ZIP file.

**ZIP Contents:**

* Camera recordings in MP4 format
* Sensor data in JSON format (both consolidated and individual)
* Session metadata in JSON format

---

## **Real-Time Monitoring Endpoints**

### **GET** `/api/live/cameras/:id`

Establishes a WebSocket connection for real-time video streaming.

### **GET** `/api/live/sensors`

Establishes a WebSocket connection to receive real-time sensor updates.

**WebSocket Message Format:**

```json
{
  "topic": "string",
  "payload": "any",
  "timestamp": "number"
}
```

---

## **Error Codes**

* `400`: **Bad Request** – Invalid input data
* `401`: **Unauthorized** – Authentication required
* `403`: **Forbidden** – Insufficient permissions
* `404`: **Not Found** – Resource not found
* `409`: **Conflict** – Resource conflict (e.g., duplicate camera)
* `413`: **Payload Too Large** – Request body too large
* `500`: **Internal Server Error** – Server-side error
* `503`: **Service Unavailable** – Service temporarily unavailable

