# LISA User Guide

## Table of Contents
1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
   - [Register/Login](#21-registerlogin)
   - [Main Dashboard](#22-main-dashboard)
3. [Device Management](#3-device-management)
   - [Sensor Management](#31-sensor-management-main-tab)
   - [Camera Management](#32-camera-management-secondary-tab)
4. [Live Monitoring](#4-live-monitoring)
   - [Sensor Monitoring](#41-sensor-monitoring)
   - [Camera Monitoring](#42-camera-monitoring)
5. [Recordings and Sessions](#5-recordings-and-sessions)
   - [Create New Session](#51-create-new-session)
   - [Session Management](#52-session-management)
   - [Session Playback](#53-session-playback)
6. [Key Features](#6-key-features)
7. [Best Practices](#7-best-practices)
8. [Troubleshooting & FAQs](#8-troubleshooting--faqs)
9. [Support](#9-support)

---

## 1. Introduction
Welcome to **LISA (Living-lab Integrated Sensing Architecture)**, a platform designed to make monitoring and managing sensor networks and camera feeds seamless. 

With LISA, you can:
- Track real-time sensor data from small to large deployments (6–10,000 sensors).  
- Conduct synchronized recordings of camera streams and sensor metrics.  
- Visualize trends, detect anomalies, and export data for analysis.  
- Receive alerts for critical events.  

This guide will help you navigate the platform efficiently, whether you’re setting up devices, monitoring live feeds, or managing sessions.

---

## 2. Getting Started

### 2.1 Register/Login
Begin by creating an account or logging in. Only authorized users can access the system, configure devices, or export data.

> **Tip:** Use a secure password and verify your email to enable alert notifications.

### 2.2 Main Dashboard
Upon login, the dashboard provides an overview of:
- Connected cameras and sensors  
- Current recording status  
- System performance metrics  
- Quick access to Session Management and Live Monitoring  

The interface is designed for clarity: status indicators, trend summaries, and alerts are visible at a glance.

---

## 3. Device Management

### 3.1 Sensor Management (Main Tab)
- View all active MQTT/Zigbee2MQTT sensors.  
- Add new sensors or edit existing ones with friendly names and locations.  
- Monitor sensor connection in real-time through visual indicators.

> **Tip:** Consistent naming (e.g., `Room1_Temp`) simplifies session setup and data export.

### 3.2 Camera Management (Secondary Tab)
- Add cameras using RTSP URLs and credentials.  
- Monitor connection status and video feed health.  
- Update or remove cameras as needed.  

> **Note:** Regularly verify camera connectivity to avoid recording interruptions.

---

## 4. Live Monitoring

### 4.1 Sensor Monitoring
- View live sensor data and trends.  
- Automatic updates via WebSockets ensure near real-time visibility.  
- Visual indicators show warnings or critical states.

### 4.2 Camera Monitoring
- Access live feeds from all configured cameras.  
- Adjust display settings: zoom, pan, and layout.  
- Status indicators highlight performance or connection issues.

> **Tip:** Monitor high-priority sensors in a separate tab to reduce latency in alerts.

---

## 5. Recordings and Sessions

### 5.1 Create New Session
- Select cameras and sensors to include in the session.  
- Configure session name and description.  
- Start synchronized recording.

### 5.2 Session Management
- Monitor active and completed sessions with visual status indicators.  
- Pause or stop recordings at any time.  
- Download session data as a ZIP (includes videos and sensor metrics).

### 5.3 Session Playback
- Replay camera recordings alongside sensor metrics.  
- Export CSV or JSON for analysis.  
- Use the timeline view to navigate specific events.

> **Note:** Recordings continue even if switching browser tabs.

---

## 6. Key Features
- Real-time sensor and camera monitoring.  
- Synchronized session recordings.  
- Customizable MQTT topic capture.  
- Scalable to thousands of sensors.  
- Clear dashboard feedback for system health and performance.

---

## 7. Best Practices
- **Organize devices:** Use descriptive names and group sensors by location or type.  
- **Test new devices:** Validate connectivity individually before including them in sessions.  
- **Monitor sessions:** Keep an eye on dashboards for critical alerts during recordings.  
- **Export data regularly:** Store important session data outside LISA to ensure long-term retention.  
- **Keep software updated:** Ensure LISA and its dependencies are current for security and stability.

> **Tip:** For large deployments, schedule regular maintenance windows to check sensors, cameras, and system performance.

---

## 8. Troubleshooting & FAQs

### Common Issues
1. **Sensor not appearing**: Check MQTT configuration and topic names. Refresh the sensor list.  
2. **Camera feed unavailable**: Verify RTSP URL, credentials, and network connectivity.  
3. **Data export fails**: Ensure session is complete and user has sufficient permissions.

> **Tip:** Contact support with session ID and device logs for faster resolution.

---

## 9. Support
For further assistance, reach out to the **LISA support team**:  
Email: `uclmlivinglab@gmail.com`  
Provide device logs and session IDs for faster troubleshooting.

---

