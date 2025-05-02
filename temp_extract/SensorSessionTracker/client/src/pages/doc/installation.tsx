import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Info, CheckCircle, Copy, Terminal, Download, Server, HardDrive, Database } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InstallationPage() {
  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <h1 className="text-3xl font-bold mb-2">Installation Guide</h1>
      <p className="text-muted-foreground mb-8">Step-by-step instructions for setting up the LISA system</p>
      
      <Tabs defaultValue="prerequisites" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 border border-border/60 shadow-sm">
          <TabsTrigger 
            value="prerequisites" 
            className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Info className="h-4 w-4" />
            Prerequisites
          </TabsTrigger>
          <TabsTrigger 
            value="server" 
            className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Server className="h-4 w-4" />
            Server Setup
          </TabsTrigger>
          <TabsTrigger 
            value="client" 
            className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <HardDrive className="h-4 w-4" />
            Client Setup
          </TabsTrigger>
          <TabsTrigger 
            value="database" 
            className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Database className="h-4 w-4" />
            Database
          </TabsTrigger>
          <TabsTrigger 
            value="mqtt" 
            className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Terminal className="h-4 w-4" />
            MQTT Setup
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prerequisites" className="space-y-6">
          <Card className="border-border/60 shadow-md">
            <CardHeader>
              <CardTitle>System Requirements</CardTitle>
              <CardDescription>Hardware and software requirements for installing LISA</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border border-border/70 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Hardware Requirements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <div className="rounded-full bg-primary/10 text-primary h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                        <div>
                          <strong>Server:</strong> Minimum 4-core CPU, 8GB RAM, 100GB storage
                          <p className="text-xs text-muted-foreground mt-1">For systems with more than 20 cameras, increase resources accordingly</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="rounded-full bg-primary/10 text-primary h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                        <div>
                          <strong>Network:</strong> Gigabit Ethernet, stable connection to all cameras
                          <p className="text-xs text-muted-foreground mt-1">Wireless connections not recommended for production use</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="rounded-full bg-primary/10 text-primary h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                        <div>
                          <strong>Storage:</strong> High-speed SSD for database, larger capacity HDD for recordings
                        </div>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border border-border/70 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Software Requirements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <div className="rounded-full bg-primary/10 text-primary h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                        <div>
                          <strong>Operating System:</strong> Linux (Ubuntu 20.04+ recommended)
                          <p className="text-xs text-muted-foreground mt-1">Windows and macOS are supported but not officially recommended for production</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="rounded-full bg-primary/10 text-primary h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                        <div>
                          <strong>Runtime:</strong> Node.js 18.x or later
                          <Button variant="ghost" size="sm" className="h-6 gap-1 px-1 text-xs">
                            <Download className="h-3 w-3" /> Download Node.js
                          </Button>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="rounded-full bg-primary/10 text-primary h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                        <div>
                          <strong>Additional Software:</strong> FFMPEG, Mosquitto MQTT Broker
                        </div>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Alert variant="default" className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Important Note</AlertTitle>
                <AlertDescription className="text-amber-700">
                  The system must have direct network access to all IP cameras and sensors. Ensure there are no firewall
                  rules blocking communication on the required ports (typically 554 for RTSP, 80/443 for HTTP/S, and 1883 for MQTT).
                </AlertDescription>
              </Alert>

              <div className="bg-muted p-4 rounded-md">
                <h3 className="text-sm font-medium mb-2">Quick System Check</h3>
                <div className="bg-background border border-border/70 rounded-md p-3 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span># Check Node.js version</span>
                    <Button variant="ghost" size="sm" className="h-5 gap-1 px-2 py-0 text-xs">
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                  </div>
                  <p className="mt-1">node -v</p>
                  
                  <div className="flex items-center justify-between mt-3">
                    <span># Check FFMPEG installation</span>
                    <Button variant="ghost" size="sm" className="h-5 gap-1 px-2 py-0 text-xs">
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                  </div>
                  <p className="mt-1">ffmpeg -version</p>
                  
                  <div className="flex items-center justify-between mt-3">
                    <span># Check MQTT broker status</span>
                    <Button variant="ghost" size="sm" className="h-5 gap-1 px-2 py-0 text-xs">
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                  </div>
                  <p className="mt-1">systemctl status mosquitto</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="server" className="space-y-6">
          <Card className="border-border/60 shadow-md">
            <CardHeader>
              <CardTitle>Server Installation</CardTitle>
              <CardDescription>Setting up the LISA server</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-sm">1</div>
                  <h3 className="text-base font-medium">Clone the Repository</h3>
                </div>
                <div className="bg-muted rounded-md p-3 ml-8 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span># Clone the repository</span>
                    <Button variant="ghost" size="sm" className="h-5 gap-1 px-2 py-0 text-xs">
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                  </div>
                  <p className="mt-1">git clone https://github.com/your-org/lisa-monitoring.git</p>
                  <p className="mt-1">cd lisa-monitoring</p>
                </div>
                
                <div className="flex items-center gap-2 mt-4">
                  <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-sm">2</div>
                  <h3 className="text-base font-medium">Install Dependencies</h3>
                </div>
                <div className="bg-muted rounded-md p-3 ml-8 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span># Install npm dependencies</span>
                    <Button variant="ghost" size="sm" className="h-5 gap-1 px-2 py-0 text-xs">
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                  </div>
                  <p className="mt-1">npm install</p>
                </div>
                
                <div className="flex items-center gap-2 mt-4">
                  <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-sm">3</div>
                  <h3 className="text-base font-medium">Configure Environment</h3>
                </div>
                <div className="ml-8">
                  <p className="text-sm mb-2">Create a <code className="bg-muted px-1 py-0.5 rounded text-xs">.env</code> file in the root directory:</p>
                  <div className="bg-muted rounded-md p-3 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span># Sample .env file</span>
                      <Button variant="ghost" size="sm" className="h-5 gap-1 px-2 py-0 text-xs">
                        <Copy className="h-3 w-3" /> Copy
                      </Button>
                    </div>
                    <p className="mt-1">PORT=5000</p>
                    <p className="mt-1">NODE_ENV=production</p>
                    <p className="mt-1">SESSION_SECRET=your-secure-session-secret</p>
                    <p className="mt-1">DATABASE_URL=postgresql://user:password@localhost:5432/lisa</p>
                    <p className="mt-1">MQTT_BROKER=mqtt://localhost:1883</p>
                    <p className="mt-1">MQTT_USERNAME=mqttuser</p>
                    <p className="mt-1">MQTT_PASSWORD=mqttpassword</p>
                    <p className="mt-1">RECORDINGS_PATH=/path/to/recordings</p>
                  </div>
                </div>

                <Alert variant="default" className="ml-8 bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-800">Security Note</AlertTitle>
                  <AlertDescription className="text-blue-700">
                    For production environments, always use strong, unique values for SESSION_SECRET and other credentials.
                    Never commit the .env file to version control.
                  </AlertDescription>
                </Alert>
                
                <div className="flex items-center gap-2 mt-4">
                  <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-sm">4</div>
                  <h3 className="text-base font-medium">Build the Application</h3>
                </div>
                <div className="bg-muted rounded-md p-3 ml-8 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span># Build the frontend and backend</span>
                    <Button variant="ghost" size="sm" className="h-5 gap-1 px-2 py-0 text-xs">
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                  </div>
                  <p className="mt-1">npm run build</p>
                </div>
                
                <div className="flex items-center gap-2 mt-4">
                  <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-sm">5</div>
                  <h3 className="text-base font-medium">Start the Server</h3>
                </div>
                <div className="bg-muted rounded-md p-3 ml-8 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span># Start the production server</span>
                    <Button variant="ghost" size="sm" className="h-5 gap-1 px-2 py-0 text-xs">
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                  </div>
                  <p className="mt-1">npm run start</p>
                  <p className="mt-2 text-green-600"># The server should be running at http://localhost:5000</p>
                </div>
                
                <div className="flex items-center gap-2 mt-4">
                  <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-sm">6</div>
                  <h3 className="text-base font-medium">Setup as a System Service (Optional)</h3>
                </div>
                <div className="ml-8">
                  <p className="text-sm mb-2">Create a systemd service file for automatic startup:</p>
                  <div className="bg-muted rounded-md p-3 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span># /etc/systemd/system/lisa.service</span>
                      <Button variant="ghost" size="sm" className="h-5 gap-1 px-2 py-0 text-xs">
                        <Copy className="h-3 w-3" /> Copy
                      </Button>
                    </div>
                    <p className="mt-1">[Unit]</p>
                    <p className="mt-1">Description=LISA Monitoring System</p>
                    <p className="mt-1">After=network.target</p>
                    <p className="mt-1"></p>
                    <p className="mt-1">[Service]</p>
                    <p className="mt-1">User=your-user</p>
                    <p className="mt-1">WorkingDirectory=/path/to/lisa-monitoring</p>
                    <p className="mt-1">ExecStart=/usr/bin/npm run start</p>
                    <p className="mt-1">Restart=always</p>
                    <p className="mt-1">RestartSec=10</p>
                    <p className="mt-1">StandardOutput=syslog</p>
                    <p className="mt-1">StandardError=syslog</p>
                    <p className="mt-1">SyslogIdentifier=lisa</p>
                    <p className="mt-1">Environment=NODE_ENV=production</p>
                    <p className="mt-1"></p>
                    <p className="mt-1">[Install]</p>
                    <p className="mt-1">WantedBy=multi-user.target</p>
                  </div>
                  
                  <div className="bg-muted rounded-md p-3 mt-4 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span># Enable and start the service</span>
                      <Button variant="ghost" size="sm" className="h-5 gap-1 px-2 py-0 text-xs">
                        <Copy className="h-3 w-3" /> Copy
                      </Button>
                    </div>
                    <p className="mt-1">sudo systemctl enable lisa.service</p>
                    <p className="mt-1">sudo systemctl start lisa.service</p>
                    <p className="mt-1">sudo systemctl status lisa.service</p>
                  </div>
                </div>

                <div className="mt-4 ml-8 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <p className="text-sm text-green-700">
                    If everything is set up correctly, the LISA server should now be running and accessible.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="client" className="space-y-6">
          <Card className="border-border/60 shadow-md">
            <CardHeader>
              <CardTitle>Client Configuration</CardTitle>
              <CardDescription>Setting up client access and browser requirements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="mb-4">
                LISA is a web-based application that runs in modern browsers. Here's how to set up client access:
              </p>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Browser Requirements</h3>
                <Card className="border border-border/70 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Supported Browsers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Chrome 90+</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Firefox 88+</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Edge 90+</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Safari 14+</span>
                      </div>
                    </div>
                    <p className="text-sm mt-4">
                      WebRTC and WebSocket support is required for real-time video streaming and data updates.
                    </p>
                  </CardContent>
                </Card>
                
                <h3 className="text-lg font-medium mt-4">Client Setup</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-sm">1</div>
                    <h3 className="text-base font-medium">Access the Web Interface</h3>
                  </div>
                  <div className="ml-8">
                    <p className="text-sm mb-2">
                      Open a supported web browser and navigate to the server address:
                    </p>
                    <div className="bg-muted rounded-md p-3 text-xs font-mono">
                      <p>http://server-ip:5000</p>
                      <p className="mt-1">For example: http://192.168.1.100:5000</p>
                    </div>
                    <p className="text-sm mt-2">
                      For production environments, it's recommended to set up HTTPS with a valid SSL certificate.
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-4">
                    <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-sm">2</div>
                    <h3 className="text-base font-medium">First-time Login</h3>
                  </div>
                  <div className="ml-8">
                    <p className="text-sm mb-2">
                      On first access, log in with the default credentials:
                    </p>
                    <div className="bg-muted rounded-md p-3 text-xs">
                      <p><strong>Username:</strong> admin</p>
                      <p><strong>Password:</strong> admin123</p>
                    </div>
                    <Alert variant="destructive" className="mt-3">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Important Security Warning</AlertTitle>
                      <AlertDescription>
                        Change the default password immediately after first login to prevent unauthorized access.
                      </AlertDescription>
                    </Alert>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-4">
                    <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-sm">3</div>
                    <h3 className="text-base font-medium">Change Default Password</h3>
                  </div>
                  <div className="ml-8">
                    <p className="text-sm mb-2">
                      After logging in, immediately navigate to the Settings page to change your password:
                    </p>
                    <ol className="list-decimal ml-5 text-sm space-y-1">
                      <li>Click on your username in the top right corner</li>
                      <li>Select "Settings" from the dropdown menu</li>
                      <li>Click on the "Security" tab</li>
                      <li>Enter and confirm your new password</li>
                      <li>Click "Save Changes"</li>
                    </ol>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-4">
                    <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-sm">4</div>
                    <h3 className="text-base font-medium">Configure Browser Settings (Optional)</h3>
                  </div>
                  <div className="ml-8">
                    <p className="text-sm mb-2">
                      For optimal experience, adjust these browser settings:
                    </p>
                    <ul className="list-disc ml-5 text-sm space-y-1">
                      <li>Allow notifications for real-time alerts</li>
                      <li>Allow the site to use your camera and microphone if using the operator communication features</li>
                      <li>Disable power-saving features when monitoring is critical</li>
                      <li>For dedicated monitoring stations, consider running the browser in kiosk mode</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-6">
          <Card className="border-border/60 shadow-md">
            <CardHeader>
              <CardTitle>Database Setup</CardTitle>
              <CardDescription>Setting up and configuring the PostgreSQL database</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-sm">1</div>
                  <h3 className="text-base font-medium">Install PostgreSQL</h3>
                </div>
                <div className="bg-muted rounded-md p-3 ml-8 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span># On Ubuntu/Debian</span>
                    <Button variant="ghost" size="sm" className="h-5 gap-1 px-2 py-0 text-xs">
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                  </div>
                  <p className="mt-1">sudo apt update</p>
                  <p className="mt-1">sudo apt install postgresql postgresql-contrib</p>
                  <p className="mt-2"># Verify installation</p>
                  <p className="mt-1">sudo systemctl status postgresql</p>
                </div>
                
                <div className="flex items-center gap-2 mt-4">
                  <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-sm">2</div>
                  <h3 className="text-base font-medium">Create Database and User</h3>
                </div>
                <div className="bg-muted rounded-md p-3 ml-8 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span># Switch to postgres user</span>
                    <Button variant="ghost" size="sm" className="h-5 gap-1 px-2 py-0 text-xs">
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                  </div>
                  <p className="mt-1">sudo -i -u postgres</p>
                  <p className="mt-2"># Create a database user</p>
                  <p className="mt-1">createuser --interactive --pwprompt lisauser</p>
                  <p className="mt-1"># Enter password when prompted</p>
                  <p className="mt-2"># Create the database</p>
                  <p className="mt-1">createdb --owner=lisauser lisa</p>
                  <p className="mt-2"># Exit postgres user</p>
                  <p className="mt-1">exit</p>
                </div>
                
                <div className="flex items-center gap-2 mt-4">
                  <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-sm">3</div>
                  <h3 className="text-base font-medium">Configure Database Access</h3>
                </div>
                <div className="ml-8">
                  <p className="text-sm mb-2">Edit PostgreSQL configuration to allow connections:</p>
                  <div className="bg-muted rounded-md p-3 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span># Edit pg_hba.conf</span>
                      <Button variant="ghost" size="sm" className="h-5 gap-1 px-2 py-0 text-xs">
                        <Copy className="h-3 w-3" /> Copy
                      </Button>
                    </div>
                    <p className="mt-1">sudo nano /etc/postgresql/13/main/pg_hba.conf</p>
                    <p className="mt-2"># Add this line to allow local connections</p>
                    <p className="mt-1">host    lisa    lisauser    127.0.0.1/32    md5</p>
                    <p className="mt-2"># Save and exit</p>
                  </div>
                  
                  <div className="bg-muted rounded-md p-3 mt-4 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span># Restart PostgreSQL</span>
                      <Button variant="ghost" size="sm" className="h-5 gap-1 px-2 py-0 text-xs">
                        <Copy className="h-3 w-3" /> Copy
                      </Button>
                    </div>
                    <p className="mt-1">sudo systemctl restart postgresql</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-4">
                  <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-sm">4</div>
                  <h3 className="text-base font-medium">Update Application Configuration</h3>
                </div>
                <div className="ml-8">
                  <p className="text-sm mb-2">
                    Update the DATABASE_URL in your .env file:
                  </p>
                  <div className="bg-muted rounded-md p-3 text-xs font-mono">
                    <p>DATABASE_URL=postgresql://lisauser:your-password@localhost:5432/lisa</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-4">
                  <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-sm">5</div>
                  <h3 className="text-base font-medium">Run Database Migrations</h3>
                </div>
                <div className="bg-muted rounded-md p-3 ml-8 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span># Apply database schema</span>
                    <Button variant="ghost" size="sm" className="h-5 gap-1 px-2 py-0 text-xs">
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                  </div>
                  <p className="mt-1">npm run db:push</p>
                </div>
                
                <div className="flex items-center gap-2 mt-4">
                  <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-sm">6</div>
                  <h3 className="text-base font-medium">Verify Database Connection</h3>
                </div>
                <div className="bg-muted rounded-md p-3 ml-8 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span># Start the application in development mode</span>
                    <Button variant="ghost" size="sm" className="h-5 gap-1 px-2 py-0 text-xs">
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                  </div>
                  <p className="mt-1">npm run dev</p>
                  <p className="mt-2"># Check for database connection messages in the console</p>
                </div>
              </div>

              <Alert variant="default" className="bg-blue-50 border-blue-200 mt-4">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">Database Maintenance</AlertTitle>
                <AlertDescription className="text-blue-700">
                  <p className="mb-2">Regular database maintenance is recommended:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Set up regular backups of the database</li>
                    <li>Monitor disk space usage as video metadata can grow quickly</li>
                    <li>Consider setting up a retention policy for old sessions</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mqtt" className="space-y-6">
          <Card className="border-border/60 shadow-md">
            <CardHeader>
              <CardTitle>MQTT Broker Setup</CardTitle>
              <CardDescription>Configuring the MQTT broker for sensor integration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-sm">1</div>
                  <h3 className="text-base font-medium">Install Mosquitto MQTT Broker</h3>
                </div>
                <div className="bg-muted rounded-md p-3 ml-8 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span># On Ubuntu/Debian</span>
                    <Button variant="ghost" size="sm" className="h-5 gap-1 px-2 py-0 text-xs">
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                  </div>
                  <p className="mt-1">sudo apt update</p>
                  <p className="mt-1">sudo apt install mosquitto mosquitto-clients</p>
                  <p className="mt-2"># Start and enable the service</p>
                  <p className="mt-1">sudo systemctl start mosquitto</p>
                  <p className="mt-1">sudo systemctl enable mosquitto</p>
                </div>
                
                <div className="flex items-center gap-2 mt-4">
                  <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-sm">2</div>
                  <h3 className="text-base font-medium">Configure Authentication</h3>
                </div>
                <div className="ml-8">
                  <p className="text-sm mb-2">Create a password file:</p>
                  <div className="bg-muted rounded-md p-3 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span># Create a password file</span>
                      <Button variant="ghost" size="sm" className="h-5 gap-1 px-2 py-0 text-xs">
                        <Copy className="h-3 w-3" /> Copy
                      </Button>
                    </div>
                    <p className="mt-1">sudo mosquitto_passwd -c /etc/mosquitto/passwd mqttuser</p>
                    <p className="mt-1"># Enter password when prompted</p>
                  </div>
                  
                  <p className="text-sm mt-4 mb-2">Configure Mosquitto:</p>
                  <div className="bg-muted rounded-md p-3 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span># Create a configuration file</span>
                      <Button variant="ghost" size="sm" className="h-5 gap-1 px-2 py-0 text-xs">
                        <Copy className="h-3 w-3" /> Copy
                      </Button>
                    </div>
                    <p className="mt-1">sudo nano /etc/mosquitto/conf.d/default.conf</p>
                    <p className="mt-2"># Add the following configuration</p>
                    <p className="mt-1">listener 1883</p>
                    <p className="mt-1">allow_anonymous false</p>
                    <p className="mt-1">password_file /etc/mosquitto/passwd</p>
                    <p className="mt-1"></p>
                    <p className="mt-1"># For WebSocket support (optional but recommended)</p>
                    <p className="mt-1">listener 9001</p>
                    <p className="mt-1">protocol websockets</p>
                    <p className="mt-1">allow_anonymous false</p>
                    <p className="mt-1">password_file /etc/mosquitto/passwd</p>
                  </div>
                  
                  <div className="bg-muted rounded-md p-3 mt-4 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span># Restart Mosquitto</span>
                      <Button variant="ghost" size="sm" className="h-5 gap-1 px-2 py-0 text-xs">
                        <Copy className="h-3 w-3" /> Copy
                      </Button>
                    </div>
                    <p className="mt-1">sudo systemctl restart mosquitto</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-4">
                  <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-sm">3</div>
                  <h3 className="text-base font-medium">Test MQTT Configuration</h3>
                </div>
                <div className="ml-8">
                  <p className="text-sm mb-2">Subscribe to a test topic in one terminal:</p>
                  <div className="bg-muted rounded-md p-3 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span># Subscribe to test topic</span>
                      <Button variant="ghost" size="sm" className="h-5 gap-1 px-2 py-0 text-xs">
                        <Copy className="h-3 w-3" /> Copy
                      </Button>
                    </div>
                    <p className="mt-1">mosquitto_sub -h localhost -p 1883 -u mqttuser -P yourpassword -t "test/topic"</p>
                  </div>
                  
                  <p className="text-sm mt-4 mb-2">Publish a test message in another terminal:</p>
                  <div className="bg-muted rounded-md p-3 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span># Publish to test topic</span>
                      <Button variant="ghost" size="sm" className="h-5 gap-1 px-2 py-0 text-xs">
                        <Copy className="h-3 w-3" /> Copy
                      </Button>
                    </div>
                    <p className="mt-1">mosquitto_pub -h localhost -p 1883 -u mqttuser -P yourpassword -t "test/topic" -m "Hello MQTT"</p>
                  </div>
                  
                  <p className="text-sm mt-2">
                    You should see "Hello MQTT" appear in the subscription terminal if everything is configured correctly.
                  </p>
                </div>
                
                <div className="flex items-center gap-2 mt-4">
                  <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-sm">4</div>
                  <h3 className="text-base font-medium">Configure Zigbee2MQTT (Optional)</h3>
                </div>
                <div className="ml-8">
                  <p className="text-sm mb-2">
                    If you're using Zigbee devices, you'll need to set up Zigbee2MQTT:
                  </p>
                  <div className="bg-muted rounded-md p-3 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span># Clone Zigbee2MQTT</span>
                      <Button variant="ghost" size="sm" className="h-5 gap-1 px-2 py-0 text-xs">
                        <Copy className="h-3 w-3" /> Copy
                      </Button>
                    </div>
                    <p className="mt-1">git clone https://github.com/Koenkk/zigbee2mqtt.git</p>
                    <p className="mt-1">cd zigbee2mqtt</p>
                    <p className="mt-1">npm install</p>
                  </div>
                  
                  <p className="text-sm mt-4 mb-2">Configure Zigbee2MQTT:</p>
                  <div className="bg-muted rounded-md p-3 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span># Edit configuration</span>
                      <Button variant="ghost" size="sm" className="h-5 gap-1 px-2 py-0 text-xs">
                        <Copy className="h-3 w-3" /> Copy
                      </Button>
                    </div>
                    <p className="mt-1">cp data/configuration.yaml.example data/configuration.yaml</p>
                    <p className="mt-1">nano data/configuration.yaml</p>
                    <p className="mt-2"># Update these settings:</p>
                    <p className="mt-1">mqtt:</p>
                    <p className="mt-1">  base_topic: zigbee2mqtt</p>
                    <p className="mt-1">  server: mqtt://localhost:1883</p>
                    <p className="mt-1">  user: mqttuser</p>
                    <p className="mt-1">  password: yourpassword</p>
                    <p className="mt-1">serial:</p>
                    <p className="mt-1">  port: /dev/ttyACM0  # Update with your actual Zigbee adapter port</p>
                  </div>
                  
                  <div className="bg-muted rounded-md p-3 mt-4 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span># Start Zigbee2MQTT</span>
                      <Button variant="ghost" size="sm" className="h-5 gap-1 px-2 py-0 text-xs">
                        <Copy className="h-3 w-3" /> Copy
                      </Button>
                    </div>
                    <p className="mt-1">npm start</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-4">
                  <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-sm">5</div>
                  <h3 className="text-base font-medium">Update Application Configuration</h3>
                </div>
                <div className="ml-8">
                  <p className="text-sm mb-2">
                    Update your .env file with MQTT connection details:
                  </p>
                  <div className="bg-muted rounded-md p-3 text-xs font-mono">
                    <p>MQTT_BROKER=mqtt://localhost:1883</p>
                    <p>MQTT_USERNAME=mqttuser</p>
                    <p>MQTT_PASSWORD=yourpassword</p>
                    <p>MQTT_TOPICS=zigbee2mqtt/#,sensors/#,lisa/#</p>
                  </div>
                </div>

                <Alert variant="default" className="ml-8 bg-blue-50 border-blue-200 mt-4">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-800">MQTT Topic Structure</AlertTitle>
                  <AlertDescription className="text-blue-700">
                    <p className="mb-2">LISA subscribes to these topics by default:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><code className="bg-muted px-1 py-0.5 rounded text-xs">zigbee2mqtt/#</code> - All Zigbee2MQTT messages</li>
                      <li><code className="bg-muted px-1 py-0.5 rounded text-xs">sensors/#</code> - Generic sensor data</li>
                      <li><code className="bg-muted px-1 py-0.5 rounded text-xs">lisa/#</code> - System-specific messages</li>
                    </ul>
                    <p className="mt-2">You can add custom topics in the MQTT_TOPICS environment variable.</p>
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}