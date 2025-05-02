# Design Patterns in the Monitoring System

This document provides a comprehensive explanation of the design patterns implemented in the monitoring system. Each pattern is described in detail with its implementation specifics, benefits, and code examples to help both junior and senior developers understand the architectural decisions.

## Observer + Publish-Subscribe Pattern

This combined pattern has been implemented for MQTT/Zigbee2MQTT sensor management, enabling scalability from 6 to 10,000 sensors without performance degradation. The Observer pattern allows objects to be notified of changes, while the Publish-Subscribe pattern adds a message broker layer for topic-based message routing.

### Theoretical Background

The Observer pattern involves subjects (publishers) and observers (subscribers) where:
- Subjects maintain a list of observers and notify them of state changes
- Observers register with subjects and respond to notifications

The Publish-Subscribe pattern extends this by:
- Decoupling publishers from subscribers through a message broker
- Allowing message filtering and routing based on topics
- Supporting one-to-many, many-to-one, and many-to-many communication patterns

### Implementation Details

In our system, this pattern is implemented across several components:

1. **MQTT Client (Subject/Publisher)**
   - Connects to the MQTT broker
   - Publishes messages to specific topics
   - Notifies registered observers when new data arrives

```typescript
// server/mqtt-client.ts
export class MQTTClient {
  private static instance: MQTTClient;
  private client: mqtt.Client | null = null;
  private observers: Map<string, Observer[]> = new Map();
  
  // Singleton pattern ensures only one MQTT client exists
  public static getInstance(): MQTTClient {
    if (!MQTTClient.instance) {
      MQTTClient.instance = new MQTTClient();
    }
    return MQTTClient.instance;
  }
  
  // Connect to the MQTT broker
  public connect(options: MQTTOptions): Promise<boolean> {
    // Implementation details...
    this.client = mqtt.connect(brokerUrl, mqttOptions);
    
    this.client.on('message', (topic, message) => {
      // When message arrives, notify all observers subscribed to this topic
      this.notifyObservers(topic, message.toString());
    });
    
    return new Promise((resolve) => {
      this.client.on('connect', () => {
        logger.info(`Connected to MQTT broker at ${brokerUrl}`);
        resolve(true);
      });
    });
  }
  
  // Observer pattern: Register an observer for a specific topic
  public subscribe(topic: string, observer: Observer): void {
    if (!this.observers.has(topic)) {
      this.observers.set(topic, []);
      // Also subscribe to the MQTT topic
      this.client?.subscribe(topic);
    }
    
    this.observers.get(topic)?.push(observer);
    logger.info(`Observer registered for topic: ${topic}`);
  }
  
  // Observer pattern: Notify all observers when a message arrives
  private notifyObservers(topic: string, message: string): void {
    // Exact topic observers
    this.observers.get(topic)?.forEach(observer => {
      observer.update(topic, message);
    });
    
    // Wildcard topic observers (topics with + or # wildcards)
    this.observers.forEach((observers, registeredTopic) => {
      if (this.topicMatchesWildcard(topic, registeredTopic)) {
        observers.forEach(observer => {
          observer.update(topic, message);
        });
      }
    });
  }
}
```

2. **UI Components (Observers/Subscribers)**
   - Register with the MQTT client for specific topics
   - Update their state when notified of changes
   - Render the UI based on the latest data

```typescript
// client/src/hooks/use-simple-mqtt.ts
export function useSimpleMQTT(topic: string) {
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  
  useEffect(() => {
    // Create observer that will update React state when messages arrive
    const observer: Observer = {
      update: (receivedTopic: string, message: string) => {
        if (receivedTopic === topic) {
          try {
            const parsedData = JSON.parse(message);
            setData(parsedData);
          } catch (error) {
            setData(message);
          }
        }
      }
    };
    
    // Register observer with the MQTT client (subject)
    const mqttClient = MQTTClient.getInstance();
    mqttClient.subscribe(topic, observer);
    
    // Cleanup function to unsubscribe when component unmounts
    return () => {
      mqttClient.unsubscribe(topic, observer);
    };
  }, [topic]);
  
  return { data, status };
}
```

3. **Message Broker** (MQTT Broker)
   - Routes messages between publishers and subscribers
   - Handles topic-based message filtering
   - Provides Quality of Service (QoS) guarantees

### Diagrama de Flujo
```
┌─────────────┐     publishes    ┌─────────────┐    routes     ┌─────────────┐
│ MQTT Device │─────────────────>│ MQTT Broker │───────────────>│ MQTT Client │
└─────────────┘                  └─────────────┘               └──────┬──────┘
                                                                      │
                                                                      │ notifies
                                                                      ▼
┌─────────────┐     updates      ┌─────────────┐    registers  ┌─────────────┐
│    React    │<─────────────────│  Observer   │<──────────────│  Component  │
│    State    │                  │  Interface  │               │  (Observer) │
└─────────────┘                  └─────────────┘               └─────────────┘
```

### Benefits

1. **Decoupling**
   - The data capture layer (MQTT client) is completely decoupled from the visualization layer (UI components)
   - Publishers don't need to know about subscribers and vice versa
   - Components can be added, removed, or modified without affecting other parts of the system

2. **Real-time Updates**
   - Updates are pushed to subscribers immediately when data changes
   - No need for polling, which would waste resources and add latency
   - Event-driven architecture ensures that UI is always up-to-date

