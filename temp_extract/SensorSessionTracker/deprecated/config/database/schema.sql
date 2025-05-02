-- LISA (Living-lab Integrated Sensing Architecture) Database Schema
-- Version 3.0 - April 2025

-- Enable UUID extension for generating unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create cameras table
CREATE TABLE cameras (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  ip_address VARCHAR(255) NOT NULL,
  port INTEGER DEFAULT 80,
  username VARCHAR(255),
  password VARCHAR(255),
  stream_url VARCHAR(255),
  status VARCHAR(50) DEFAULT 'offline',
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_camera_per_user UNIQUE (user_id, ip_address)
);

-- Create sensors table
CREATE TABLE sensors (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  mqtt_topic VARCHAR(255),
  zigbee_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'offline',
  battery_level INTEGER,
  last_reading JSON,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_sensor_per_user_topic UNIQUE (user_id, mqtt_topic),
  CONSTRAINT unique_sensor_per_user_zigbee UNIQUE (user_id, zigbee_id)
);

-- Create recording sessions table
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, active, completed, failed
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create session participants (cameras) table
CREATE TABLE session_cameras (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  camera_id INTEGER NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
  recording_path VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending', -- pending, recording, completed, failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_camera_per_session UNIQUE (session_id, camera_id)
);

-- Create session participants (sensors) table
CREATE TABLE session_sensors (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  sensor_id INTEGER NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_sensor_per_session UNIQUE (session_id, sensor_id)
);

