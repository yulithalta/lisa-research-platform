import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import mqtt from "mqtt";

/**
 * Hook for managing MQTT connection with support for friendly names
 * Optimized for Zigbee LivingLab environment
 */
export function useMqtt() {
  // States
  const [sensorMessages, setSensorMessages] = useState([]);
  const [sensorData, setSensorData] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [friendlyNames, setFriendlyNames] = useState({});
  const [mqttStatus, setMqttStatus] = useState('idle');
  
  // References for connection control
  const clientRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  
  // Configuration with useMemo to avoid ESLint warnings
  const config = useMemo(() => ({
    MQTT_BROKER: "ws://192.168.0.20:9001",
    MQTT_TOPICS: ["zigbee2mqtt/+", "zigbee2mqtt/livinglab/device/#"],
    USER_VISIBLE_TOPICS: ["zigbee2mqtt/livinglab/device/"],
    MAX_RECONNECT_ATTEMPTS: 5,
    RECONNECT_INTERVAL: 3000 // 3 seconds
  }), []);
  
  // Get friendly name for a sensor
  const getFriendlyName = useCallback((topic, payload) => {
    // If we already have a friendly name for this topic, use it
    if (friendlyNames[topic]) {
      return friendlyNames[topic];
    }
    
    // Try to extract friendly_name from payload if it exists
    if (payload && typeof payload === 'object') {
      if (payload.friendly_name) {
        return payload.friendly_name;
      }
      if (payload.device && payload.device.friendly_name) {
        return payload.device.friendly_name;
      }
      if (payload.name) {
        return payload.name;
      }
    }
    
    // For livinglab device topics, construct complete friendly name
    if (topic.includes('livinglab/device/')) {
      // Extract the ID from topic (last part)
      const parts = topic.split('/');
      const deviceId = parts[parts.length - 1];
      
      // Use complete format Sensor-X-Sonoff-SNZB-04
      const deviceNumber = parts.length > 3 ? parts[parts.length - 2] : '';
      return `Sensor-${deviceNumber || deviceId.slice(-1)}-Sonoff-SNZB-04`;
    }
    
    // For zigbee2mqtt topics, extract the relevant part
    if (topic.startsWith('zigbee2mqtt/')) {
      const devicePart = topic.replace('zigbee2mqtt/', '');
      
      // Get the final part of the path (after last /)
      const pathParts = devicePart.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      
      // For livinglab device topics, construct friendly name
      if (devicePart.includes('livinglab/device/')) {
        const match = devicePart.match(/livinglab\/device\/(\d+)\/([0-9A-Fa-f]+)/);
        if (match) {
          return `Sensor-${match[1]}-Sonoff-SNZB-04`;
        }
      }
      
      // If name looks like IEEE address (hex format)
      if (/^([0-9A-Fa-f]{2}[:-]){7}([0-9A-Fa-f]{2})$/.test(lastPart) || 
          /^0x[0-9A-Fa-f]+$/.test(lastPart)) {
        // Extract device number from path if exists
        const deviceMatch = devicePart.match(/\/(\d+)\//);
        const deviceNumber = deviceMatch ? deviceMatch[1] : '';
        return `Sensor-${deviceNumber || lastPart.slice(-1)}-Sonoff-SNZB-04`;
      }
      
      // If it looks like a numbered sensor (sensor-1, sensor-2, etc.)
      if (/^sensor-\d+$/.test(lastPart)) {
        const sensorNum = lastPart.replace('sensor-', '');
        return `Sensor-${sensorNum}-Sonoff-SNZB-04`;
      }
      
      // Try to extract a more readable name
      return lastPart;
    }
    
    // Return topic as last resort
    return topic;
  }, [friendlyNames]);
  
  // Process received messages
  const processMessages = useCallback(() => {
    if (sensorMessages.length === 0) return;
    
    try {
      const processedData = {};
      const newFriendlyNames = {...friendlyNames};
      
      // Iterate through all received messages
      sensorMessages.forEach((msg) => {
        try {
          // 1. Determine name for this topic
          const topicKey = msg.topic;
          
          // Filter system/bridge messages
          if (topicKey.includes('bridge/') || 
              topicKey.endsWith('/bridge') || 
              topicKey.includes('$SYS/')) return;
              
          // Determine if this is a priority topic (should be visible to users)
          const isPriorityTopic = config.USER_VISIBLE_TOPICS.some(prefix => 
            topicKey.includes(prefix)
          );
          
          // 2. Get friendly name for sensor
          let friendlyName = getFriendlyName(topicKey, msg.payload);
          
          // Update friendly names map if valid
          if (friendlyName && friendlyName !== topicKey) {
            newFriendlyNames[topicKey] = friendlyName;
          }
          
          // 3. Initialize array for this sensor
          if (!processedData[topicKey]) processedData[topicKey] = [];
          
          // 4. Determine contact state precisely
          let contactValue;
          
          if (typeof msg.payload.contact === 'boolean') {
            contactValue = msg.payload.contact ? 0 : 1; // true = open (0), false = closed (1)
          } else if (msg.payload.contact === 'true' || 
                  msg.payload.contact === 'open' || 
                  msg.payload.contact === 'OPEN' ||
                  msg.payload.contact === 0) {
            contactValue = 0; // Open
          } else if (msg.payload.contact === 'false' || 
                  msg.payload.contact === 'closed' || 
                  msg.payload.contact === 'CLOSED' ||
                  msg.payload.contact === 1) {
            contactValue = 1; // Closed
          } else if (msg.payload.state === 'ON' || msg.payload.state === true) {
            contactValue = 1; // Open/Active
          } else if (msg.payload.state === 'OFF' || msg.payload.state === false) {
            contactValue = 0; // Closed/Inactive
          } else {
            // Use default if we can't determine, but log it
            console.warn(`Unknown value for sensor ${friendlyName}:`, 
                        msg.payload.contact || msg.payload.state);
            contactValue = 0;
          }
          
          // 5. Add data point with priority info
          processedData[topicKey].push({
            x: msg.timestamp || new Date(),
            y: contactValue,
            battery: typeof msg.payload.battery === 'number' ? msg.payload.battery : 
                      (msg.payload.battery_level ? msg.payload.battery_level : 0),
            linkquality: typeof msg.payload.linkquality === 'number' ? msg.payload.linkquality : 
                        (msg.payload.link_quality ? msg.payload.link_quality : 0),
            friendlyName: friendlyName, // Store friendly name with each point
            payload: msg.payload, // Store complete payload for reference
            isPriorityDevice: isPriorityTopic // Mark if this is a user-visible device
          });
          
          // 6. Keep only latest points for performance
          if (processedData[topicKey].length > 100) {
            processedData[topicKey] = processedData[topicKey].slice(-100);
          }
        } catch (error) {
          console.error(`Error processing sensor message:`, error);
        }
      });
      
      // Update friendly names if changed
      if (Object.keys(newFriendlyNames).length !== Object.keys(friendlyNames).length) {
        setFriendlyNames(newFriendlyNames);
      }
      
      // Sort by timestamp
      Object.keys(processedData).forEach(key => {
        processedData[key].sort((a, b) => new Date(a.x) - new Date(b.x));
      });
      
      setSensorData(processedData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error in data processing:", error);
    }
  }, [sensorMessages, friendlyNames, getFriendlyName, config.USER_VISIBLE_TOPICS]);
  
  // Filter only priority devices for regular users
  const getPriorityDevices = useCallback(() => {
    const priorityData = {};
    
    Object.keys(sensorData).forEach(topic => {
      // Only include priority topics for regular users
      const isPriority = config.USER_VISIBLE_TOPICS.some(prefix => 
        topic.includes(prefix)
      ) || (
        sensorData[topic].length > 0 && 
        sensorData[topic].some(point => point.isPriorityDevice)
      );
      
      if (isPriority) {
        priorityData[topic] = sensorData[topic];
      }
    });
    
    return priorityData;
  }, [sensorData, config.USER_VISIBLE_TOPICS]);
  
  // Process messages when changed
  useEffect(() => {
    if (sensorMessages.length > 0) {
      processMessages();
    }
  }, [sensorMessages, processMessages]);
  
  // Set up MQTT connection on start
  useEffect(() => {
    console.log("Establishing MQTT connection...");
    let reconnectCount = 0;
    
    const connect = () => {
      try {
        setMqttStatus('connecting');
        
        const options = {
          keepalive: 60,
          clientId: `zigbee_monitor_${Math.random().toString(16).substring(2, 10)}`,
          protocolId: 'MQTT',
          protocolVersion: 4,
          clean: true,
          reconnectPeriod: 5000,
          connectTimeout: 30 * 1000,
          rejectUnauthorized: false
        };

        console.log(`Connecting to MQTT broker: ${config.MQTT_BROKER}`);
        const client = mqtt.connect(config.MQTT_BROKER, options);
        clientRef.current = client;
        
        client.on("connect", () => {
          console.log("✅ Connected to MQTT broker");
          setIsConnected(true);
          setConnectionError(null);
          setMqttStatus('connected');
          reconnectCount = 0;
          
          // Subscribe to topics
          client.subscribe([...config.MQTT_TOPICS, 'zigbee2mqtt/bridge/devices'], (err) => {
            if (err) {
              console.error("Subscription error:", err);
              setConnectionError(`Error subscribing to sensors: ${err.message}`);
              setMqttStatus('error');
            } else {
              console.log(`Monitoring active for ${config.MQTT_TOPICS.join(', ')}`);
              
              // Request device list
              setTimeout(() => {
                client.publish('zigbee2mqtt/bridge/request/devices', '');
              }, 1000);
            }
          });
        });
        
        client.on("message", (topic, message) => {
          try {
            // Process MQTT message
            let payload;
            try {
              payload = JSON.parse(message.toString());
            } catch (e) {
              // If not valid JSON, use as text
              payload = { raw: message.toString() };
            }
            
            // Handle device list topic
            if (topic === 'zigbee2mqtt/bridge/devices') {
              // Process device list to extract friendly names
              const nameMap = {...friendlyNames};
              
              if (Array.isArray(payload)) {
                payload.forEach(device => {
                  if (device.ieee_address && device.friendly_name) {
                    // Store friendly name by IEEE address
                    nameMap[device.ieee_address] = device.friendly_name;
                    
                    // Also map by zigbee2mqtt path
                    nameMap[`zigbee2mqtt/${device.ieee_address}`] = device.friendly_name;
                    nameMap[`zigbee2mqtt/livinglab/device/${device.ieee_address}`] = device.friendly_name;
                    
                    // Map by friendly name path too
                    nameMap[`zigbee2mqtt/${device.friendly_name}`] = device.friendly_name;
                  }
                });
                
                setFriendlyNames(nameMap);
                console.log("✅ Friendly names updated");
              }
              
              return; // Skip processing this as sensor message
            }
            
            // Store regular message
            setSensorMessages(prev => {
              const messages = [...prev, { 
                topic, 
                payload, 
                timestamp: new Date() 
              }];
              
              // Limit quantity
              return messages.length > 2000 ? messages.slice(-2000) : messages;
            });
          } catch (error) {
            console.error(`Error processing MQTT message for topic ${topic}:`, error);
          }
        });
        
        client.on("error", (err) => {
          console.error("MQTT connection error:", err);
          setConnectionError(`Connection error: ${err.message}`);
          setIsConnected(false);
          setMqttStatus('error');
          
          // Retry if under limit
          if (reconnectCount < config.MAX_RECONNECT_ATTEMPTS) {
            reconnectCount++;
            console.log(`Retrying connection (${reconnectCount}/${config.MAX_RECONNECT_ATTEMPTS})...`);
            
            reconnectTimerRef.current = setTimeout(() => {
              reconnect();
            }, config.RECONNECT_INTERVAL);
          } else {
            console.error("Max reconnection attempts reached");
            setConnectionError("Failed to connect after multiple attempts. Check network and MQTT server.");
          }
        });
        
        client.on("offline", () => {
          console.warn("MQTT client disconnected");
          setIsConnected(false);
          setMqttStatus('disconnected');
        });
        
        client.on("reconnect", () => {
          console.log("Reconnecting to MQTT broker...");
          setMqttStatus('reconnecting');
        });
        
        return client;
      } catch (error) {
        console.error("Error initializing MQTT client:", error);
        setConnectionError(`Connection initialization error: ${error.message}`);
        setMqttStatus('error');
        return null;
      }
    };
    
    // Reconnection function
    const reconnect = () => {
      if (clientRef.current) {
        try {
          clientRef.current.end(true);
        } catch (e) {
          console.error("Error closing previous MQTT connection:", e);
        }
        clientRef.current = null;
      }
      
      connect();
    };
    
    // Initial connection
    const client = connect();
    
    // Cleanup on unmount
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      
      if (client) {
        try {
          console.log("Closing MQTT connection");
          client.end(true);
        } catch (e) {
          console.error("Error closing MQTT client:", e);
        }
      }
    };
  }, [config]);

  // Export data as JSON (for auditing)
  const exportData = useCallback(() => {
    try {
      const exportObj = {
        timestamp: new Date().toISOString(),
        environment: "Zigbee Monitoring System",
        connectionStatus: isConnected ? "Connected" : "Disconnected",
        sensors: sensorData,
        friendlyNames: friendlyNames,
        dataPoints: Object.values(sensorData).flat().length
      };
      
      // Convert to JSON string
      const jsonData = JSON.stringify(exportObj, null, 2);
      
      // Create blob and download
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      
      // Filename with timestamp for audit
      a.href = url;
      a.download = `zigbee-sensors-audit-${new Date().toISOString().replace(/:/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error("Error exporting audit data:", error);
      return false;
    }
  }, [isConnected, sensorData, friendlyNames]);

  // Manual reconnection
  const reconnect = useCallback(() => {
    console.log("Manual reconnection requested");
    setMqttStatus('connecting');
    
    if (clientRef.current) {
      try {
        clientRef.current.end(true);
      } catch (e) {
        console.error("Error closing previous connection:", e);
      }
      clientRef.current = null;
    }
    
    // Create new broker connection
    const options = {
      keepalive: 60,
      clientId: `zigbee_monitor_${Math.random().toString(16).substring(2, 10)}`,
      clean: true,
    };
    
    try {
      console.log(`Reconnecting to ${config.MQTT_BROKER}...`);
      const client = mqtt.connect(config.MQTT_BROKER, options);
      clientRef.current = client;
      
      client.on("connect", () => {
        console.log("✅ Reconnection successful");
        setIsConnected(true);
        setConnectionError(null);
        setMqttStatus('connected');
        
        client.subscribe(config.MQTT_TOPICS, (err) => {
          if (err) {
            console.error("Subscription error:", err);
            setConnectionError(`Subscription error: ${err.message}`);
            setMqttStatus('error');
          }
        });
      });
      
      // Set up message handler
      client.on("message", (topic, message) => {
        try {
          let payload;
          try {
            payload = JSON.parse(message.toString());
          } catch (e) {
            payload = { raw: message.toString() };
          }
          
          setSensorMessages(prev => [...prev, { topic, payload, timestamp: new Date() }]);
        } catch (error) {
          console.error(`Error processing message:`, error);
        }
      });
      
      client.on("error", (err) => {
        console.error("Reconnection error:", err);
        setConnectionError(`Reconnection error: ${err.message}`);
        setIsConnected(false);
        setMqttStatus('error');
      });
    } catch (error) {
      console.error("Error initiating reconnection:", error);
      setConnectionError(`Reconnection initialization error: ${error.message}`);
      setMqttStatus('error');
    }
  }, [config]);

  // Return data and functions
  return {
    sensorData,         // All data (for dev mode)
    priorityDevices: getPriorityDevices(), // Only priority devices (for users)
    isConnected,
    connectionError,
    reconnect,
    exportData,
    lastUpdate,
    friendlyNames,
    mqttStatus
  };
}