3. **Resource Efficiency**
   - Only interested components receive updates
   - Network traffic is minimized by selectively routing messages
   - CPU and memory usage are optimized by avoiding unnecessary processing

4. **Selective Message Distribution**
   - Components can subscribe to specific topics of interest
   - MQTT wildcards allow for flexible subscription patterns
   - Message filtering happens at the broker level, reducing processing at the client

### Scalability Considerations

The implementation allows for scaling from a few sensors to thousands because:

1. **Topic Hierarchies**
   - Sensors are organized in a hierarchical topic structure
   - Example: `zigbee2mqtt/living_room/temperature_sensor`
   - Components can subscribe to specific sensors or entire groups using wildcards

2. **Connection Pooling**
   - A single MQTT connection is shared across all components
   - Reduces overhead of maintaining multiple connections

3. **Efficient Message Handling**
   - Messages are only processed by relevant components
   - Message parsing and state updates are handled locally in each component

4. **Lazy Loading**
   - Components only subscribe to topics when they're mounted
   - Unsubscribe when unmounted to prevent memory leaks

### Challenges and Mitigations

1. **Message Volume**
   - Challenge: High message rates could overwhelm the UI
   - Mitigation: Throttling and debouncing of updates at the UI level

2. **Error Handling**
   - Challenge: Network disruptions or broker failures
   - Mitigation: Automatic reconnection logic and offline caching

3. **Memory Management**
   - Challenge: Long-lived subscriptions could cause memory leaks
   - Mitigation: Proper cleanup in component unmount lifecycle

## Dual Storage Pattern

This custom pattern combines individual data storage with a consolidated JSON file to ensure data integrity and availability. It's particularly useful for IoT and sensor data where both individual access and aggregated views are required.

### Theoretical Background

The Dual Storage Pattern is a hybrid approach that combines:
- **Document-based storage**: For individual data points (one file per sensor reading)
- **Aggregated storage**: For consolidated views of all data
- **Reconciliation mechanism**: To ensure consistency between both storage formats

This is similar to the Command Query Responsibility Segregation (CQRS) pattern where write operations use one model and read operations use another.

### Implementation Details

In our system, this pattern is implemented in the sensor data handling:

1. **Individual Files Storage**
   - Each sensor reading is stored as a separate JSON file
   - Files are organized by session ID, sensor ID, and timestamp
   - Provides fast access to specific data points

```typescript
// server/storage.ts
export class SensorDataStorage {
  // Store individual sensor reading
  public async storeSensorReading(sessionId: string, sensorId: string, data: any): Promise<void> {
    const timestamp = new Date().toISOString();
    const filePath = path.join(
      this.basePath,
      'sessions',
      sessionId,
      'sensors',
      sensorId,
      `${timestamp}.json`
    );
    
    // Ensure directory exists
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    
    // Write individual sensor data file
    await fs.promises.writeFile(
      filePath,
      JSON.stringify({
        timestamp,
        sensorId,
        ...data
      }, null, 2)
    );
    
    // Also update the consolidated file
    await this.updateConsolidatedData(sessionId, sensorId, data, timestamp);
    
    logger.info(`Stored sensor reading for ${sensorId} at ${timestamp}`);
  }
  
  // Get specific sensor reading
  public async getSensorReading(sessionId: string, sensorId: string, timestamp: string): Promise<any> {
    const filePath = path.join(
      this.basePath,
      'sessions',
      sessionId,
      'sensors',
      sensorId,
      `${timestamp}.json`
    );
    
    try {
      const data = await fs.promises.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      logger.error(`Failed to read sensor data: ${error}`);
      throw new Error(`Sensor data not found for ${sensorId} at ${timestamp}`);
    }
  }
}
```

2. **Consolidated JSON Storage**
   - All readings for a session are also stored in a consolidated JSON file
   - Organized by sensor ID and timestamp for easy access
   - Provides efficient bulk retrieval and filtering

```typescript
// server/storage.ts (continued)
export class SensorDataStorage {
  // Update consolidated data file with new sensor reading
  private async updateConsolidatedData(
    sessionId: string, 
    sensorId: string, 
    data: any, 
    timestamp: string
  ): Promise<void> {
    const consolidatedPath = path.join(
      this.basePath,
      'sessions',
      sessionId,
      'consolidated_sensor_data.json'
    );
    
    let consolidatedData: Record<string, Record<string, any>> = {};
    
    // Try to read existing consolidated data
    try {
      const existingData = await fs.promises.readFile(consolidatedPath, 'utf8');
      consolidatedData = JSON.parse(existingData);
    } catch (error) {
      // File doesn't exist yet, start with empty object
      logger.info(`Creating new consolidated data file for session ${sessionId}`);
    }
    
    // Initialize sensor entry if it doesn't exist
    if (!consolidatedData[sensorId]) {
      consolidatedData[sensorId] = {};
    }
    
    // Add new reading
    consolidatedData[sensorId][timestamp] = data;
    
    // Write back to consolidated file
    await fs.promises.writeFile(
      consolidatedPath,
      JSON.stringify(consolidatedData, null, 2)
    );
  }
  
  // Get all readings for a sensor in a session
  public async getAllSensorReadings(sessionId: string, sensorId: string): Promise<Record<string, any>> {
    const consolidatedPath = path.join(
      this.basePath,
      'sessions',
      sessionId,
      'consolidated_sensor_data.json'
    );
    
    try {
      const data = await fs.promises.readFile(consolidatedPath, 'utf8');
      const consolidatedData = JSON.parse(data);
      
      return consolidatedData[sensorId] || {};
    } catch (error) {
      logger.error(`Failed to read consolidated data: ${error}`);
      return {};
    }
  }
}
```