-- Create sensor readings table
CREATE TABLE sensor_readings (
  id SERIAL PRIMARY KEY,
  sensor_id INTEGER NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  value JSON NOT NULL,
  topic VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create sensor events table (for storing processed/aggregated sensor data)
CREATE TABLE sensor_events (
  id SERIAL PRIMARY KEY,
  sensor_id INTEGER NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  value JSON NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create system settings table
CREATE TABLE system_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSON,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create session logs table
CREATE TABLE session_logs (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  level VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSON
);

-- Add indices for performance
CREATE INDEX idx_cameras_user_id ON cameras(user_id);
CREATE INDEX idx_sensors_user_id ON sensors(user_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_session_cameras_session_id ON session_cameras(session_id);
CREATE INDEX idx_session_sensors_session_id ON session_sensors(session_id);
CREATE INDEX idx_sensor_readings_sensor_id ON sensor_readings(sensor_id);
CREATE INDEX idx_sensor_readings_session_id ON sensor_readings(session_id);
CREATE INDEX idx_sensor_readings_timestamp ON sensor_readings(timestamp);
CREATE INDEX idx_sensor_events_sensor_id ON sensor_events(sensor_id);
CREATE INDEX idx_sensor_events_session_id ON sensor_events(session_id);
CREATE INDEX idx_session_logs_session_id ON session_logs(session_id);

-- Session table trigger to update timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_timestamp
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_cameras_timestamp
BEFORE UPDATE ON cameras
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_sensors_timestamp
BEFORE UPDATE ON sensors
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_sessions_timestamp
BEFORE UPDATE ON sessions
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_session_cameras_timestamp
BEFORE UPDATE ON session_cameras
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_session_sensors_timestamp
BEFORE UPDATE ON session_sensors
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_system_settings_timestamp
BEFORE UPDATE ON system_settings
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

-- Create view for active sessions with participants
CREATE OR REPLACE VIEW active_sessions_view AS
SELECT 
  s.id,
  s.name,
  s.user_id,
  s.start_time,
  s.status,
  COUNT(DISTINCT sc.camera_id) AS camera_count,
  COUNT(DISTINCT ss.sensor_id) AS sensor_count
FROM sessions s
LEFT JOIN session_cameras sc ON s.id = sc.session_id
LEFT JOIN session_sensors ss ON s.id = ss.session_id
WHERE s.status IN ('pending', 'active')
GROUP BY s.id, s.name, s.user_id, s.start_time, s.status;

-- Create view for sensor readings summary
CREATE OR REPLACE VIEW sensor_readings_summary AS
SELECT 
  sr.sensor_id,
  sr.session_id,
  s.name AS sensor_name,
  s.type AS sensor_type,
  MIN(sr.timestamp) AS first_reading,
  MAX(sr.timestamp) AS last_reading,
  COUNT(*) AS reading_count
FROM sensor_readings sr
JOIN sensors s ON sr.sensor_id = s.id
GROUP BY sr.sensor_id, sr.session_id, s.name, s.type;

-- Create indexes for search and filtering
CREATE INDEX idx_sessions_name_search ON sessions USING gin(to_tsvector('english', name));
CREATE INDEX idx_cameras_name_search ON cameras USING gin(to_tsvector('english', name));
CREATE INDEX idx_sensors_name_search ON sensors USING gin(to_tsvector('english', name));

-- Create a default admin user
INSERT INTO users (username, password, email, full_name, role)
VALUES ('admin', '$2b$10$X7VYJy6RNgVnrB.KjQvqZ.0stLQKGVJ9JB7JlAK.jXmSDrHBdNG1G', 'admin@lisa.local', 'System Administrator', 'admin');

-- ==========================================
-- GDPR Compliance Tables (Added in v3.0.0)
-- ==========================================

-- Create consent forms table
CREATE TABLE consent_forms (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  version VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  legal_basis VARCHAR(50) NOT NULL,
  data_retention_period INTEGER, -- in days, NULL for indefinite
  purpose TEXT NOT NULL,
  data_categories JSONB, -- array of categories
  document_url VARCHAR(255)
);

-- Create user consents table
CREATE TABLE user_consents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_form_id INTEGER NOT NULL REFERENCES consent_forms(id),
  accepted BOOLEAN NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  additional_data JSONB,
  withdrawn_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create access logs table
CREATE TABLE access_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  action VARCHAR(50) NOT NULL, -- view, export, delete, etc.
  resource_type VARCHAR(50) NOT NULL, -- recording, camera, sensor, user, etc.
  resource_id VARCHAR(255) NOT NULL,
  success BOOLEAN DEFAULT TRUE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  details JSONB
);

-- Create data deletion requests table
CREATE TABLE data_deletion_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  request_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, rejected
  deletion_type VARCHAR(50) NOT NULL, -- complete, partial
  data_categories JSONB, -- which data categories to delete
  reason TEXT,
  processed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT
);

-- Create data export requests table
CREATE TABLE data_export_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  export_format VARCHAR(50) DEFAULT 'json',
  data_categories JSONB, -- which data categories to export
  download_url VARCHAR(255),
  expiry_date TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Create GDPR settings table
CREATE TABLE gdpr_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(255) NOT NULL UNIQUE,
  setting_value JSONB,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add GDPR-related triggers
CREATE TRIGGER update_consent_forms_timestamp
BEFORE UPDATE ON consent_forms
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_user_consents_timestamp
BEFORE UPDATE ON user_consents
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_gdpr_settings_timestamp
BEFORE UPDATE ON gdpr_settings
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

-- Add indices for GDPR tables
CREATE INDEX idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX idx_user_consents_consent_form_id ON user_consents(consent_form_id);
CREATE INDEX idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX idx_access_logs_resource_type ON access_logs(resource_type);
CREATE INDEX idx_access_logs_timestamp ON access_logs(timestamp);
CREATE INDEX idx_data_deletion_requests_user_id ON data_deletion_requests(user_id);
CREATE INDEX idx_data_export_requests_user_id ON data_export_requests(user_id);

-- Insert default GDPR settings
INSERT INTO gdpr_settings (setting_key, setting_value, description) 
VALUES 
('retention_policies', 
  '{"recordings": 365, "sensor_data": 730, "access_logs": 1095, "system_logs": 180}', 
  'Data retention periods in days for different data categories'),
('dpo_contact', 
  '{"name": "LISA DPO", "email": "dpo@lisa-system.org", "phone": "+1234567890"}',
  'Data Protection Officer contact information'),
('consent_requirements',
  '{"recording": true, "analytics": true, "research": true}',
  'Features requiring explicit consent');

-- Create view for active user consents
CREATE OR REPLACE VIEW active_consents_view AS
SELECT 
  uc.id,
  uc.user_id,
  u.username,
  cf.id AS consent_form_id,
  cf.title,
  cf.version,
  cf.purpose,
  uc.accepted,
  uc.timestamp,
  uc.expires_at
FROM user_consents uc
JOIN users u ON uc.user_id = u.id
JOIN consent_forms cf ON uc.consent_form_id = cf.id
WHERE (uc.withdrawn_at IS NULL) 
  AND (uc.expires_at IS NULL OR uc.expires_at > CURRENT_TIMESTAMP)
ORDER BY uc.timestamp DESC;