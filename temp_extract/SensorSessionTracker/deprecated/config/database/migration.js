// LISA Data Migration Script
// From JSON file-based storage to PostgreSQL Database
// Version 1.0 - April 2025

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('@neondatabase/serverless');
const bcrypt = require('bcrypt');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Paths to data files
const DATA_DIR = path.join(__dirname, '../../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const RECORDINGS_DIR = path.join(__dirname, '../../recordings');

// Utility functions
const readJSONFile = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return [];
  }
};

const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

// Migration functions
async function migrateUsers() {
  const users = readJSONFile(USERS_FILE);
  console.log(`Found ${users.length} users to migrate`);

  for (const user of users) {
    try {
      // Hash the password if it's not already hashed
      let hashedPassword = user.password;
      if (!hashedPassword.startsWith('$2b$') && !hashedPassword.startsWith('$2a$')) {
        hashedPassword = await hashPassword(user.password);
      }

      const result = await pool.query(
        'INSERT INTO users (id, username, password, email, full_name, role) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET username = $2, password = $3, email = $4, full_name = $5, role = $6 RETURNING id',
        [user.id, user.username, hashedPassword, user.email || null, user.fullName || null, user.role || 'user']
      );
      
      console.log(`Migrated user ${user.id}: ${user.username}`);
    } catch (err) {
      console.error(`Error migrating user ${user.id}:`, err);
    }
  }
}

async function migrateCameras() {
  const users = readJSONFile(USERS_FILE);
  
  for (const user of users) {
    const userCamerasFile = path.join(DATA_DIR, `user_${user.id}`, 'cameras.json');
    const cameras = readJSONFile(userCamerasFile);
    
    console.log(`Found ${cameras.length} cameras for user ${user.id}`);
    
    for (const camera of cameras) {
      try {
        const result = await pool.query(
          'INSERT INTO cameras (id, user_id, name, ip_address, port, username, password, stream_url, status, enabled) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO UPDATE SET name = $3, ip_address = $4, port = $5, username = $6, password = $7, stream_url = $8, status = $9, enabled = $10 RETURNING id',
          [
            camera.id,
            user.id,
            camera.name,
            camera.ipAddress,
            camera.port || 80,
            camera.username || null,
            camera.password || null,
            camera.streamUrl || null,
            camera.status || 'offline',
            camera.enabled !== false
          ]
        );
        
        console.log(`Migrated camera ${camera.id}: ${camera.name} for user ${user.id}`);
      } catch (err) {
        console.error(`Error migrating camera ${camera.id}:`, err);
      }
    }
  }
}

async function migrateSensors() {
  const users = readJSONFile(USERS_FILE);
  
  for (const user of users) {
    const userSensorsFile = path.join(DATA_DIR, `user_${user.id}`, 'sensors.json');
    const sensors = readJSONFile(userSensorsFile);
    
    console.log(`Found ${sensors.length} sensors for user ${user.id}`);
    
    for (const sensor of sensors) {
      try {
        const result = await pool.query(
          'INSERT INTO sensors (id, user_id, name, type, mqtt_topic, zigbee_id, status, battery_level, last_reading, enabled) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO UPDATE SET name = $3, type = $4, mqtt_topic = $5, zigbee_id = $6, status = $7, battery_level = $8, last_reading = $9, enabled = $10 RETURNING id',
          [
            sensor.id,
            user.id,
            sensor.name,
            sensor.type,
            sensor.mqttTopic || null,
            sensor.zigbeeId || null,
            sensor.status || 'offline',
            sensor.batteryLevel || null,
            sensor.lastReading ? JSON.stringify(sensor.lastReading) : null,
            sensor.enabled !== false
          ]
        );
        
        console.log(`Migrated sensor ${sensor.id}: ${sensor.name} for user ${user.id}`);
      } catch (err) {
        console.error(`Error migrating sensor ${sensor.id}:`, err);
      }
    }
  }
}