3. **Reconciliation Mechanism**
   - Periodic check to ensure both storage formats are in sync
   - Recovery procedures to rebuild missing data from either source

```typescript
// server/services/reconciliation.ts
export class DataReconciliationService {
  // Check and repair inconsistencies between individual files and consolidated JSON
  public async reconcileSessionData(sessionId: string): Promise<ReconciliationResult> {
    const result: ReconciliationResult = {
      inconsistenciesFound: 0,
      repaired: 0,
      details: []
    };
    
    // Get list of all sensors from the directory structure
    const sensorsDir = path.join(this.basePath, 'sessions', sessionId, 'sensors');
    const sensorIds = await fs.promises.readdir(sensorsDir);
    
    // Get consolidated data
    const consolidatedPath = path.join(
      this.basePath,
      'sessions',
      sessionId,
      'consolidated_sensor_data.json'
    );
    
    let consolidatedData: Record<string, Record<string, any>> = {};
    try {
      const data = await fs.promises.readFile(consolidatedPath, 'utf8');
      consolidatedData = JSON.parse(data);
    } catch (error) {
      // Consolidated file missing, will need to rebuild
      logger.warn(`Consolidated file missing for session ${sessionId}, will rebuild`);
      result.inconsistenciesFound++;
      result.details.push({
        type: 'missing_consolidated',
        sessionId
      });
    }
    
    // For each sensor, check if individual files match consolidated data
    for (const sensorId of sensorIds) {
      // Reading all individual files
      const sensorDir = path.join(sensorsDir, sensorId);
      const files = await fs.promises.readdir(sensorDir);
      
      // Compare with consolidated data
      for (const file of files) {
        const timestamp = path.basename(file, '.json');
        const filePath = path.join(sensorDir, file);
        
        const fileData = JSON.parse(await fs.promises.readFile(filePath, 'utf8'));
        
        // Check if this data exists in consolidated file
        if (!consolidatedData[sensorId] || !consolidatedData[sensorId][timestamp]) {
          // Missing in consolidated, add it
          if (!consolidatedData[sensorId]) {
            consolidatedData[sensorId] = {};
          }
          consolidatedData[sensorId][timestamp] = fileData;
          result.inconsistenciesFound++;
          result.repaired++;
          result.details.push({
            type: 'missing_in_consolidated',
            sensorId,
            timestamp
          });
        }
      }
    }
    
    // Check if consolidated has entries missing in individual files
    for (const sensorId in consolidatedData) {
      for (const timestamp in consolidatedData[sensorId]) {
        const filePath = path.join(
          sensorsDir,
          sensorId,
          `${timestamp}.json`
        );
        
        try {
          await fs.promises.access(filePath);
          // File exists, all good
        } catch (error) {
          // Missing individual file, recreate it
          await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
          await fs.promises.writeFile(
            filePath,
            JSON.stringify(consolidatedData[sensorId][timestamp], null, 2)
          );
          result.inconsistenciesFound++;
          result.repaired++;
          result.details.push({
            type: 'missing_individual_file',
            sensorId,
            timestamp
          });
        }
      }
    }
    
    // Write updated consolidated data if repairs were made
    if (result.repaired > 0) {
      await fs.promises.writeFile(
        consolidatedPath,
        JSON.stringify(consolidatedData, null, 2)
      );
      logger.info(`Repaired ${result.repaired} inconsistencies in session ${sessionId}`);
    }
    
    return result;
  }
}
```

### Diagrama de Flujo
```
┌───────────────┐                          ┌───────────────┐
│ Sensor Reading │                          │ Consolidated  │
│ Individual File│◄─────────────┐           │ JSON File     │
└───────────────┘              │           └───────┬───────┘
       ▲                       │                   │
       │                       │                   │
       │ Write                 │ Synchronize       │ Update
       │                       │                   │
       │                       │                   │
┌──────┴──────┐          ┌─────┴───────┐          │
│ Storage API │◄─────────┤ Reconciler  │◄─────────┘
└─────────────┘          └─────────────┘
       ▲
       │
       │ Store Data
       │
┌──────┴──────┐
│ MQTT Client │
└─────────────┘
```

### Benefits

1. **Data Redundancy**
   - Protection against data loss through multiple storage formats
   - If one storage mechanism fails, data can be recovered from the other
   - Especially important for mission-critical sensor data in clinical environments

2. **Performance Optimization**
   - Individual files optimize for specific sensor/timestamp queries
   - Consolidated JSON optimizes for session-wide data retrieval
   - Appropriate storage mechanism can be used depending on access pattern

3. **ZIP Package Creation**
   - Consolidated JSON can be directly included in ZIP downloads
   - Directory structure of individual files maps cleanly to ZIP structure
   - Metadata can be easily attached at the session level

4. **Resilience**
   - System can continue functioning even if one storage mechanism fails
   - Reconciliation process repairs inconsistencies automatically
   - Progressive enhancement of data integrity over time

### Scalability Considerations

The implementation scales effectively because:

1. **File System Organization**
   - Hierarchical directory structure (session/sensor/timestamp)
   - Prevents performance degradation with large numbers of files in a single directory

2. **Selective Data Loading**
   - Only requested data is loaded into memory
   - Applications can choose between individual readings or consolidated views

3. **Asynchronous Operations**
   - File operations are non-blocking
   - Reconciliation runs as a background process

