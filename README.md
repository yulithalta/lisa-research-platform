# LISA — Living-lab Integrated Sensing Architecture

**Version:** 3.0.0  
**Repository:** https://github.com/yulithalta/lisa-research-platform  
**Contact:** Yulith.Altamirano@uclm.es

LISA is an open-source system for time-aligned acquisition of IP video streams and MQTT-based sensor data in controlled research environments.  
It enables reproducible session workflows, structured metadata, and export of synchronized datasets for offline analysis.

This repository contains the reference implementation evaluated in the SoftwareX submission.

---

## 1. Scope

LISA supports scenarios requiring:

- Multi-camera video acquisition  
- Real-time MQTT and Zigbee2MQTT sensor monitoring  
- Timestamp-aligned data logging  
- Local data handling with configurable privacy controls

LISA is not a clinical diagnosis system and must not be used as a certified medical device.

---

## 2. System Requirements

| Component              | Version                  | Notes                                   |
|-----------------------|--------------------------|-----------------------------------------|
| OS                    | Linux (Debian tested)    | Reference environment: Debian 12        |
| Node.js               | ≥ 20                     | Backend and development UI              |
| NPM                   | ≥ 10                     | Dependency management                   |
| Docker + Compose v2   | Required                 | Infrastructure stack                    |
| IP Cameras            | RTSP/HTTP streams        | 4 cameras tested                        |
| Zigbee Coordinator    | CC2531 or equivalent     | Zigbee2MQTT interface                   |
| MQTT Broker           | MQTT v3.1+               | 50 sensors tested                       |

Full compatibility details:  
https://github.com/yulithalta/lisa-research-platform/tree/main/doc/system-architecture.svg  
https://github.com/yulithalta/lisa-research-platform/tree/main/doc/system-architecture-2.0.svg  
https://github.com/yulithalta/lisa-research-platform/tree/main/doc/API_ARCHITECTURE.md

---

## 3. Reproducibility and Experimental Setup

The results reported in the article were obtained with:

- 4 IP cameras (1080p, synchronized start/stop)  
- 50 Zigbee sensors  
- Local MQTT broker with Zigbee2MQTT  
- Standard LAN deployment in a living-lab room

Environmental parameters required for reproducibility:  
https://github.com/yulithalta/lisa-research-platform/tree/main/doc/setup.md  
https://github.com/yulithalta/lisa-research-platform/tree/main/doc/technical.md

---

## 4. Installation

