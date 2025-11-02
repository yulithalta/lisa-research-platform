# Version Control

## Version History

#### v0.0.1
- Connected IP camera for low-resolution web streaming
- Real-time streaming without recording
- Basic initial dashboard

#### v0.0.2
- Basic camera recording
- Temporary local storage
- Low-latency performance tweaks

#### v0.0.3
- Initial multi-user support
- Simple login and per-user session management
- User-specific real-time viewing

#### v0.1.0
- Zigbee sensor integration via Zigbee2MQTT
- Real-time sensor data capture
- Basic sensor display dashboard
- Initial session creation form

#### v0.2.0
- Synchronized camera and sensor recording
- Data compression during low load periods
- Encrypted M2M backup preparation
- Initial multiple session management

#### v0.3.0
- Infrastructure monitoring with .dash
- Container monitoring with Dozzel
- Improved long recording stability
- UI improvements for active session tracking

#### v0.4.0
- Session end and on-demand ZIP generation
- Session data viewing without download
- User validation to prevent data overlap
- Optimized capture and display latency

#### v0.5.0
- Foundation for modular device support
- Extended support for multiple Zigbee sensor types
- Optimized temporary data storage
- Preparation for session scalability

#### v0.6.0
- PostgreSQL integration for persistent session and user data
- Database schema for cameras, sensors, and sessions
- Initial user authentication backed by database
- Preparation for multi-device support

#### v0.7.0
- Responsive UI for mobile and tablet
- Real-time camera and sensor streaming adapted to smaller screens
- Session management accessible on mobile devices

#### v0.8.0
- Automatic session reconnection for logged-in users
- Recovery of live session after temporary disconnect
- Persistent session state saved in database

#### v0.9.0
- M2M communication configuration between main and backup servers
- Encrypted transfer of session data for backup
- Initial GDPR compliance preparation
- Basic multi-user session isolation and access control

#### v1.0.0
- Internal alpha release
- Main dashboard with cameras and sensors
- Functional login/registration with PostgreSQL
- Laboratory session creation and management
- Synchronized camera and sensor capture
- Basic multi-user support with data separation
- Preliminary GDPR-ready architecture

#### v1.1.0
- Session lifecycle management improvements
- Enhanced session reconnection and error recovery
- Extended PostgreSQL schemas for sensor metadata
- Configurable M2M backup intervals

#### v1.2.0
- Initial responsive layout fixes
- Enhanced performance for low-spec hardware (Minisforum / Debian 12)
- Logging of session events and system health
- Multi-device camera support (RTSP streaming)

#### v1.3.0
- Expanded sensor type support
- Real-time alerts for sensor status
- WebSocket improvements for large-scale sensor updates
- Preliminary compression and storage optimization

#### v1.4.0
- User session and permissions refinement
- Backup server M2M failover tested
- Improved session data encryption
- Advanced multi-user separation for research teams

#### v1.5.0
- Pre-GDPR full implementation testing
- Session data download and visualization refined
- Camera resolution configuration improvements
- Start of modular plugin system for sensors and cameras

#### v2.0.0
- Beta release
- Stable session recording with high reliability
- Full PostgreSQL-backed multi-user session management
- Initial GDPR compliance features active
- Live monitoring dashboard enhanced with grid views
- Session end and on-demand ZIP generation functional

#### v2.1.0
- Sensor and camera UI improvements
- WebSocket optimization for 10,000+ sensors
- Improved session recovery after network interruptions
- Data compression and M2M transfer optimization

#### v2.2.0
- Observer + Pub-Sub pattern fully implemented for scalable sensor handling
- Real-time notifications via WebSocket
- Extended support for Zigbee2MQTT topics

#### v2.3.0
- Session management UI refinement
- Session status color codes implemented
- Sidebar navigation optimized for efficiency
- Multi-tab recording support

#### v2.4.0
- MQTT configuration via environment variables
- Camera HTTP verification
- UI blocks for clear feedback
- Recording persists when switching tabs

#### v2.5.0
- Complete session management
- IP camera integration with RTSP
- Session ZIP download
- Session completion marking

#### v2.5.1
- Enhanced session download
- Session status visualization

#### v2.5.2
- Real-time WebSocket notifications
- Improved session management

#### v2.5.3
- MQTT/Zigbee2MQTT sensor integration
- Adjustable grid view for better navigation

#### v2.5.4
- "Live Now Session" renamed to "Live Monitoring"
- Confirmation dialog on session completion

#### v2.5.5
- Color-coded status visualization
- Sidebar with always-open submenus

#### v2.5.6
- Sensor selection fixes
- Duplicate camera validation
- Sensor status visual indicators
- WebSocket communication optimization

#### v2.5.7
- UI with highlighted information blocks
- Recording continues when switching browser tabs

#### v2.5.8
- MQTT configuration via environment variables
- Basic camera HTTP verification

#### v2.5.9
- Custom MQTT/Zigbee topic capture
- Extended support up to 10,000 sensors

#### v2.5.10 - v2.5.14
- Sensor data capture optimizations
- Device selection improvements
- Enhanced MQTT broker integration using WebSockets

#### v2.5.15
- Observer + Pub-Sub pattern for sensor management
- Sensor view pagination

#### v2.5.16
- "413 Payload Too Large" fix on session creation
- POST /api/sessions endpoint optimized

#### v2.5.17
- Empty JSON download fix
- Dual sensor data storage system
- Download endpoint updated

#### v2.5.18
- Tab-based navigation
- Removed sidebar submenus
- Tab order inverted to prioritize sensors

#### v3.0.0
- Full GDPR compliance
- Platform optimization for multiple researchers
- Synchronized high-resolution camera and sensor capture
- Flexible and secure data export
- Consolidated dashboard with real-time visualization
