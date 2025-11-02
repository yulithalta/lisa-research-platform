# **Installation and Configuration Guide**

## **Prerequisites**
- Node.js 18.x or higher  
- ffmpeg installed on the system  
- Access to IP cameras with RTSP  

## **Installation**

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd camera-management-system
````

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Configuration**

   * Create a `.env` file based on `.env.example`
   * Set the following environment variables:

     * `PORT`: Server port
     * `SESSION_SECRET`: Secret key for sessions
     * `STORAGE_PATH`: Storage directory path

4. **Start Application**

   ```bash
   npm run dev
   ```

## **Camera Configuration**

1. Make sure cameras are on the same network
2. Obtain RTSP credentials
3. Configure cameras through the user interface

## **Maintenance**

* Recording files are stored in `/recordings`
* Configuration data is stored in `/data`
* System logs are located in `/logs`

