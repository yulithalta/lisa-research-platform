# LISA â€” Living-lab Integrated Sensing Architecture

**Version:** 3.0.0  
**Repository:** https://github.com/yulithalta/lisa-research-platform  
**Contact:** Yulith.Altamirano@uclm.es

LISA is an open-source system for time-aligned acquisition of IP video streams and MQTT-based sensor data in controlled research environments.  
It enables reproducible session workflows, structured metadata, and export of synchronized datasets for offline analysis.

This repository contains the reference implementation evaluated in the SoftwareX article.

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

| Component | Version | Notes |
|----------|---------|------|
| OS | Linux (Debian tested) | Reference environment: Debian 12 |
| Node.js | â‰¥ 20 | Backend & development UI |
| NPM | â‰¥ 10 | Dependency management |
| Docker + Compose v2 | Optional infrastructure stack |
| IP Cameras | RTSP/HTTP streams | 4 cameras tested |
| Zigbee Coordinator | CC2531 or equivalent | Zigbee2MQTT interface |
| MQTT Broker | MQTT v3.1+ | 50 sensors tested |

Full compatibility details:  
í ½í³„ `docs/system-architecture.md`

---

## 3. Reproducibility and Experimental Setup

The results reported in the article were obtained with:

- **4 IP cameras** (1080p, synchronized start/stop)
- **50 Zigbee sensors**
- **Local MQTT broker + Zigbee2MQTT**
- Standard LAN deployment in a living-lab room

Environmental parameters required for reproducibility:  
í ½í³„ `docs/setup.md`  
í ½í³„ `docs/technical.md`

---

## 4. Installation

```bash
git clone https://github.com/yulithalta/lisa-research-platform.git
cd lisa-research-platform
npm install
cp .env.example .env
````

Configure `.env` minimally:

| Variable               | Description                |
| ---------------------- | -------------------------- |
| PORT                   | Default HTTP port: 5000    |
| MQTT_BROKER            | e.g. mqtt://localhost:1883 |
| ZIGBEE2MQTT_BASE_TOPIC | e.g. zigbee2mqtt           |

Prepare local recordings directory:

```bash
mkdir -p recordings/sessions
```

Full configuration guidance:
í ½í³„ `docs/config-guide.md`

---

## 5. Optional Docker Infrastructure

Includes:

* Zigbee2MQTT
* Dozzle (container/log monitoring)
* dashdot (system telemetry)

Start development environment:

```bash
./run-lisa.sh dev
```

Stop everything:

```bash
./run-lisa.sh down
```

Component configuration:
í ½í³„ `infrastructure/README.md`
í ½í³„ `docs/TICK_STACK.md` (experimental telemetry)

Zigbee adapter presence is validated automatically; absence does not stop execution.

---

## 6. Development Execution

### Live development (frontend + backend + WebSockets)

```bash
npm run dev
```

### Production build

```bash
npm run build
npm start
```

Web UI:

> [http://localhost:5000](http://localhost:5000)

---

## 7. Data Handling

| File Type | Format     | Location                    |
| --------- | ---------- | --------------------------- |
| Videos    | MP4        | `recordings/sessions/<id>/` |
| Sensors   | JSON + CSV | `data/user_<id>/sessions`   |
| Metadata  | JSON       | Included in exports         |

ZIP export packages preserve:

âœ… timestamps
âœ… device metadata
âœ… file integrity for replication

Data structure specification:
í ½í³„ `docs/technical.md` â†’ *"Data Storage Model"*

---

## 8. Software Architecture

* Backend: Express + WebSockets
* Frontend: React + TypeScript + Vite
* Data validation: Zod
* State management: TanStack Query
* Streaming: FFmpeg (via RTSP)
* Messaging: MQTT.js

Diagram and data flows:
í ½í³„ `docs/API_ARCHITECTURE.md`
í ½í³„ `docs/system-architecture-2.0.svg`

---

## 9. Performance and Limitations

Validated performance for v3.0.0:

| Test Condition       | Result                     |
| -------------------- | -------------------------- |
| Simultaneous cameras | 4 stable 1080p streams     |
| Zigbee sensor load   | 50 sensors, <120ms latency |
| Storage backend      | Local filesystem only      |

Current limitations:

* No cloud storage or analytics
* No automatic camera discovery
* Evaluation performed on single-room deployments

---

## 10. Ethical and Data Protection Considerations

Research involving human subjects **must** adhere to:

* GDPR, HIPAA or equivalent local regulations
* Institutional Review Board / Ethics Committee approvals

Built-in features supporting compliance:

* Local-only persistence by default
* Removable personal identifiers in exports
* Explicit session metadata handling

Complete assessment:
í ½í³„ `docs/gdpr-compliance.md`
í ½í³„ `docs/objectives-compliance.md`

---

## 11. Citation

If using LISA for scientific publications:

> BermÃºdez et al.,
> *LISA: Living-lab Integrated Sensing Architecture for synchronized acquisition of video and sensor data in research environments.*
> SoftwareX, 2025. *(Under review)*

BibTeX will be provided upon acceptance.

---

## 12. License

Released under MIT License.

The authors provide no warranty and accept no liability for medical or safety-critical use.

---