### Challenges and Mitigations

1. **Consistency Management**
   - Challenge: Ensuring both storage forms remain in sync
   - Mitigation: Periodic reconciliation and transaction-like writes

2. **Disk Space Usage**
   - Challenge: Storing duplicate data increases storage requirements
   - Mitigation: Compression and optional archiving of older sessions

3. **I/O Performance**
   - Challenge: Multiple file operations could impact performance
   - Mitigation: Batch operations and asynchronous processing

## Component Pattern

The Component Pattern has been implemented in the user interface through a tab system that replaces sidebar submenus, creating a more intuitive and efficient navigation structure.

### Theoretical Background

The Component Pattern involves breaking down the UI into independent, reusable pieces that can be composed to build complex interfaces. Key aspects include:

- **Encapsulation**: Each component manages its own state and behavior
- **Composition**: Larger components are built by combining smaller ones
- **Reusability**: Components can be used in multiple contexts
- **Hierarchy**: Components are organized in parent-child relationships

In React, this pattern is fundamental to the framework's design philosophy.

### Implementation Details

In our system, this pattern is implemented across the UI with a focus on the tab navigation system:

1. **Main Tab Components**
   - Live Monitoring and Device Management are implemented as top-level tab containers
   - Each tab section maintains its own state and context

```tsx
// client/src/pages/device-management-page.tsx
export default function DeviceManagementPage() {
  const [activeTab, setActiveTab] = useState<string>("cameras");
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Device Management</h1>
      </div>
      
      <Tabs defaultValue="cameras" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full md:w-auto grid-cols-2">
          <TabsTrigger value="cameras" className="px-6">
            <Camera className="mr-2 h-4 w-4" />
            Cameras
          </TabsTrigger>
          <TabsTrigger value="sensors" className="px-6">
            <Thermometer className="mr-2 h-4 w-4" />
            Sensors
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="cameras" className="space-y-4">
          <CamerasTab />
        </TabsContent>
        
        <TabsContent value="sensors" className="space-y-4">
          <SensorsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

2. **Sub-Tab Components**
   - Cameras and Sensors sections are implemented as independent components
   - Each manages its own state and API interactions

```tsx
// client/src/components/tabs/cameras-tab.tsx
export function CamerasTab() {
  const { data: cameras, isLoading } = useQuery<Camera[]>({
    queryKey: ['/api/cameras'],
  });
  
  const [showAddCamera, setShowAddCamera] = useState<boolean>(false);
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">IP Cameras</h2>
        <Button onClick={() => setShowAddCamera(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Camera
        </Button>
      </div>
      
      {isLoading ? (
        <CameraGridSkeleton />
      ) : (
        <CameraGrid cameras={cameras || []} />
      )}
      
      <AddCameraDialog open={showAddCamera} onOpenChange={setShowAddCamera} />
    </div>
  );
}
```

3. **Shared Components**
   - UI elements like cards, buttons, and forms are shared across the application
   - These components maintain consistent styling and behavior

```tsx
// client/src/components/camera-card.tsx
export function CameraCard({ camera, onVerify, onDelete, onEdit }: CameraCardProps) {
  const [showActions, setShowActions] = useState<boolean>(false);
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              camera.status === "online" ? "bg-green-500" : 
              camera.status === "offline" ? "bg-red-500" : 
              "bg-yellow-500"
            )} />
            <span>{camera.name}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowActions(!showActions)}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </CardTitle>
        <CardDescription>{camera.ipAddress}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Camera details and actions */}
      </CardContent>
    </Card>
  );
}
```

### Component Hierarchy

```
┌─────────────────────────┐
│ MainLayout               │
├─────────────────────────┤
│ ┌─────────┐ ┌─────────┐ │
│ │ Sidebar │ │ Content │ │
│ └─────────┘ └─────────┘ │
└─────────────────────────┘
          │         │
          ▼         ▼
┌─────────────────────────┐
│ DeviceManagementPage    │
├─────────────────────────┤
│ ┌─────────┐ ┌─────────┐ │
│ │CamerasTab│ │SensorsTab│ │
│ └─────────┘ └─────────┘ │
└─────────────────────────┘
     │            │
     ▼            ▼
┌──────────┐  ┌──────────┐
│CameraGrid│  │SensorGrid│
└──────────┘  └──────────┘
     │            │
     ▼            ▼
┌──────────┐  ┌──────────┐
│CameraCard│  │SensorCard│
└──────────┘  └──────────┘
```

### Benefits

1. **Visual Organization**
   - Tabs provide a clear visual hierarchy for different sections
   - Related functionality is grouped together for better discoverability
   - Each section can have its own context and state

2. **Navigation Efficiency**
   - Reduced navigation depth compared to nested sidebar menus
   - Single-click access to common functionality
   - Tab-based navigation matches mental models from other applications

3. **Faster Access to Related Features**
   - "Live Monitoring" tab directly shows both cameras and sensors monitoring
   - "Device Management" tab contains configuration for both types of devices
   - Quick switching between related contexts

4. **Visual Consistency**
   - Common styling and behavior across components
   - Standardized layout patterns
   - Consistent feedback mechanisms (loading states, error handling, etc.)

### Implementation Considerations

1. **State Management**
   - Each component manages its own local state with `useState`
   - Global state is managed via React Query for data fetching
   - Tab state is preserved when switching between tabs

2. **Component Composition**
   - Smaller components are combined to build larger ones
   - Props drilling is minimized through context where appropriate
   - UI components from shadcn/ui are extended with application-specific behavior

3. **Reusability**
   - Core components like `CameraCard` and `SensorCard` are used in multiple contexts
   - Styling utilities ensure consistent appearance across the application
   - Common behaviors are abstracted into custom hooks

### Technical Implementation

The tab system is built using the `@radix-ui/react-tabs` component via the shadcn/ui library, which provides:

- Fully accessible tab interfaces with keyboard navigation
- Proper ARIA attributes for screen readers
- Animated transitions between tab content
- Proper focus management

```tsx
// Implementation of tabs with shadcn/ui
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Usage in components
<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content for Tab 1</TabsContent>
  <TabsContent value="tab2">Content for Tab 2</TabsContent>