async function migrateSessions() {
  const users = readJSONFile(USERS_FILE);
  
  for (const user of users) {
    const userRecordingsFile = path.join(DATA_DIR, `user_${user.id}`, 'recordings.json');
    const sessions = readJSONFile(userRecordingsFile);
    
    console.log(`Found ${sessions.length} sessions for user ${user.id}`);
    
    for (const session of sessions) {
      try {
        // First, insert the session
        const result = await pool.query(
          'INSERT INTO sessions (id, user_id, name, status, start_time, end_time, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO UPDATE SET name = $3, status = $4, start_time = $5, end_time = $6, notes = $7 RETURNING id',
          [
            session.id,
            user.id,
            session.name,
            session.status || 'completed',
            session.startTime ? new Date(session.startTime) : null,
            session.endTime ? new Date(session.endTime) : null,
            session.notes || null
          ]
        );
        
        const sessionId = result.rows[0].id;
        console.log(`Migrated session ${sessionId}: ${session.name} for user ${user.id}`);
        
        // Next, insert the cameras for this session
        if (session.cameras && Array.isArray(session.cameras)) {
          for (const camera of session.cameras) {
            try {
              await pool.query(
                'INSERT INTO session_cameras (session_id, camera_id, recording_path, status) VALUES ($1, $2, $3, $4) ON CONFLICT (session_id, camera_id) DO UPDATE SET recording_path = $3, status = $4',
                [
                  sessionId,
                  camera.id,
                  camera.recordingPath || null,
                  camera.status || 'completed'
                ]
              );
              
              console.log(`Migrated camera ${camera.id} for session ${sessionId}`);
            } catch (err) {
              console.error(`Error migrating camera ${camera.id} for session ${sessionId}:`, err);
            }
          }
        }
        
        // Insert the sensors for this session
        if (session.sensors && Array.isArray(session.sensors)) {
          for (const sensor of session.sensors) {
            try {
              await pool.query(
                'INSERT INTO session_sensors (session_id, sensor_id) VALUES ($1, $2) ON CONFLICT (session_id, sensor_id) DO NOTHING',
                [sessionId, sensor.id]
              );
              
              console.log(`Migrated sensor ${sensor.id} for session ${sessionId}`);
            } catch (err) {
              console.error(`Error migrating sensor ${sensor.id} for session ${sessionId}:`, err);
            }
          }
        }
      } catch (err) {
        console.error(`Error migrating session ${session.id}:`, err);
      }
    }
  }
}

async function migrateSensorEvents() {
  const users = readJSONFile(USERS_FILE);
  
  for (const user of users) {
    const userSensorEventsFile = path.join(DATA_DIR, `user_${user.id}`, 'sensor_events.json');
    const sensorEvents = readJSONFile(userSensorEventsFile);
    
    console.log(`Found ${sensorEvents.length} sensor events for user ${user.id}`);
    
    for (const event of sensorEvents) {
      try {
        // Find the session ID if available
        let sessionId = null;
        if (event.sessionId) {
          sessionId = event.sessionId;
        }
        
        await pool.query(
          'INSERT INTO sensor_events (sensor_id, session_id, event_type, timestamp, value, processed) VALUES ($1, $2, $3, $4, $5, $6)',
          [
            event.sensorId,
            sessionId,
            event.eventType || 'reading',
            event.timestamp ? new Date(event.timestamp) : new Date(),
            JSON.stringify(event.value),
            event.processed || false
          ]
        );
        
        console.log(`Migrated sensor event for sensor ${event.sensorId}`);
      } catch (err) {
        console.error(`Error migrating sensor event for sensor ${event.sensorId}:`, err);
      }
    }
  }
}

// Main migration function
async function migrateData() {
  console.log('Starting migration from JSON files to PostgreSQL database...');
  
  try {
    // Check database connection
    await pool.query('SELECT NOW()');
    console.log('Database connection successful');
    
    // Perform migrations in sequence to maintain referential integrity
    await migrateUsers();
    await migrateCameras();
    await migrateSensors();
    await migrateSessions();
    await migrateSensorEvents();
    
    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Error during migration:', err);
  } finally {
    await pool.end();
  }
}

// Run the migration
migrateData().catch(console.error);