import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InfoIcon, AlertCircle, ArrowRight, BookOpen, FileText, HelpCircle, MessageSquare, PlayCircle, Video, Compass } from "lucide-react";
import { ToursManager } from "@/components/onboarding/tours-manager";

export default function HelpPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Help Center</h1>
          <p className="text-muted-foreground">Find answers to common questions and learn how to use the system effectively</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-transparent grid grid-cols-7 gap-2">
          <TabsTrigger value="general" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/50 border border-border/30 shadow-sm">
            <InfoIcon className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/50 border border-border/30 shadow-sm">
            <FileText className="h-4 w-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="cameras" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/50 border border-border/30 shadow-sm">
            <Video className="h-4 w-4" />
            Cameras
          </TabsTrigger>
          <TabsTrigger value="sensors" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/50 border border-border/30 shadow-sm">
            <AlertCircle className="h-4 w-4" />
            Sensors
          </TabsTrigger>
          <TabsTrigger value="gdpr" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/50 border border-border/30 shadow-sm">
            <FileText className="h-4 w-4" />
            GDPR
          </TabsTrigger>
          <TabsTrigger value="troubleshooting" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/50 border border-border/30 shadow-sm">
            <HelpCircle className="h-4 w-4" />
            Troubleshooting
          </TabsTrigger>
          <TabsTrigger value="tours" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/50 border border-border/30 shadow-sm">
            <Compass className="h-4 w-4" />
            Interactive Tours
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="border-border/60 shadow-md">
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>Basic information about the monitoring system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border border-border/70 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <PlayCircle className="h-5 w-5 text-primary" />
                      Quick Start Guide
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">Learn the basics of setting up and using the monitoring system.</p>
                    <Button variant="link" className="p-0 h-auto mt-2 text-primary flex items-center gap-1">
                      View guide <ArrowRight className="h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border border-border/70 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      Documentation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">Comprehensive technical documentation of the system.</p>
                    <Button variant="link" className="p-0 h-auto mt-2 text-primary flex items-center gap-1" asChild>
                      <a href="/docs">
                        View documentation <ArrowRight className="h-3 w-3" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1" className="border border-border/60 rounded-md mb-2 shadow-sm">
                  <AccordionTrigger className="px-4">What is the monitoring system?</AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <p className="mb-2">
                      The monitoring system is a comprehensive platform designed for clinical and research environments to synchronize and record data from IP cameras and various sensors via MQTT and Zigbee protocols.
                    </p>
                    <p>
                      It allows researchers to create monitoring sessions, capture synchronized video and sensor data, and export the results for analysis.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2" className="border border-border/60 rounded-md mb-2 shadow-sm">
                  <AccordionTrigger className="px-4">How do I navigate the interface?</AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <p className="mb-2">
                      The system has a sidebar navigation menu with these main sections:
                    </p>
                    <ul className="list-disc pl-6 space-y-1 mb-2">
                      <li><strong>Dashboard</strong> - System overview and statistics</li>
                      <li><strong>Sessions</strong> - Create and manage recording sessions</li>
                      <li><strong>Live Monitoring</strong> - Real-time view of cameras and sensor data</li>
                      <li><strong>Device Management</strong> - Add and configure cameras and sensors</li>
                      <li><strong>Help</strong> - Documentation and support resources</li>
                    </ul>
                    <p>
                      Each section has tabs or cards to organize related functionality.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3" className="border border-border/60 rounded-md shadow-sm">
                  <AccordionTrigger className="px-4">What are the system requirements?</AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <p className="mb-2">
                      To use the monitoring system, you need:
                    </p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>A modern web browser (Chrome, Firefox, Edge, or Safari)</li>
                      <li>IP cameras with RTSP or HTTP streaming capabilities</li>
                      <li>An MQTT broker for sensor connectivity (if using sensors)</li>
                      <li>Zigbee2MQTT setup (if using Zigbee devices)</li>
                      <li>Network connectivity between all components</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          <Card className="border-border/60 shadow-md">
            <CardHeader>
              <CardTitle>Session Management</CardTitle>
              <CardDescription>Recording, searching, and exporting sessions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="session-1" className="border border-border/60 rounded-md mb-2 shadow-sm">
                  <AccordionTrigger className="px-4">How do I create a new monitoring session?</AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <p className="mb-2">To create a new monitoring session:</p>
                    <ol className="list-decimal pl-6 space-y-1 mb-2">
                      <li>Navigate to the "Sessions" page</li>
                      <li>Click "New Monitoring Session"</li>
                      <li>Fill in the session details:
                        <ul className="list-disc pl-6 mt-1 space-y-1">
                          <li>Laboratory Title - Name of your laboratory or experiment</li>
                          <li>Session Description - Brief description of the session (max 300 chars)</li>
                          <li>Researcher Name - Your name or the person conducting the session</li>
                          <li>Participant Tags - Names of participants separated by commas</li>
                        </ul>
                      </li>
                      <li>Select the cameras and sensors you want to monitor</li>
                      <li>Click "Start Session" to begin recording</li>
                    </ol>
                    <p>
                      The session will begin immediately and record both video from selected cameras and data from selected sensors until manually stopped.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="session-2" className="border border-border/60 rounded-md mb-2 shadow-sm">
                  <AccordionTrigger className="px-4">How do I search for previous sessions?</AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <p className="mb-2">The session history search supports multiple criteria:</p>
                    <ul className="list-disc pl-6 space-y-1 mb-2">
                      <li><strong>Text Search</strong> - Enter words to search across titles, descriptions, participant names, and researcher names</li>
                      <li><strong>Participant Tags</strong> - Use # followed by the participant name (e.g., #John) to search for specific participants</li>
                      <li><strong>Date Range</strong> - Click the calendar icon to select a date range filter</li>
                    </ul>
                    <p className="mb-2">
                      The search uses OR logic between terms, so you can enter multiple terms to find sessions matching any of them.
                    </p>
                    <p>
                      Active search terms appear as tags under the search box, and you'll see how many results match your criteria.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="session-3" className="border border-border/60 rounded-md shadow-sm">
                  <AccordionTrigger className="px-4">How do I export session data?</AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <p className="mb-2">To export session data:</p>
                    <ol className="list-decimal pl-6 space-y-1 mb-2">
                      <li>Navigate to the "Sessions" page</li>
                      <li>Find the session you want to export</li>
                      <li>Click on the session to view details</li>
                      <li>Click "Download ZIP" to download all recordings and sensor data</li>
                      <li>Alternatively, click "Export as CSV" to get sensor data in CSV format</li>
                    </ol>
                    <p className="mb-2">
                      The ZIP download includes:
                    </p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Video recordings from all cameras</li>
                      <li>Sensor data in JSON format</li>
                      <li>Session metadata including title, description, researcher, and participants</li>
                      <li>Timestamps for synchronization between video and sensor data</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cameras" className="space-y-6">
          <Card className="border-border/60 shadow-md">
            <CardHeader>
              <CardTitle>Camera Management</CardTitle>
              <CardDescription>Adding, verifying, and recording with cameras</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="camera-1" className="border border-border/60 rounded-md mb-2 shadow-sm">
                  <AccordionTrigger className="px-4">How do I add a new camera?</AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <p className="mb-2">To add a new camera:</p>
                    <ol className="list-decimal pl-6 space-y-1 mb-2">
                      <li>Navigate to "Device Management" and select the "Cameras" tab</li>
                      <li>Click "Add Camera"</li>
                      <li>Fill in the camera details:
                        <ul className="list-disc pl-6 mt-1 space-y-1">
                          <li>Name - A descriptive name for the camera</li>
                          <li>IP Address - The IP address of the camera</li>
                          <li>RTSP URL - The RTSP URL for streaming (usually rtsp://ip:port/path)</li>
                          <li>HTTP URL - The HTTP URL for the camera (usually http://ip)</li>
                          <li>Username/Password - If required for authentication</li>
                        </ul>
                      </li>
                      <li>Click "Save" to add the camera</li>
                    </ol>
                    <p>
                      After adding, you can verify the camera's connectivity by clicking the "Verify" button.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="camera-2" className="border border-border/60 rounded-md mb-2 shadow-sm">
                  <AccordionTrigger className="px-4">How do camera status indicators work?</AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <p className="mb-2">Camera cards show status with color indicators:</p>
                    <ul className="list-disc pl-6 space-y-1 mb-2">
                      <li><strong>Green</strong> - Camera is online and available</li>
                      <li><strong>Yellow</strong> - Status unknown (needs verification)</li>
                      <li><strong>Red</strong> - Camera is offline or unreachable</li>
                      <li><strong>Blue</strong> - Camera is currently recording</li>
                    </ul>
                    <p>
                      The "Verify" button checks if the camera is online and responsive. FPS and bitrate information is directly from the camera stream metadata when available.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="camera-3" className="border border-border/60 rounded-md shadow-sm">
                  <AccordionTrigger className="px-4">What camera types and protocols are supported?</AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <p className="mb-2">The system supports:</p>
                    <ul className="list-disc pl-6 space-y-1 mb-2">
                      <li>IP cameras with RTSP streaming</li>
                      <li>IP cameras with HTTP streaming</li>
                      <li>Common camera brands including Hikvision, Dahua, Axis, Amcrest, and others</li>
                      <li>H.264 and H.265 video codecs</li>
                      <li>Various resolutions (from 480p to 4K, depending on hardware capabilities)</li>
                    </ul>
                    <p>
                      Camera verification is done via basic HTTP checks to ensure the camera is online and responsive. No simulations are used - all connections are direct to the actual hardware.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sensors" className="space-y-6">
          <Card className="border-border/60 shadow-md">
            <CardHeader>
              <CardTitle>Sensor Management</CardTitle>
              <CardDescription>Connecting to MQTT and managing sensors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="sensor-1" className="border border-border/60 rounded-md mb-2 shadow-sm">
                  <AccordionTrigger className="px-4">How do I connect to an MQTT broker?</AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <p className="mb-2">To connect to an MQTT broker:</p>
                    <ol className="list-decimal pl-6 space-y-1 mb-2">
                      <li>Navigate to "Device Management" and select the "MQTT Sensors" tab</li>
                      <li>Enter the MQTT broker settings:
                        <ul className="list-disc pl-6 mt-1 space-y-1">
                          <li>Broker URL - The URL of your MQTT broker (e.g., mqtt://192.168.1.100)</li>
                          <li>Port - The port your broker is running on (default: 1883)</li>
                          <li>Username/Password - If required for authentication</li>
                          <li>Topics - List of MQTT topics to subscribe to</li>
                        </ul>
                      </li>
                      <li>Click "Connect" to establish the connection</li>
                    </ol>
                    <p>
                      The system will maintain the connection and automatically reconnect if the connection is lost. You can check the connection status on the dashboard.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="sensor-2" className="border border-border/60 rounded-md mb-2 shadow-sm">
                  <AccordionTrigger className="px-4">How do I integrate Zigbee devices?</AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <p className="mb-2">To integrate Zigbee devices:</p>
                    <ol className="list-decimal pl-6 space-y-1 mb-2">
                      <li>Ensure you have Zigbee2MQTT running on your network</li>
                      <li>Navigate to "Device Management" and select the "Zigbee Devices" tab</li>
                      <li>Enter the MQTT details for your Zigbee2MQTT instance</li>
                      <li>Click "Scan" to discover available Zigbee devices</li>
                      <li>Select the devices you want to integrate</li>
                      <li>Click "Save" to store the configuration</li>
                    </ol>
                    <p>
                      The system will now receive and record data from these Zigbee devices when a session is active.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="sensor-3" className="border border-border/60 rounded-md shadow-sm">
                  <AccordionTrigger className="px-4">How is sensor data stored?</AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <p className="mb-2">Sensor data is stored in two formats:</p>
                    <ol className="list-decimal pl-6 space-y-1 mb-2">
                      <li>Individual JSON files for each sensor type, with timestamped entries</li>
                      <li>A consolidated JSON file containing all sensor data with synchronization information</li>
                    </ol>
                    <p className="mb-2">
                      When exporting a session, you can choose:
                    </p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Full ZIP export - Contains all sensor data in both formats</li>
                      <li>CSV export - Converts sensor data to CSV format for easier analysis</li>
                    </ul>
                    <p>
                      The system uses an Observer pattern implementation to efficiently handle large numbers of sensors (up to 10,000) without performance degradation.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gdpr" className="space-y-6">
          <Card className="border-border/60 shadow-md">
            <CardHeader>
              <CardTitle>GDPR Compliance</CardTitle>
              <CardDescription>Privacy, data protection, and consent management</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="gdpr-1" className="border border-border/60 rounded-md mb-2 shadow-sm">
                  <AccordionTrigger className="px-4">What GDPR features are implemented in LISA?</AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <p className="mb-2">LISA includes comprehensive GDPR compliance features:</p>
                    <ul className="list-disc pl-6 space-y-1 mb-2">
                      <li><strong>Consent Management</strong> - A system for obtaining, storing, and tracking user consent</li>
                      <li><strong>Access Auditing</strong> - Detailed logs of who accessed what data, when, and for what purpose</li>
                      <li><strong>Data Export</strong> - Tools to export all user data in a portable format</li>
                      <li><strong>Data Deletion</strong> - Methods to delete or anonymize user data upon request</li>
                      <li><strong>Privacy by Design</strong> - Built-in data minimization and purpose limitation</li>
                    </ul>
                    <p>
                      These features help ensure that the system complies with GDPR requirements for clinical and research environments.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="gdpr-2" className="border border-border/60 rounded-md mb-2 shadow-sm">
                  <AccordionTrigger className="px-4">How does the consent management system work?</AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <p className="mb-2">The consent management system works as follows:</p>
                    <ol className="list-decimal pl-6 space-y-1 mb-2">
                      <li>Administrators can create consent forms with:
                        <ul className="list-disc pl-6 mt-1 space-y-1">
                          <li>Title and description</li>
                          <li>Legal basis for processing</li>
                          <li>Purpose of data collection</li>
                          <li>Data retention period</li>
                          <li>Categories of data being collected</li>
                        </ul>
                      </li>
                      <li>When a user needs to provide consent:
                        <ul className="list-disc pl-6 mt-1 space-y-1">
                          <li>The consent form is presented to them</li>
                          <li>They can accept or decline</li>
                          <li>Their choice is recorded with a timestamp and IP address</li>
                          <li>For record-keeping, a copy of the version they agreed to is stored</li>
                        </ul>
                      </li>
                      <li>Users can:
                        <ul className="list-disc pl-6 mt-1 space-y-1">
                          <li>View all consents they've provided</li>
                          <li>Withdraw consent at any time</li>
                          <li>Request data export or deletion</li>
                        </ul>
                      </li>
                    </ol>
                    <p>
                      The system maintains a complete audit trail of all consent-related actions.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="gdpr-3" className="border border-border/60 rounded-md shadow-sm">
                  <AccordionTrigger className="px-4">How do I generate GDPR compliance reports?</AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <p className="mb-2">For auditing and compliance purposes, administrators can generate several types of reports:</p>
                    <ul className="list-disc pl-6 space-y-1 mb-2">
                      <li><strong>Consent Audit</strong> - Shows all consent activities, including who gave consent, when, and for what</li>
                      <li><strong>Access Log Report</strong> - Details of who accessed what data, when, and why</li>
                      <li><strong>Data Processing Inventory</strong> - List of all data processing activities in the system</li>
                      <li><strong>Data Export Requests</strong> - Records of all data portability requests</li>
                      <li><strong>Data Deletion Requests</strong> - Records of all "right to be forgotten" requests</li>
                    </ul>
                    <p className="mb-2">
                      To generate these reports:
                    </p>
                    <ol className="list-decimal pl-6 space-y-1">
                      <li>Navigate to the "Settings" section</li>
                      <li>Select the "GDPR & Privacy" tab</li>
                      <li>Choose the type of report you need</li>
                      <li>Set the date range and other filter parameters</li>
                      <li>Click "Generate Report"</li>
                      <li>Export the report in PDF or CSV format</li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="troubleshooting" className="space-y-6">
          <Card className="border-border/60 shadow-md">
            <CardHeader>
              <CardTitle>Troubleshooting</CardTitle>
              <CardDescription>Common issues and solutions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="troubleshooting-1" className="border border-border/60 rounded-md mb-2 shadow-sm">
                  <AccordionTrigger className="px-4">Camera streaming issues</AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <p className="mb-2">If you're having issues with camera streams:</p>
                    <ol className="list-decimal pl-6 space-y-1 mb-2">
                      <li>Verify the camera is powered on and connected to the network</li>
                      <li>Check that the IP address is correct</li>
                      <li>Ensure RTSP and HTTP URLs are properly formatted</li>
                      <li>Verify that username and password are correct (if required)</li>
                      <li>Check if the camera's RTSP port is accessible (not blocked by firewall)</li>
                      <li>Try accessing the camera directly through its web interface</li>
                    </ol>
                    <p>
                      If the camera works in other applications but not in the monitoring system, try rebooting the camera and refreshing the page.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="troubleshooting-2" className="border border-border/60 rounded-md mb-2 shadow-sm">
                  <AccordionTrigger className="px-4">MQTT connection problems</AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <p className="mb-2">If you can't connect to the MQTT broker:</p>
                    <ol className="list-decimal pl-6 space-y-1 mb-2">
                      <li>Verify the broker is running and accessible</li>
                      <li>Check that the broker URL and port are correct</li>
                      <li>Ensure username and password are correct (if required)</li>
                      <li>Check if the MQTT port is accessible (not blocked by firewall)</li>
                      <li>Verify the MQTT protocol version is compatible</li>
                    </ol>
                    <p>
                      The system supports both WebSocket and TCP connections to MQTT brokers. If one method fails, try the other by changing the URL prefix from "mqtt://" to "ws://" or vice versa.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="troubleshooting-3" className="border border-border/60 rounded-md shadow-sm">
                  <AccordionTrigger className="px-4">Session recording issues</AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <p className="mb-2">If recording sessions is not working:</p>
                    <ol className="list-decimal pl-6 space-y-1 mb-2">
                      <li>Make sure you've selected at least one camera or sensor</li>
                      <li>Verify that selected cameras are online</li>
                      <li>Check that the MQTT connection is established (if recording sensors)</li>
                      <li>Ensure the system has sufficient storage space</li>
                      <li>Check for error messages in the "Errors" tab of the session detail view</li>
                    </ol>
                    <p>
                      Recording will continue even if you navigate away from the page or close the browser. To stop a recording, you must explicitly click the "Stop" button in the Sessions page.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tours" className="space-y-6">
          <Card className="border-border/60 shadow-md">
            <CardHeader>
              <CardTitle>Interactive Tours</CardTitle>
              <CardDescription>Guided tours of the system's features</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p>
                  Interactive tours provide step-by-step guidance through the main features of the system.
                  Select a tour below to get started:
                </p>

                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 mt-4">
                  <Card className="border border-border/70 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <PlayCircle className="h-5 w-5 text-primary" />
                        Getting Started Tour
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">Learn the basics of navigating the system and accessing key features.</p>
                      <Button variant="outline" className="mt-4 w-full">Start Tour</Button>
                    </CardContent>
                  </Card>

                  <Card className="border border-border/70 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Video className="h-5 w-5 text-primary" />
                        Camera Management Tour
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">Learn how to add, verify, and manage IP cameras in the system.</p>
                      <Button variant="outline" className="mt-4 w-full">Start Tour</Button>
                    </CardContent>
                  </Card>

                  <Card className="border border-border/70 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Session Management Tour
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">Learn how to create, search, and export recording sessions.</p>
                      <Button variant="outline" className="mt-4 w-full">Start Tour</Button>
                    </CardContent>
                  </Card>

                  <Card className="border border-border/70 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-primary" />
                        Sensor Integration Tour
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">Learn how to connect to MQTT and manage Zigbee sensors.</p>
                      <Button variant="outline" className="mt-4 w-full">Start Tour</Button>
                    </CardContent>
                  </Card>
                </div>

                <ToursManager />
                
                <div className="mt-8 flex items-center justify-center">
                  <Card className="w-full max-w-2xl border border-border/70 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        Need Additional Support?
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm mb-4">If you couldn't find the information you need, you have several options:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button variant="outline" className="w-full" asChild>
                          <a href="/docs">
                            <BookOpen className="mr-2 h-4 w-4" />
                            Technical Documentation
                          </a>
                        </Button>
                        <Button variant="outline" className="w-full">
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Contact Support Team
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}