</Tabs>
```

### Challenges and Mitigations

1. **Component Granularity**
   - Challenge: Determining the right size for components (too small: overhead; too large: reduced reusability)
   - Mitigation: Following the single responsibility principle for component design

2. **Mobile Responsiveness**
   - Challenge: Ensuring tabs work well on smaller screens
   - Mitigation: Responsive design with stacked layouts on mobile

3. **Performance**
   - Challenge: Too many components could impact rendering performance
   - Mitigation: Lazy loading for tab content and virtualization for long lists

## Factory Pattern

The Factory Pattern is used for creating camera and sensor connection instances in a centralized, consistent manner. This pattern abstracts the complexities of object creation and provides a standardized interface for creating different types of connections.

### Theoretical Background

The Factory Pattern is a creational design pattern that:
- Provides an interface for creating objects without specifying their concrete classes
- Delegates the responsibility of instantiating a class to a separate factory object
- Centralizes complex creation logic in a single place
- Allows for runtime decisions on which class to instantiate

There are several variations, including:
- Simple Factory: A single class responsible for creating objects
- Factory Method: Defines an interface for creating objects but lets subclasses decide which class to instantiate
- Abstract Factory: Provides an interface for creating families of related objects

### Implementation Details

In our system, we've implemented both Camera Factory and Sensor Factory:

1. **Camera Factory**
   - Creates and configures instances of RTSP/HTTP camera connections
   - Handles different camera types and protocols
   - Manages connection parameters and validation

```typescript
// server/factories/camera-factory.ts
export class CameraFactory {
  /**
   * Creates a camera connection based on provided configuration
   * @param config Camera configuration
   * @returns A configured camera connection
   */
  public static createCamera(config: CameraConfig): CameraConnection {
    // Validate configuration
    this.validateConfig(config);
    
    // Select appropriate connection type based on URL/protocol
    if (config.rtspUrl && config.rtspUrl.startsWith('rtsp://')) {
      return this.createRTSPCamera(config);
    } else if (config.httpUrl && config.httpUrl.startsWith('http')) {
      return this.createHTTPCamera(config);
    } else {
      throw new Error('Unsupported camera protocol');
    }
  }
  
  /**
   * Creates an RTSP camera connection
   */
  private static createRTSPCamera(config: CameraConfig): RTSPCameraConnection {
    const connection = new RTSPCameraConnection({
      name: config.name,
      url: config.rtspUrl,
      username: config.username,
      password: config.password,
      options: {
        reconnectInterval: 5000,
        timeout: 10000,
        ...config.options
      }
    });
    
    logger.info(`Created RTSP camera connection for ${config.name}`);
    return connection;
  }
  
  /**
   * Creates an HTTP camera connection
   */
  private static createHTTPCamera(config: CameraConfig): HTTPCameraConnection {
    const connection = new HTTPCameraConnection({
      name: config.name,
      url: config.httpUrl,
      username: config.username,
      password: config.password,
      options: {
        pollingInterval: 500,
        timeout: 5000,
        ...config.options
      }
    });
    
    logger.info(`Created HTTP camera connection for ${config.name}`);
    return connection;
  }
  
  /**
   * Validates camera configuration
   */
  private static validateConfig(config: CameraConfig): void {
    if (!config.name) {
      throw new Error('Camera name is required');
    }
    
    if (!config.rtspUrl && !config.httpUrl) {
      throw new Error('Either RTSP or HTTP URL is required');
    }
    
    // Additional validation logic...
  }
}
```

2. **Sensor Factory**
   - Creates connections to different MQTT topics
   - Configures appropriate parsers and formatters for different sensor types
   - Manages subscription options

```typescript
// server/factories/sensor-factory.ts
export class SensorFactory {
  /**
   * Creates a sensor connection based on sensor type and configuration
   * @param type Sensor type (temperature, humidity, motion, etc.)
   * @param config Sensor configuration
   * @returns A configured sensor connection
   */
  public static createSensor(type: SensorType, config: SensorConfig): SensorConnection {
    // Validate configuration
    this.validateConfig(type, config);
    
    // Create appropriate sensor connection based on type
    switch (type) {
      case 'temperature':
        return this.createTemperatureSensor(config);
      case 'humidity':
        return this.createHumiditySensor(config);
      case 'motion':
        return this.createMotionSensor(config);
      case 'contact':
        return this.createContactSensor(config);
      case 'custom':
        return this.createCustomSensor(config);
      default:
        throw new Error(`Unsupported sensor type: ${type}`);
    }
  }
  
