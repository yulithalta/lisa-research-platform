# IP Camera and MQTT/Zigbee2MQTT Monitoring System

Advanced clinical-grade monitoring system for IP cameras and MQTT/Zigbee2MQTT sensors with comprehensive session management, real-time visualization, and data exports. Designed for research laboratory environments requiring precise data capture and synchronization.

## System Requirements

- Node.js 20 or higher
- NPM 10 or higher
- MQTT Broker (Mosquitto, HiveMQ, etc.) for sensor connectivity
- Zigbee2MQTT properly configured (for Zigbee device support)
- IP cameras with RTSP or HTTP streaming capabilities
- Environment variables properly configured (see Configuration section)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd <directory-name>
```

2. Install dependencies:
```bash
npm install
```

## Configuration

1. Create a `.env` file in the project root based on `.env.example`:
```bash
cp .env.example .env
```

2. Edit the `.env` file and configure the environment variables:
```env
# Generate a secure random value for SESSION_SECRET
# You can use: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=your_secret_here

# Server configuration
NODE_ENV=development
PORT=5000

# MQTT Broker configuration
MQTT_BROKER=mqtt://your-mqtt-broker-ip
MQTT_PORT=1883
MQTT_USERNAME=your_username  # Optional
MQTT_PASSWORD=your_password  # Optional
MQTT_USE_TLS=false          # Set to true for secure connections

# Zigbee2MQTT topic configuration
ZIGBEE2MQTT_BASE_TOPIC=zigbee2mqtt
```

3. Configure camera storage directories:
```bash
mkdir -p recordings/sessions
```

4. Make sure all dependencies are correctly installed:
```bash
npm install
```

## Running the Application

To start the development server:

```bash
npm run dev
```

The server will be available at `http://localhost:5000` or the configured PORT environment variable.

To build and start the production server:

```bash
npm run build
npm start
```

For development purposes, the application automatically connects to configured MQTT brokers and scans for available IP cameras.

## Project Structure

```
├── client/                    # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── camera-card.tsx          # Individual camera component
│   │   │   ├── camera-grid.tsx          # Grid layout for cameras
│   │   │   ├── sensor-card.tsx          # Individual sensor component
│   │   │   └── ui/                      # Shadcn UI components
│   │   ├── hooks/            # Custom hooks
│   │   │   ├── use-simple-mqtt.tsx      # MQTT connection hook
│   │   │   └── use-toast.tsx            # Toast notifications
│   │   ├── lib/              # Utilities and configuration
│   │   │   ├── services/logger.ts       # Centralized logging service
│   │   │   └── queryClient.ts           # TanStack Query setup
│   │   └── pages/            # Application pages
│   │       ├── cameras-page.tsx         # Camera management
│   │       ├── sessions-page.tsx        # Session recording and history
│   │       ├── device-management-page.tsx # Device configuration
│   │       └── live-monitoring-page.tsx # Real-time monitoring
├── server/                    # Backend (Express + TypeScript)
│   ├── auth.ts                # Authentication configuration
│   ├── routes.ts              # API routes
│   ├── storage.ts             # Storage layer
│   ├── mqtt-client.ts         # MQTT client integration
│   └── vite.ts                # Vite configuration
├── shared/                    # Shared code
│   └── schema.ts              # Schemas and types
├── recordings/                # Recording storage
│   └── sessions/              # Organized by session
└── data/                      # Application data storage
    └── user_*/                # User-specific data
```

## Key Features

### Session Management
- Create monitoring sessions with synchronized camera recording and sensor data capture
- Comprehensive session configuration with laboratory title, description, researcher name, and participant tags
- Real-time monitoring with elapsed time tracking
- Advanced session history with search and filter capabilities
- Data visualization for recordings and sensor measurements

### Camera Management
- Add, verify, and configure IP cameras with RTSP/HTTP support
- Camera health monitoring and status verification
- Flexible stream configuration (resolution, FPS, format)
- Centralized recording control
- Automatic verification of camera availability

### MQTT/Zigbee2MQTT Integration
- Connect to any MQTT broker (local or remote)
- Auto-discover and monitor Zigbee sensors via Zigbee2MQTT
- Support for various sensor types (temperature, humidity, motion, etc.)
- Real-time data visualization
- Comprehensive sensor data logging and export