```bash
git clone https://github.com/yulithalta/lisa-research-platform.git
cd lisa-research-platform
npm install
cp .env.example .env
````

Minimum variables in `.env`:

| Variable               | Description                |
| ---------------------- | -------------------------- |
| PORT                   | Default HTTP port (5000)   |
| MQTT_BROKER            | e.g. mqtt://localhost:1883 |
| ZIGBEE2MQTT_BASE_TOPIC | e.g. zigbee2mqtt           |

Prepare local recordings directory (if video recording is used):

```bash
mkdir -p recordings/sessions
```

Configuration guide:
[https://github.com/yulithalta/lisa-research-platform/tree/main/doc/config-guide.md](https://github.com/yulithalta/lisa-research-platform/tree/main/doc/config-guide.md)

---

## 5. Infrastructure and Development Execution

The repository includes an orchestration script to start the full environment (Zigbee2MQTT, monitoring tools, and the LISA application) in a single step. Hardware presence (Zigbee adapter) is detected automatically; absence does not stop execution.

Start full development stack:

```bash
./run-lisa.sh dev
```

Stop all processes:

```bash
./run-lisa.sh down
```

Notes:

* Zigbee2MQTT, Dozzle (log viewer), and dashdot (system metrics) are started as part of the stack.
* When a Zigbee adapter is not present, Zigbee2MQTT launches without USB mapping for UI access and configuration.

Additional details:
[https://github.com/yulithalta/lisa-research-platform/tree/main/doc/README.md](https://github.com/yulithalta/lisa-research-platform/tree/main/doc/README.md)
[https://github.com/yulithalta/lisa-research-platform/tree/main/doc/TICK_STACK.md](https://github.com/yulithalta/lisa-research-platform/tree/main/doc/TICK_STACK.md) (optional telemetry)
[https://github.com/yulithalta/lisa-research-platform/tree/main/doc/TICK_ENV_VARIABLES.md](https://github.com/yulithalta/lisa-research-platform/tree/main/doc/TICK_ENV_VARIABLES.md)

---

## 6. Running Without the Orchestrator (alternative)

For completeness, the reference implementation can also be launched manually:

Development mode:

```bash
npm run dev
```

Production build:

```bash
npm run build
npm start
```

Web UI: [http://localhost:5000](http://localhost:5000)

---

## 7. Data Handling

| File Type           | Format                | Location                            |
| ------------------- | --------------------- | ----------------------------------- |
| Videos              | MP4                   | `recordings/sessions/<session_id>/` |
| Sensor measurements | JSON and optional CSV | `data/user_<id>/sessions/`          |
| Session metadata    | JSON                  | Included in export packages         |

Export packages preserve timestamps, device metadata, and file integrity.
Data model and storage layout:
[https://github.com/yulithalta/lisa-research-platform/tree/main/doc/technical.md](https://github.com/yulithalta/lisa-research-platform/tree/main/doc/technical.md)

---

## 8. Software Architecture

* Backend: Express + WebSockets
* Frontend: React + TypeScript + Vite
* Data validation: Zod
* State management: TanStack Query
* Streaming: FFmpeg (via RTSP)
* Messaging: MQTT.js

Architecture and API documentation:
[https://github.com/yulithalta/lisa-research-platform/tree/main/doc/API_ARCHITECTURE.md](https://github.com/yulithalta/lisa-research-platform/tree/main/doc/API_ARCHITECTURE.md)
[https://github.com/yulithalta/lisa-research-platform/tree/main/doc/api.md](https://github.com/yulithalta/lisa-research-platform/tree/main/doc/api.md)
[https://github.com/yulithalta/lisa-research-platform/tree/main/doc/api-reference.md](https://github.com/yulithalta/lisa-research-platform/tree/main/doc/api-reference.md)

---

## 9. Performance and Limitations (v3.0.0)

Validated performance:

| Test Condition       | Result                         |
| -------------------- | ------------------------------ |
| Simultaneous cameras | 4 stable 1080p streams         |
| Zigbee sensor load   | 50 sensors, sub-120 ms latency |
| Storage backend      | Local filesystem only          |

Current limitations:

* No cloud storage or automated analytics
* No automatic camera discovery
* Evaluation performed on single-room deployments

---

## 10. Ethical and Data Protection Considerations

Research involving human subjects must adhere to applicable regulations (e.g., GDPR, HIPAA) and institutional ethics approvals.

Built-in features supporting compliance:

* Local-only persistence by default
* Removable personal identifiers in exports
* Explicit session metadata handling

Assessment and guidelines:
[https://github.com/yulithalta/lisa-research-platform/tree/main/doc/gdpr-compliance.md](https://github.com/yulithalta/lisa-research-platform/tree/main/doc/gdpr-compliance.md)
[https://github.com/yulithalta/lisa-research-platform/tree/main/doc/objectives-compliance.md](https://github.com/yulithalta/lisa-research-platform/tree/main/doc/objectives-compliance.md)
[https://github.com/yulithalta/lisa-research-platform/tree/main/doc/security-assessment.md](https://github.com/yulithalta/lisa-research-platform/tree/main/doc/security-assessment.md)

---

## 11. Citation

If using LISA for scientific publications:

Bermúdez et al.,
“LISA: Living-lab Integrated Sensing Architecture for synchronized acquisition of video and sensor data in research environments.”
SoftwareX, 2025. (Under review)

A BibTeX entry will be provided upon acceptance.

---

## 12. License

MIT License.
No warranty is provided. This software must not be used as a certified medical device.

---