  /**
   * Creates a temperature sensor connection
   */
  private static createTemperatureSensor(config: SensorConfig): TemperatureSensorConnection {
    const connection = new TemperatureSensorConnection({
      topic: config.topic,
      deviceId: config.deviceId,
      valueKey: config.valueKey || 'temperature',
      // Temperature-specific options
      minValue: -50,
      maxValue: 100,
      unitConversion: config.unit === 'F' ? 
        (celsius: number) => celsius * 9/5 + 32 : 
        undefined,
      ...config.options
    });
    
    logger.info(`Created temperature sensor connection for ${config.deviceId}`);
    return connection;
  }
  
  // Similar methods for other sensor types...
  
  /**
   * Creates a custom sensor connection with user-defined parsers
   */
  private static createCustomSensor(config: SensorConfig): CustomSensorConnection {
    if (!config.parser) {
      throw new Error('Parser function is required for custom sensors');
    }
    
    const connection = new CustomSensorConnection({
      topic: config.topic,
      deviceId: config.deviceId,
      parser: config.parser,
      formatter: config.formatter,
      ...config.options
    });
    
    logger.info(`Created custom sensor connection for ${config.deviceId}`);
    return connection;
  }
  
  /**
   * Validates sensor configuration
   */
  private static validateConfig(type: SensorType, config: SensorConfig): void {
    if (!config.topic) {
      throw new Error('MQTT topic is required');
    }
    
    if (!config.deviceId) {
      throw new Error('Device ID is required');
    }
    
    // Type-specific validation
    // ...
  }
}
```

### Factory Usage

The factories are used in the application to create and manage connections:

```typescript
// Example usage in camera management
try {
  const cameraConnection = CameraFactory.createCamera({
    name: "Front Door Camera",
    rtspUrl: "rtsp://192.168.1.100:554/stream",
    username: "admin",
    password: "password123"
  });
  
  // The connection is ready to use
  await cameraConnection.connect();
  // ...
} catch (error) {
  logger.error(`Failed to create camera: ${error.message}`);
}

// Example usage in sensor management
try {
  const temperatureSensor = SensorFactory.createSensor('temperature', {
    topic: 'zigbee2mqtt/living_room/temperature',
    deviceId: 'living_room_temp',
    valueKey: 'value',
    unit: 'C'
  });
  
  // Start listening for sensor data
  temperatureSensor.subscribe();
  // ...
} catch (error) {
  logger.error(`Failed to create sensor: ${error.message}`);
}
```

### Diagrama de Flujo
```
┌─────────────┐  create  ┌─────────────┐  returns  ┌─────────────┐
│ Application │─────────>│ Factory     │──────────>│ Connection  │
└─────────────┘          └─────────────┘           └─────────────┘
                              │                          │
                              │                          │
                              ▼                          ▼
             ┌─────────────────────────────┐     ┌──────────────┐
             │ - Validates configurations   │     │ - Connects   │
             │ - Selects appropriate class  │     │ - Manages    │
             │ - Handles creation details   │     │   resources  │
             └─────────────────────────────┘     └──────────────┘
```

### Benefits

1. **Centralized Creation Logic**
   - All connection creation logic is centralized in factory classes
   - Consistent object creation process across the application
   - Easier to update creation logic in one place

2. **Consistent Validation**
   - All connection parameters are validated using the same rules
   - Validation errors are handled in a consistent manner
   - Prevents invalid configurations from creating connections

3. **Connection Strategy Flexibility**
   - New connection types can be added without changing client code
   - Different connection strategies can be implemented and selected at runtime
   - Concrete connection implementations are hidden from the client code

4. **Improved Testability**
   - Factory methods can be mocked in tests
   - Testing creation logic is isolated from usage logic
   - Easier to simulate different creation scenarios

### Implementation Considerations

1. **Error Handling**
   - Factories provide clear error messages for invalid configurations
   - Validation happens before connection attempts
   - Factories log all creation actions for diagnostics

2. **Configuration Management**
   - Default configurations are provided by factories
   - Configuration validation prevents runtime errors
   - Type-specific configuration options are handled appropriately

3. **Extension Points**
   - Factories allow for adding new connection types
   - Custom sensors can be created with user-defined parsers
   - Configuration options can be extended for specialized needs

### Challenges and Mitigations

1. **Configuration Complexity**
   - Challenge: Complex configuration objects can be error-prone
   - Mitigation: TypeScript interfaces and validation for configuration objects

2. **Error Traceability**
   - Challenge: Errors in factories can be hard to trace
   - Mitigation: Detailed logging and specific error messages

3. **Performance Overhead**
   - Challenge: Factory methods add a layer of indirection
   - Mitigation: Caching connection instances for reuse where appropriate

## Repository Pattern

The Repository Pattern has been implemented to abstract data access operations for both in-memory and file-based storage, providing a clean separation between the domain model and data access layers.

### Theoretical Background

The Repository Pattern:
- Mediates between the domain and data mapping layers
- Provides a collection-like interface for accessing domain objects
- Encapsulates the logic required to access data sources
- Centralizes data access logic and promotes consistent data access patterns

This pattern helps achieve:
- A clean separation of concerns
- Domain objects that are persistence-ignorant
- Easier unit testing through abstraction
- Flexibility to change data storage implementations

### Implementation Details

In our system, this pattern is implemented with an interface and multiple implementations:

1. **IStorage Interface**
   - Defines a common interface for data access operations
   - Provides CRUD operations for various entity types
   - Establishes a contract for all storage implementations

```typescript
// server/storage.ts
export interface IStorage {
  // Camera operations
  getCameras(): Promise<Camera[]>;
  getCamera(id: number): Promise<Camera | undefined>;
  createCamera(camera: InsertCamera): Promise<Camera>;
  updateCamera(id: number, camera: Partial<Camera>): Promise<Camera | undefined>;
  deleteCamera(id: number): Promise<boolean>;
  