### Data Export
- Export recordings and sensor data in ZIP format
- Export sensor data as JSON or CSV
- Synchronized timestamp correlation between video and sensor data
- Customizable data export options
- Comprehensive session metadata inclusion

### Real-time Updates
- WebSocket-based real-time communication for status updates
- Live monitoring of active sessions
- Camera and sensor status notifications
- Session progress tracking

## API Endpoints

### Authentication
- `POST /api/register` - Register a new user
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/user` - Get current user
- `PATCH /api/user/preferences` - Update user preferences

### Cameras
- `GET /api/cameras` - Get list of cameras
- `POST /api/cameras` - Add new camera
- `GET /api/cameras/:id` - Get camera details
- `PATCH /api/cameras/:id` - Update existing camera
- `DELETE /api/cameras/:id` - Delete camera
- `POST /api/cameras/:id/verify` - Verify camera availability
- `POST /api/cameras/:id/start` - Start camera recording
- `POST /api/cameras/:id/stop` - Stop camera recording

### Sensors
- `GET /api/sensors` - Get list of all sensors
- `GET /api/sensors/:id` - Get sensor details
- `POST /api/sensors/scan` - Scan for available sensors

### Sessions
- `GET /api/sessions` - Get list of all sessions
- `GET /api/sessions/:id` - Get session details
- `POST /api/sessions` - Create new session
- `DELETE /api/sessions/:id` - Delete session
- `GET /api/sessions/:id/download` - Download session data as ZIP
- `GET /api/sessions/:id/export-csv` - Export sensor data as CSV
- `GET /api/sessions/search` - Search sessions with filters (date, tags, etc.)

### MQTT
- `GET /api/mqtt/status` - Get MQTT connection status
- `POST /api/mqtt/connect` - Connect to MQTT broker
- `POST /api/mqtt/disconnect` - Disconnect from MQTT broker

### WebSocket Events
- `/ws` - WebSocket connection endpoint
- Events:
  - `camera:status` - Camera status updates
  - `sensor:data` - Real-time sensor data
  - `session:status` - Session status updates

## Development

For local development, the project utilizes:
- Vite for frontend development with hot module replacement
- Express for the backend API server
- TypeScript for type safety across the entire stack
- WebSockets for real-time updates and communication
- Zod for data validation and schema definitions
- TanStack Query for state management and caching
- Shadcn UI for consistent and accessible interface components
- Chart.js for data visualization and metrics
- MQTT.js for MQTT broker communication

### Environment Variables
The project uses environment variables for configuration. Ensure you:
1. Never commit the `.env` file to version control
2. Keep `.env.example` updated with all necessary variables
3. Generate a secure and unique SESSION_SECRET for each instance
4. Configure all MQTT-related variables correctly for your broker

## User Guide

### Getting Started
1. Configure your MQTT broker settings in the `.env` file
2. Start the application with `npm run dev`
3. Access the web interface at `http://localhost:5000`
4. Navigate to Device Management to add cameras and verify sensors
5. Create a new monitoring session from the Sessions page

### Creating a Monitoring Session
1. Navigate to the "Sessions" page
2. Click "New Monitoring Session"
3. Fill in session details:
   - Laboratory Title
   - Session Description
   - Researcher Name
   - Participant Tags (comma-separated)
4. Select cameras and sensors to monitor
5. Click "Start Session" to begin recording
6. Monitor the session in real-time on the Live Monitoring page
7. Stop the session when complete

### Searching and Exporting Sessions
1. Navigate to the "Sessions" page
2. Use the search bar to filter by title, description, or participant
3. Use date range filters to narrow results by time period
4. Click on a session to view details
5. Download the session data as a ZIP file
6. Export sensor data as CSV for analysis

## Accessibility Features

- High contrast UI elements for better visibility
- Keyboard navigable interface
- Screen reader compatible components
- Color-coding with alternative indicators
- Responsive design for various device sizes
- Clear error states and notifications

## Contribution

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Upcoming Features

- [ ] Advanced scheduled recording system
- [ ] Real-time video analysis capabilities
- [ ] Notification and alert system
- [ ] Enhanced data visualization and charting
- [ ] Multi-language support
- [ ] Device tagging system for better organization
- [ ] Expanded sensor integration support (including additional protocol support)
- [ ] Custom export format templates