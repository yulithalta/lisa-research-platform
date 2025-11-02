# Session Export Instructions

## What is session export?

Session export allows packaging all data related to a specific monitoring session into a single ZIP file, including video recordings and sensor data. This functionality is essential for preserving and sharing collected data for further analysis or archival.

## What does the ZIP file include?

Each session ZIP file contains:

1. **Video recordings** — All MP4 files associated with the session
2. **Sensor data** — JSON and CSV files with sensor information
3. **Session metadata** — Session description, date/time, and context details
4. **README.txt file** — Detailed explanation of the ZIP content and structure

## How are recordings linked to a session?

The system detects recordings associated with a session based on two criteria:

1. **Camera prefix + session ID in the filename**
   Examples:
   - `cam1_session42_20250502.mp4`
   - `c32_livinglab_s42_video.mp4`
   - `cam2-session42-20250502.mp4`

2. **Directory location**
   MP4 files stored inside the session-specific directory are automatically included:
   - `/sessions/Session42/recordings/any_recording.mp4`

## ZIP file structure

The internal structure of the exported ZIP file is as follows:

```
/
├── README.txt                        # Details about the session and contents
├── recordings/                       # Directory containing video files
│   ├── cam1_session42_20250502.mp4   # Recordings identified by session ID
│   ├── cam2-session42-20250502.mp4   
│   ├── c32_livinglab_s42_video.mp4   
│   └── ...                           
├── data/                             # Directory containing data and metadata
│   ├── zigbee-data.json              # Unified Zigbee data in JSON format
│   ├── zigbee-sensors.csv            # Unified Zigbee data in CSV format
│   ├── devices.json                  # Information about devices involved
│   ├── session_metadata.json         # High-level session metadata
│   └── sensor_data/                  # Sensor-specific raw data
│       ├── sensor_readings.json      # Sensor readings in JSON format
│       └── sensor_readings.csv       # Sensor readings in CSV format
└── ...
```


## Recommendations for naming recordings

To ensure recordings are properly linked to each session:

1. **Use the camera prefix** configured in each camera device
2. **Include the session ID** in the file name using one of the supported formats:
   - `prefix_session{ID}_date.mp4`
   - `prefix-session{ID}-date.mp4`
   - `prefix_s{ID}_date.mp4`

## Troubleshooting common issues

1. **Recordings not included in the ZIP**  
   → Verify that the filename includes the session ID and follows the naming conventions

2. **ZIP does not include sensor data**  
   → Ensure `zigbee-data.json` and `zigbee-sensors.csv` exist inside the `data/` directory

3. **ZIP is nearly empty or only contains README**  
   → Confirm that `/recordings` and `/sessions/Session{ID}` directories exist and contain valid files

## Additional notes

- The export process generates a temporary file that is automatically removed after download
- ZIP generation may take several minutes for large sessions with multiple recordings
- The system automatically excludes unrelated recordings from the export