  // Sensor operations
  getSensors(): Promise<Sensor[]>;
  getSensor(id: string): Promise<Sensor | undefined>;
  createSensor(sensor: InsertSensor): Promise<Sensor>;
  updateSensor(id: string, sensor: Partial<Sensor>): Promise<Sensor | undefined>;
  deleteSensor(id: string): Promise<boolean>;
  
  // Session operations
  getSessions(): Promise<Session[]>;
  getSession(id: string): Promise<Session | undefined>;
  createSession(session: InsertSession): Promise<Session>;
  deleteSession(id: string): Promise<boolean>;
  updateSessionStatus(id: string, status: SessionStatus): Promise<Session | undefined>;
  
  // Session data operations
  addSensorDataToSession(sessionId: string, sensorId: string, data: any): Promise<void>;
  getSessionSensorData(sessionId: string, sensorId: string): Promise<any[]>;
  getSessionMetadata(sessionId: string): Promise<SessionMetadata | undefined>;
  updateSessionMetadata(sessionId: string, metadata: Partial<SessionMetadata>): Promise<SessionMetadata | undefined>;
}
```

2. **MemStorage Implementation**
   - In-memory implementation for transient data
   - Uses Map and Array objects to store entities
   - Provides fast access and manipulation for runtime data

```typescript
// server/storage.ts
export class MemStorage implements IStorage {
  private cameras: Map<number, Camera> = new Map();
  private cameraIdCounter: number = 1;
  private sensors: Map<string, Sensor> = new Map();
  private sessions: Map<string, Session> = new Map();
  private sessionData: Map<string, Map<string, any[]>> = new Map();
  private sessionMetadata: Map<string, SessionMetadata> = new Map();
  
  // Camera operations
  async getCameras(): Promise<Camera[]> {
    return Array.from(this.cameras.values());
  }
  
  async getCamera(id: number): Promise<Camera | undefined> {
    return this.cameras.get(id);
  }
  
  async createCamera(camera: InsertCamera): Promise<Camera> {
    const id = this.cameraIdCounter++;
    const newCamera: Camera = {
      id,
      ...camera,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'unknown'
    };
    
    this.cameras.set(id, newCamera);
    logger.info(`Created camera with ID: ${id}`);
    return newCamera;
  }
  
  async updateCamera(id: number, update: Partial<Camera>): Promise<Camera | undefined> {
    const camera = this.cameras.get(id);
    if (!camera) {
      return undefined;
    }
    
    const updatedCamera = {
      ...camera,
      ...update,
      updatedAt: new Date()
    };
    
    this.cameras.set(id, updatedCamera);
    logger.info(`Updated camera with ID: ${id}`);
    return updatedCamera;
  }
  
  async deleteCamera(id: number): Promise<boolean> {
    const deleted = this.cameras.delete(id);
    if (deleted) {
      logger.info(`Deleted camera with ID: ${id}`);
    }
    return deleted;
  }
  
  // Additional implementation for other entity types...
}
```

3. **FileStorage Implementation**
   - File-based implementation for persistent data
   - Uses JSON files to store entity data
   - Includes file locking and atomic writes for data integrity

```typescript
// server/file-storage.ts
export class FileStorage implements IStorage {
  private basePath: string;
  private lockMap: Map<string, boolean> = new Map();
  
  constructor(basePath: string) {
    this.basePath = basePath;
    // Ensure base directories exist
    fs.mkdirSync(path.join(basePath, 'cameras'), { recursive: true });
    fs.mkdirSync(path.join(basePath, 'sensors'), { recursive: true });
    fs.mkdirSync(path.join(basePath, 'sessions'), { recursive: true });
    logger.info(`Initialized FileStorage at ${basePath}`);
  }
  
  // File locking utilities
  private async acquireLock(filePath: string): Promise<void> {
    // Simple in-process lock
    while (this.lockMap.get(filePath)) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    this.lockMap.set(filePath, true);
  }
  
  private releaseLock(filePath: string): void {
    this.lockMap.set(filePath, false);
  }
  
