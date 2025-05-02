/**
 * LISA System - PostgreSQL Database Storage Implementation
 * 
 * This file implements IStorage interface using PostgreSQL database
 * It replaces the MemStorage implementation to provide persistent storage
 */

require('dotenv').config();
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const connectPg = require('connect-pg-simple');

// Create database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create session store
const PostgresSessionStore = connectPg(require('express-session'));
const sessionStore = new PostgresSessionStore({
  pool,
  tableName: 'session', // Default table name
  createTableIfMissing: true
});

/**
 * DatabaseStorage implements the IStorage interface using PostgreSQL database
 */
class DatabaseStorage {
  constructor() {
    this.sessionStore = sessionStore;
    this.pool = pool;
    
    // Initialize connection
    this.init().catch(err => {
      console.error('Error initializing DatabaseStorage:', err);
    });
  }

  /**
   * Initialize the database connection
   */
  async init() {
    try {
      // Test database connection
      const result = await this.pool.query('SELECT NOW()');
      console.log(`[INFO] Conectado a la base de datos PostgreSQL. Hora del servidor: ${result.rows[0].now}`);
    } catch (error) {
      console.error(`[ERROR] Error conectando a la base de datos: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user by ID
   * @param {number} id - User ID
   * @returns {Promise<User|undefined>} User object or undefined if not found
   */
  async getUser(id) {
    try {
      const query = 'SELECT * FROM users WHERE id = $1';
      const { rows } = await this.pool.query(query, [id]);
      
      if (rows.length === 0) {
        return undefined;
      }
      
      return rows[0];
    } catch (error) {
      console.error(`[ERROR] Error getting user ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user by username
   * @param {string} username - Username
   * @returns {Promise<User|undefined>} User object or undefined if not found
   */
  async getUserByUsername(username) {
    try {
      const query = 'SELECT * FROM users WHERE username = $1';
      const { rows } = await this.pool.query(query, [username]);
      
      if (rows.length === 0) {
        return undefined;
      }
      
      return rows[0];
    } catch (error) {
      console.error(`[ERROR] Error getting user by username ${username}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a new user
   * @param {InsertUser} userData - User data
   * @returns {Promise<User>} Created user
   */
  async createUser(userData) {
    try {
      const query = `
        INSERT INTO users (username, password, email, role)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const values = [
        userData.username,
        userData.password,
        userData.email || null,
        userData.role || 'user'
      ];
      
      const { rows } = await this.pool.query(query, values);
      return rows[0];
    } catch (error) {
      console.error(`[ERROR] Error creating user ${userData.username}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get cameras for a user
   * @param {number} userId - User ID
   * @returns {Promise<Camera[]>} Array of cameras
   */
  async getCameras(userId) {
    try {
      const query = 'SELECT * FROM cameras WHERE user_id = $1 ORDER BY created_at DESC';
      const { rows } = await this.pool.query(query, [userId]);
      
      // Transform database column names to camelCase for consistency
      return rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        ipAddress: row.ip_address,
        rtspUrl: row.rtsp_url,
        httpUrl: row.http_url,
        username: row.username,
        password: row.password,
        status: row.status,
        lastCheck: row.last_check,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error(`[ERROR] Error getting cameras for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get camera by ID
   * @param {string} id - Camera ID
   * @returns {Promise<Camera|undefined>} Camera object or undefined if not found
   */
  async getCamera(id) {
    try {
      const query = 'SELECT * FROM cameras WHERE id = $1';
      const { rows } = await this.pool.query(query, [id]);
      
      if (rows.length === 0) {
        return undefined;
      }
      
      const row = rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        ipAddress: row.ip_address,
        rtspUrl: row.rtsp_url,
        httpUrl: row.http_url,
        username: row.username,
        password: row.password,
        status: row.status,
        lastCheck: row.last_check,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      console.error(`[ERROR] Error getting camera ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a new camera
   * @param {InsertCamera} cameraData - Camera data
   * @returns {Promise<Camera>} Created camera
   */
  async createCamera(cameraData) {
    try {
      const query = `
        INSERT INTO cameras (
          id, user_id, name, ip_address, rtsp_url, http_url,
          username, password, status, last_check
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      
      const values = [
        cameraData.id || uuidv4(),
        cameraData.userId,
        cameraData.name,
        cameraData.ipAddress,
        cameraData.rtspUrl || null,
        cameraData.httpUrl || null,
        cameraData.username || null,
        cameraData.password || null,
        cameraData.status || 'unknown',
        cameraData.lastCheck || null
      ];
      
      const { rows } = await this.pool.query(query, values);
      const row = rows[0];
      
      return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        ipAddress: row.ip_address,
        rtspUrl: row.rtsp_url,
        httpUrl: row.http_url,
        username: row.username,
        password: row.password,
        status: row.status,
        lastCheck: row.last_check,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      console.error(`[ERROR] Error creating camera ${cameraData.name}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update camera
   * @param {string} id - Camera ID
   * @param {Partial<Camera>} cameraData - Camera data to update
   * @returns {Promise<Camera>} Updated camera
   */
  async updateCamera(id, cameraData) {
    try {
      // Build dynamic update query based on provided fields
      const updates = [];
      const values = [id];
      let paramIndex = 2;
      
      if ('userId' in cameraData) {
        updates.push(`user_id = $${paramIndex++}`);
        values.push(cameraData.userId);
      }
      
      if ('name' in cameraData) {
        updates.push(`name = $${paramIndex++}`);
        values.push(cameraData.name);
      }
      
      if ('ipAddress' in cameraData) {
        updates.push(`ip_address = $${paramIndex++}`);
        values.push(cameraData.ipAddress);
      }
      
      if ('rtspUrl' in cameraData) {
        updates.push(`rtsp_url = $${paramIndex++}`);
        values.push(cameraData.rtspUrl);
      }
      
      if ('httpUrl' in cameraData) {
        updates.push(`http_url = $${paramIndex++}`);
        values.push(cameraData.httpUrl);
      }
      
      if ('username' in cameraData) {
        updates.push(`username = $${paramIndex++}`);
        values.push(cameraData.username);
      }
      
      if ('password' in cameraData) {
        updates.push(`password = $${paramIndex++}`);
        values.push(cameraData.password);
      }
      
      if ('status' in cameraData) {
        updates.push(`status = $${paramIndex++}`);
        values.push(cameraData.status);
      }
      
      if ('lastCheck' in cameraData) {
        updates.push(`last_check = $${paramIndex++}`);
        values.push(cameraData.lastCheck);
      }
      
      if (updates.length === 0) {
        // No fields to update, just return the current camera
        return this.getCamera(id);
      }
      
      const query = `
        UPDATE cameras
        SET ${updates.join(', ')}
        WHERE id = $1
        RETURNING *
      `;
      
      const { rows } = await this.pool.query(query, values);
      if (rows.length === 0) {
        throw new Error(`Camera with ID ${id} not found`);
      }
      
      const row = rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        ipAddress: row.ip_address,
        rtspUrl: row.rtsp_url,
        httpUrl: row.http_url,
        username: row.username,
        password: row.password,
        status: row.status,
        lastCheck: row.last_check,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      console.error(`[ERROR] Error updating camera ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete camera
   * @param {string} id - Camera ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async deleteCamera(id) {
    try {
      const query = 'DELETE FROM cameras WHERE id = $1 RETURNING id';
      const { rowCount } = await this.pool.query(query, [id]);
      
      return rowCount > 0;
    } catch (error) {
      console.error(`[ERROR] Error deleting camera ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get sensors for a user
   * @param {number} userId - User ID
   * @returns {Promise<Sensor[]>} Array of sensors
   */
  async getSensors(userId) {
    try {
      const query = 'SELECT * FROM sensors WHERE user_id = $1 ORDER BY created_at DESC';
      const { rows } = await this.pool.query(query, [userId]);
      
      // Transform database column names to camelCase for consistency
      return rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        type: row.type,
        topic: row.topic,
        status: row.status,
        lastReading: row.last_reading,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error(`[ERROR] Error getting sensors for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get sensor by ID
   * @param {string} id - Sensor ID
   * @returns {Promise<Sensor|undefined>} Sensor object or undefined if not found
   */
  async getSensor(id) {
    try {
      const query = 'SELECT * FROM sensors WHERE id = $1';
      const { rows } = await this.pool.query(query, [id]);
      
      if (rows.length === 0) {
        return undefined;
      }
      
      const row = rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        type: row.type,
        topic: row.topic,
        status: row.status,
        lastReading: row.last_reading,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      console.error(`[ERROR] Error getting sensor ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a new sensor
   * @param {InsertSensor} sensorData - Sensor data
   * @returns {Promise<Sensor>} Created sensor
   */
  async createSensor(sensorData) {
    try {
      const query = `
        INSERT INTO sensors (
          id, user_id, name, type, topic, status, last_reading
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const values = [
        sensorData.id || uuidv4(),
        sensorData.userId,
        sensorData.name,
        sensorData.type,
        sensorData.topic || null,
        sensorData.status || 'unknown',
        sensorData.lastReading || null
      ];
      
      const { rows } = await this.pool.query(query, values);
      const row = rows[0];
      
      return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        type: row.type,
        topic: row.topic,
        status: row.status,
        lastReading: row.last_reading,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      console.error(`[ERROR] Error creating sensor ${sensorData.name}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update sensor
   * @param {string} id - Sensor ID
   * @param {Partial<Sensor>} sensorData - Sensor data to update
   * @returns {Promise<Sensor>} Updated sensor
   */
  async updateSensor(id, sensorData) {
    try {
      // Build dynamic update query based on provided fields
      const updates = [];
      const values = [id];
      let paramIndex = 2;
      
      if ('userId' in sensorData) {
        updates.push(`user_id = $${paramIndex++}`);
        values.push(sensorData.userId);
      }
      
      if ('name' in sensorData) {
        updates.push(`name = $${paramIndex++}`);
        values.push(sensorData.name);
      }
      
      if ('type' in sensorData) {
        updates.push(`type = $${paramIndex++}`);
        values.push(sensorData.type);
      }
      
      if ('topic' in sensorData) {
        updates.push(`topic = $${paramIndex++}`);
        values.push(sensorData.topic);
      }
      
      if ('status' in sensorData) {
        updates.push(`status = $${paramIndex++}`);
        values.push(sensorData.status);
      }
      
      if ('lastReading' in sensorData) {
        updates.push(`last_reading = $${paramIndex++}`);
        values.push(sensorData.lastReading);
      }
      
      if (updates.length === 0) {
        // No fields to update, just return the current sensor
        return this.getSensor(id);
      }
      
      const query = `
        UPDATE sensors
        SET ${updates.join(', ')}
        WHERE id = $1
        RETURNING *
      `;
      
      const { rows } = await this.pool.query(query, values);
      if (rows.length === 0) {
        throw new Error(`Sensor with ID ${id} not found`);
      }
      
      const row = rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        type: row.type,
        topic: row.topic,
        status: row.status,
        lastReading: row.last_reading,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      console.error(`[ERROR] Error updating sensor ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete sensor
   * @param {string} id - Sensor ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async deleteSensor(id) {
    try {
      const query = 'DELETE FROM sensors WHERE id = $1 RETURNING id';
      const { rowCount } = await this.pool.query(query, [id]);
      
      return rowCount > 0;
    } catch (error) {
      console.error(`[ERROR] Error deleting sensor ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get sessions for a user
   * @param {number} userId - User ID
   * @returns {Promise<Session[]>} Array of sessions
   */
  async getSessions(userId) {
    try {
      const query = 'SELECT * FROM sessions WHERE user_id = $1 ORDER BY created_at DESC';
      const { rows } = await this.pool.query(query, [userId]);
      
      // Get cameras and sensors for each session
      const sessions = [];
      
      for (const row of rows) {
        // Get cameras for this session
        const camerasQuery = `
          SELECT c.*, sc.recording_path, sc.status AS session_status, 
                 sc.start_time, sc.end_time
          FROM cameras c
          JOIN session_cameras sc ON c.id = sc.camera_id
          WHERE sc.session_id = $1
        `;
        const { rows: cameraRows } = await this.pool.query(camerasQuery, [row.id]);
        
        // Get sensors for this session
        const sensorsQuery = `
          SELECT s.*
          FROM sensors s
          JOIN session_sensors ss ON s.id = ss.sensor_id
          WHERE ss.session_id = $1
        `;
        const { rows: sensorRows } = await this.pool.query(sensorsQuery, [row.id]);
        
        // Transform to camelCase
        const cameras = cameraRows.map(cam => ({
          id: cam.id,
          userId: cam.user_id,
          name: cam.name,
          ipAddress: cam.ip_address,
          rtspUrl: cam.rtsp_url,
          httpUrl: cam.http_url,
          username: cam.username,
          password: cam.password,
          status: cam.session_status,
          recordingPath: cam.recording_path,
          startTime: cam.start_time,
          endTime: cam.end_time
        }));
        
        const sensors = sensorRows.map(sensor => ({
          id: sensor.id,
          userId: sensor.user_id,
          name: sensor.name,
          type: sensor.type,
          topic: sensor.topic,
          status: sensor.status
        }));
        
        sessions.push({
          id: row.id,
          userId: row.user_id,
          name: row.name,
          description: row.description,
          laboratoryTitle: row.laboratory_title,
          researcherName: row.researcher_name,
          participants: row.participants || [],
          startTime: row.start_time,
          endTime: row.end_time,
          status: row.status,
          exportPath: row.export_path,
          cameras,
          sensors: sensors.map(s => s.name), // Just the names for compatibility
          createdAt: row.created_at,
          updatedAt: row.updated_at
        });
      }
      
      return sessions;
    } catch (error) {
      console.error(`[ERROR] Error getting sessions for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get session by ID
   * @param {string} id - Session ID
   * @returns {Promise<Session|undefined>} Session object or undefined if not found
   */
  async getSession(id) {
    try {
      const query = 'SELECT * FROM sessions WHERE id = $1';
      const { rows } = await this.pool.query(query, [id]);
      
      if (rows.length === 0) {
        return undefined;
      }
      
      const row = rows[0];
      
      // Get cameras for this session
      const camerasQuery = `
        SELECT c.*, sc.recording_path, sc.status AS session_status, 
               sc.start_time, sc.end_time
        FROM cameras c
        JOIN session_cameras sc ON c.id = sc.camera_id
        WHERE sc.session_id = $1
      `;
      const { rows: cameraRows } = await this.pool.query(camerasQuery, [id]);
      
      // Get sensors for this session
      const sensorsQuery = `
        SELECT s.*
        FROM sensors s
        JOIN session_sensors ss ON s.id = ss.sensor_id
        WHERE ss.session_id = $1
      `;
      const { rows: sensorRows } = await this.pool.query(sensorsQuery, [id]);
      
      // Transform to camelCase
      const cameras = cameraRows.map(cam => ({
        id: cam.id,
        userId: cam.user_id,
        name: cam.name,
        ipAddress: cam.ip_address,
        rtspUrl: cam.rtsp_url,
        httpUrl: cam.http_url,
        username: cam.username,
        password: cam.password,
        status: cam.session_status,
        recordingPath: cam.recording_path,
        startTime: cam.start_time,
        endTime: cam.end_time
      }));
      
      const sensors = sensorRows.map(sensor => ({
        id: sensor.id,
        userId: sensor.user_id,
        name: sensor.name,
        type: sensor.type,
        topic: sensor.topic,
        status: sensor.status
      }));
      
      return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        description: row.description,
        laboratoryTitle: row.laboratory_title,
        researcherName: row.researcher_name,
        participants: row.participants || [],
        startTime: row.start_time,
        endTime: row.end_time,
        status: row.status,
        exportPath: row.export_path,
        cameras,
        sensors: sensors.map(s => s.name), // Just the names for compatibility
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      console.error(`[ERROR] Error getting session ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a new session
   * @param {InsertSession} sessionData - Session data
   * @returns {Promise<Session>} Created session
   */
  async createSession(sessionData) {
    const client = await this.pool.connect();
    
    try {
      // Start transaction
      await client.query('BEGIN');
      
      // Insert session
      const sessionQuery = `
        INSERT INTO sessions (
          id, user_id, name, description, laboratory_title,
          researcher_name, participants, start_time, end_time,
          status, export_path
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const sessionId = sessionData.id || uuidv4();
      
      const sessionValues = [
        sessionId,
        sessionData.userId,
        sessionData.name,
        sessionData.description || null,
        sessionData.laboratoryTitle || null,
        sessionData.researcherName || null,
        sessionData.participants || [],
        sessionData.startTime || null,
        sessionData.endTime || null,
        sessionData.status || 'created',
        sessionData.exportPath || null
      ];
      
      const sessionResult = await client.query(sessionQuery, sessionValues);
      const session = sessionResult.rows[0];
      
      // Associate cameras with session
      if (sessionData.cameras && Array.isArray(sessionData.cameras)) {
        for (const camera of sessionData.cameras) {
          const cameraQuery = `
            INSERT INTO session_cameras (
              session_id, camera_id, recording_path, status,
              start_time, end_time
            )
            VALUES ($1, $2, $3, $4, $5, $6)
          `;
          
          await client.query(cameraQuery, [
            sessionId,
            camera.id,
            camera.recordingPath || null,
            camera.status || 'pending',
            camera.startTime || null,
            camera.endTime || null
          ]);
        }
      }
      
      // Associate sensors with session
      if (sessionData.sensors && Array.isArray(sessionData.sensors)) {
        // Get all sensors for this user to resolve names to IDs
        const sensorsQuery = 'SELECT id, name FROM sensors WHERE user_id = $1';
        const { rows: sensorRows } = await client.query(sensorsQuery, [sessionData.userId]);
        
        // Create a map of sensor names to IDs
        const sensorMap = new Map(sensorRows.map(row => [row.name, row.id]));
        
        for (const sensorName of sessionData.sensors) {
          const sensorId = sensorMap.get(sensorName);
          
          if (!sensorId) {
            console.warn(`[WARNING] Sensor ${sensorName} not found for session ${sessionData.name}`);
            continue;
          }
          
          const sensorSessionQuery = `
            INSERT INTO session_sensors (session_id, sensor_id)
            VALUES ($1, $2)
          `;
          
          await client.query(sensorSessionQuery, [sessionId, sensorId]);
        }
      }
      
      // Commit transaction
      await client.query('COMMIT');
      
      // Return the complete session with cameras and sensors
      return this.getSession(sessionId);
    } catch (error) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      console.error(`[ERROR] Error creating session ${sessionData.name}: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update session
   * @param {string} id - Session ID
   * @param {Partial<Session>} sessionData - Session data to update
   * @returns {Promise<Session>} Updated session
   */
  async updateSession(id, sessionData) {
    const client = await this.pool.connect();
    
    try {
      // Start transaction
      await client.query('BEGIN');
      
      // Build dynamic update query based on provided fields
      const updates = [];
      const values = [id];
      let paramIndex = 2;
      
      if ('userId' in sessionData) {
        updates.push(`user_id = $${paramIndex++}`);
        values.push(sessionData.userId);
      }
      
      if ('name' in sessionData) {
        updates.push(`name = $${paramIndex++}`);
        values.push(sessionData.name);
      }
      
      if ('description' in sessionData) {
        updates.push(`description = $${paramIndex++}`);
        values.push(sessionData.description);
      }
      
      if ('laboratoryTitle' in sessionData) {
        updates.push(`laboratory_title = $${paramIndex++}`);
        values.push(sessionData.laboratoryTitle);
      }
      
      if ('researcherName' in sessionData) {
        updates.push(`researcher_name = $${paramIndex++}`);
        values.push(sessionData.researcherName);
      }
      
      if ('participants' in sessionData) {
        updates.push(`participants = $${paramIndex++}`);
        values.push(sessionData.participants || []);
      }
      
      if ('startTime' in sessionData) {
        updates.push(`start_time = $${paramIndex++}`);
        values.push(sessionData.startTime);
      }
      
      if ('endTime' in sessionData) {
        updates.push(`end_time = $${paramIndex++}`);
        values.push(sessionData.endTime);
      }
      
      if ('status' in sessionData) {
        updates.push(`status = $${paramIndex++}`);
        values.push(sessionData.status);
      }
      
      if ('exportPath' in sessionData) {
        updates.push(`export_path = $${paramIndex++}`);
        values.push(sessionData.exportPath);
      }
      
      if (updates.length > 0) {
        const query = `
          UPDATE sessions
          SET ${updates.join(', ')}
          WHERE id = $1
        `;
        
        await client.query(query, values);
      }
      
      // Update cameras if provided
      if (sessionData.cameras && Array.isArray(sessionData.cameras)) {
        // First, delete all existing camera associations
        await client.query('DELETE FROM session_cameras WHERE session_id = $1', [id]);
        
        // Then, insert new camera associations
        for (const camera of sessionData.cameras) {
          const cameraQuery = `
            INSERT INTO session_cameras (
              session_id, camera_id, recording_path, status,
              start_time, end_time
            )
            VALUES ($1, $2, $3, $4, $5, $6)
          `;
          
          await client.query(cameraQuery, [
            id,
            camera.id,
            camera.recordingPath || null,
            camera.status || 'pending',
            camera.startTime || null,
            camera.endTime || null
          ]);
        }
      }
      
      // Update sensors if provided
      if (sessionData.sensors && Array.isArray(sessionData.sensors)) {
        // First, delete all existing sensor associations
        await client.query('DELETE FROM session_sensors WHERE session_id = $1', [id]);
        
        // Get session to find user_id
        const { rows } = await client.query('SELECT user_id FROM sessions WHERE id = $1', [id]);
        if (rows.length === 0) {
          throw new Error(`Session with ID ${id} not found`);
        }
        
        const userId = rows[0].user_id;
        
        // Get all sensors for this user to resolve names to IDs
        const sensorsQuery = 'SELECT id, name FROM sensors WHERE user_id = $1';
        const { rows: sensorRows } = await client.query(sensorsQuery, [userId]);
        
        // Create a map of sensor names to IDs
        const sensorMap = new Map(sensorRows.map(row => [row.name, row.id]));
        
        // Insert new sensor associations
        for (const sensorName of sessionData.sensors) {
          const sensorId = sensorMap.get(sensorName);
          
          if (!sensorId) {
            console.warn(`[WARNING] Sensor ${sensorName} not found for session update`);
            continue;
          }
          
          const sensorSessionQuery = `
            INSERT INTO session_sensors (session_id, sensor_id)
            VALUES ($1, $2)
          `;
          
          await client.query(sensorSessionQuery, [id, sensorId]);
        }
      }
      
      // Commit transaction
      await client.query('COMMIT');
      
      // Return the updated session with cameras and sensors
      return this.getSession(id);
    } catch (error) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      console.error(`[ERROR] Error updating session ${id}: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete session
   * @param {string} id - Session ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async deleteSession(id) {
    try {
      // Associations will be automatically deleted due to CASCADE
      const query = 'DELETE FROM sessions WHERE id = $1 RETURNING id';
      const { rowCount } = await this.pool.query(query, [id]);
      
      return rowCount > 0;
    } catch (error) {
      console.error(`[ERROR] Error deleting session ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Save sensor reading
   * @param {string} sensorId - Sensor ID
   * @param {string|null} sessionId - Session ID, if associated with a session
   * @param {Object} data - Sensor reading data
   * @param {string} topic - MQTT topic
   * @returns {Promise<void>}
   */
  async saveSensorReading(sensorId, sessionId, data, topic) {
    try {
      const query = `
        INSERT INTO sensor_readings (
          sensor_id, session_id, timestamp, value, topic
        )
        VALUES ($1, $2, $3, $4, $5)
      `;
      
      await this.pool.query(query, [
        sensorId,
        sessionId,
        new Date(),
        JSON.stringify(data),
        topic
      ]);
      
      // Update last_reading timestamp for the sensor
      await this.pool.query(
        'UPDATE sensors SET last_reading = NOW() WHERE id = $1',
        [sensorId]
      );
    } catch (error) {
      console.error(`[ERROR] Error saving sensor reading: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get sensor readings for a session
   * @param {string} sessionId - Session ID
   * @param {Object} options - Options for filtering readings
   * @param {string} [options.sensorId] - Filter by sensor ID
   * @param {Date} [options.startTime] - Filter readings after this time
   * @param {Date} [options.endTime] - Filter readings before this time
   * @returns {Promise<SensorReading[]>} Array of sensor readings
   */
  async getSensorReadings(sessionId, options = {}) {
    try {
      const conditions = ['session_id = $1'];
      const values = [sessionId];
      let paramIndex = 2;
      
      if (options.sensorId) {
        conditions.push(`sensor_id = $${paramIndex++}`);
        values.push(options.sensorId);
      }
      
      if (options.startTime) {
        conditions.push(`timestamp >= $${paramIndex++}`);
        values.push(options.startTime);
      }
      
      if (options.endTime) {
        conditions.push(`timestamp <= $${paramIndex++}`);
        values.push(options.endTime);
      }
      
      const query = `
        SELECT sr.*, s.name as sensor_name, s.type as sensor_type
        FROM sensor_readings sr
        JOIN sensors s ON sr.sensor_id = s.id
        WHERE ${conditions.join(' AND ')}
        ORDER BY sr.timestamp ASC
      `;
      
      const { rows } = await this.pool.query(query, values);
      
      return rows.map(row => ({
        id: row.id,
        sensorId: row.sensor_id,
        sensorName: row.sensor_name,
        sensorType: row.sensor_type,
        sessionId: row.session_id,
        timestamp: row.timestamp,
        value: row.value,
        topic: row.topic
      }));
    } catch (error) {
      console.error(`[ERROR] Error getting sensor readings for session ${sessionId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Log system event
   * @param {string} level - Log level (info, warn, error)
   * @param {string} message - Log message
   * @param {string} source - Source of the log
   * @param {Object} [metadata] - Additional metadata
   * @returns {Promise<void>}
   */
  async logSystemEvent(level, message, source, metadata = {}) {
    try {
      const query = `
        INSERT INTO system_logs (level, message, source, metadata)
        VALUES ($1, $2, $3, $4)
      `;
      
      await this.pool.query(query, [
        level,
        message,
        source,
        JSON.stringify(metadata)
      ]);
    } catch (error) {
      console.error(`[ERROR] Error logging system event: ${error.message}`);
      // Don't throw here to avoid cascading errors
    }
  }

  /**
   * Get system logs
   * @param {Object} options - Options for filtering logs
   * @param {string} [options.level] - Filter by log level
   * @param {string} [options.source] - Filter by log source
   * @param {Date} [options.startTime] - Filter logs after this time
   * @param {Date} [options.endTime] - Filter logs before this time
   * @param {number} [options.limit=100] - Maximum number of logs to return
   * @returns {Promise<SystemLog[]>} Array of system logs
   */
  async getSystemLogs(options = {}) {
    try {
      const conditions = [];
      const values = [];
      let paramIndex = 1;
      
      if (options.level) {
        conditions.push(`level = $${paramIndex++}`);
        values.push(options.level);
      }
      
      if (options.source) {
        conditions.push(`source = $${paramIndex++}`);
        values.push(options.source);
      }
      
      if (options.startTime) {
        conditions.push(`timestamp >= $${paramIndex++}`);
        values.push(options.startTime);
      }
      
      if (options.endTime) {
        conditions.push(`timestamp <= $${paramIndex++}`);
        values.push(options.endTime);
      }
      
      let query = 'SELECT * FROM system_logs';
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      query += ' ORDER BY timestamp DESC';
      
      if (options.limit) {
        query += ` LIMIT $${paramIndex++}`;
        values.push(options.limit || 100);
      }
      
      const { rows } = await this.pool.query(query, values);
      
      return rows.map(row => ({
        id: row.id,
        level: row.level,
        message: row.message,
        timestamp: row.timestamp,
        source: row.source,
        metadata: row.metadata
      }));
    } catch (error) {
      console.error(`[ERROR] Error getting system logs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Save configuration backup
   * @param {string} configType - Configuration type
   * @param {Object} data - Configuration data
   * @param {number} [userId=1] - User ID who created the backup
   * @returns {Promise<void>}
   */
  async saveConfigBackup(configType, data, userId = 1) {
    try {
      const query = `
        INSERT INTO configuration_backups (
          configuration_type, configuration_data, created_by
        )
        VALUES ($1, $2, $3)
      `;
      
      await this.pool.query(query, [
        configType,
        JSON.stringify(data),
        userId
      ]);
    } catch (error) {
      console.error(`[ERROR] Error saving configuration backup: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get configuration backups
   * @param {string} [configType] - Filter by configuration type
   * @param {number} [limit=10] - Maximum number of backups to return
   * @returns {Promise<ConfigBackup[]>} Array of configuration backups
   */
  async getConfigBackups(configType, limit = 10) {
    try {
      let query = 'SELECT * FROM configuration_backups';
      const values = [];
      
      if (configType) {
        query += ' WHERE configuration_type = $1';
        values.push(configType);
      }
      
      query += ' ORDER BY timestamp DESC LIMIT $' + (values.length + 1);
      values.push(limit);
      
      const { rows } = await this.pool.query(query, values);
      
      return rows.map(row => ({
        id: row.id,
        configurationType: row.configuration_type,
        configurationData: row.configuration_data,
        timestamp: row.timestamp,
        createdBy: row.created_by
      }));
    } catch (error) {
      console.error(`[ERROR] Error getting configuration backups: ${error.message}`);
      throw error;
    }
  }
}

module.exports = { DatabaseStorage, pool, sessionStore };