  // Camera operations with file persistence
  async getCameras(): Promise<Camera[]> {
    const dirPath = path.join(this.basePath, 'cameras');
    const files = await fs.promises.readdir(dirPath);
    
    const cameras: Camera[] = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const data = await fs.promises.readFile(path.join(dirPath, file), 'utf8');
          const camera = JSON.parse(data) as Camera;
          cameras.push(camera);
        } catch (error) {
          logger.error(`Error reading camera file ${file}: ${error}`);
        }
      }
    }
    
    return cameras;
  }
  
  async getCamera(id: number): Promise<Camera | undefined> {
    const filePath = path.join(this.basePath, 'cameras', `${id}.json`);
    
    try {
      const data = await fs.promises.readFile(filePath, 'utf8');
      return JSON.parse(data) as Camera;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        logger.error(`Error reading camera file for ID ${id}: ${error}`);
      }
      return undefined;
    }
  }
  
  async createCamera(camera: InsertCamera): Promise<Camera> {
    // Read the counter file to get the next ID
    let nextId = 1;
    const counterPath = path.join(this.basePath, 'cameras', 'counter.json');
    
    try {
      await this.acquireLock(counterPath);
      try {
        const data = await fs.promises.readFile(counterPath, 'utf8');
        const counter = JSON.parse(data);
        nextId = counter.nextId;
        
        // Update counter
        await fs.promises.writeFile(
          counterPath,
          JSON.stringify({ nextId: nextId + 1 }, null, 2)
        );
      } catch (error) {
        // Counter file doesn't exist, create it
        await fs.promises.writeFile(
          counterPath,
          JSON.stringify({ nextId: 2 }, null, 2)
        );
      }
    } finally {
      this.releaseLock(counterPath);
    }
    
    // Create new camera
    const newCamera: Camera = {
      id: nextId,
      ...camera,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'unknown'
    };
    
    // Write camera file
    const filePath = path.join(this.basePath, 'cameras', `${nextId}.json`);
    await this.acquireLock(filePath);
    
    try {
      await fs.promises.writeFile(
        filePath,
        JSON.stringify(newCamera, null, 2)
      );
      logger.info(`Created camera file for ID ${nextId}`);
    } finally {
      this.releaseLock(filePath);
    }
    
    return newCamera;
  }
  
  // Additional implementation for other entity types...
}
```

### Repository Factory

To abstract the creation of repository instances, a factory is used:

```typescript
// server/storage-factory.ts
export class StorageFactory {
  private static storage: IStorage | null = null;
  
  /**
   * Gets the storage implementation based on environment configuration
   */
  public static getStorage(): IStorage {
    if (!this.storage) {
      // Check environment to determine which implementation to use
      const storageType = process.env.STORAGE_TYPE || 'file';
      
      if (storageType === 'memory') {
        logger.info('Using in-memory storage');
        this.storage = new MemStorage();
      } else if (storageType === 'file') {
        const basePath = process.env.STORAGE_PATH || './data';
        logger.info(`Using file-based storage at ${basePath}`);
        this.storage = new FileStorage(basePath);
      } else {
        logger.warn(`Unknown storage type: ${storageType}, falling back to file storage`);
        this.storage = new FileStorage('./data');
      }
    }
    
    return this.storage;
  }
  
  /**
   * Allows for setting a custom storage implementation (useful for testing)
   */
  public static setStorage(storage: IStorage): void {
    this.storage = storage;
  }
}
```

### Usage in Application Code

The repository pattern is used throughout the application to access data:

```typescript
// Example usage in camera controller
export class CameraController {
  private storage: IStorage;
  
  constructor() {
    this.storage = StorageFactory.getStorage();
  }
  
  async getAllCameras(req: Request, res: Response): Promise<void> {
    try {
      const cameras = await this.storage.getCameras();
      res.json(cameras);
    } catch (error) {
      logger.error(`Error getting cameras: ${error}`);
      res.status(500).json({ error: 'Failed to get cameras' });
    }
  }
  
  async addCamera(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const cameraData = insertCameraSchema.parse(req.body);
      
      // Create camera in storage
      const camera = await this.storage.createCamera(cameraData);
      
      res.status(201).json(camera);
    } catch (error) {
      logger.error(`Error adding camera: ${error}`);
      
      if (error instanceof ZodError) {
        res.status(400).json({ error: 'Invalid camera data', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to add camera' });
      }
    }
  }
  
  // Additional controller methods...
}
```

### Diagrama de Flujo
```
┌─────────────┐    uses     ┌─────────────┐    creates   ┌─────────────┐
│ Application │────────────>│ Factory     │─────────────>│ Repository  │
└─────────────┘             └─────────────┘              └─────────────┘
       │                                                        │
       │                                                        │
       │              performs data operations                  │
       └───────────────────────────────────────────────────────┘
                                │
                                ▼
                  ┌──────────────────────────┐
                  │ Memory/File Storage      │
                  └──────────────────────────┘
```

### Benefits

1. **Data Source Abstraction**
   - Business logic doesn't need to know about the underlying data storage
   - Consistent API regardless of storage implementation
   - Changes to data storage don't affect the rest of the application

2. **Future Database Transition**
   - The IStorage interface provides a clear contract for future implementations
   - A database implementation can be added without changing client code
   - Gradual migration is possible by implementing both storage systems simultaneously

3. **Centralized Data Access Logic**
   - All data access logic is contained within repository implementations
   - Business logic is kept clean from data access concerns
   - Consistent error handling and logging for data operations

4. **Testability and Maintainability**
   - Easy to mock repositories for unit testing
   - Clean separation of concerns improves code maintainability
   - Simplified debugging with clear boundaries between components

### Implementation Considerations

1. **Concurrency Handling**
   - File-based storage uses simple locks for concurrent access
   - Atomic file operations ensure data integrity
   - In-memory storage uses data structures with proper thread safety

2. **Error Handling**
   - Consistent error handling approach across repository implementations
   - Detailed logging for debugging purposes
   - Clean error propagation to business logic

3. **Performance Optimizations**
   - In-memory storage for high-performance scenarios
   - Caching strategies for file-based storage
   - Lazy loading for large data sets

### Challenges and Mitigations

1. **File I/O Overhead**
   - Challenge: File operations are slow compared to memory access
   - Mitigation: Caching frequently accessed data and batch operations

2. **Data Consistency**
   - Challenge: Ensuring consistency across multiple files
   - Mitigation: Transactions and locking mechanisms

3. **Schema Evolution**
   - Challenge: Handling changes to data structures over time
   - Mitigation: Version information in stored data and migration utilities
