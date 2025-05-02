import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Info, AlertTriangle, Code, BookOpen, GitBranch, FileCode, CodeXml } from "lucide-react";

export default function CodeQualityPage() {
  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <h1 className="text-3xl font-bold mb-2">Code Quality Standards</h1>
      <p className="text-muted-foreground mb-8">Guidelines, patterns, and best practices for development</p>
      
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 border border-border/60 shadow-sm">
          <TabsTrigger 
            value="overview" 
            className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Info className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="patterns" 
            className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Code className="h-4 w-4" />
            Design Patterns
          </TabsTrigger>
          <TabsTrigger 
            value="architecture" 
            className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <FileCode className="h-4 w-4" />
            Architecture
          </TabsTrigger>
          <TabsTrigger 
            value="standards" 
            className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <BookOpen className="h-4 w-4" />
            Standards
          </TabsTrigger>
          <TabsTrigger 
            value="contributions" 
            className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <GitBranch className="h-4 w-4" />
            Contributions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card className="border-border/60 shadow-md">
            <CardHeader>
              <CardTitle>Compliance Audit Report</CardTitle>
              <CardDescription>
                Assessment of code quality against established best practices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                This report summarizes the code quality assessment of our application against established best practices.
                The assessment was conducted on April 8, 2025, reviewing key components against the organization's coding standards.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border border-green-500/30 bg-green-50/10">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Strengths</CardTitle>
                      <Badge className="bg-green-600 hover:bg-green-700">Excellent</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <ul className="space-y-1">
                      <li className="flex items-start gap-2 text-sm">
                        <div className="rounded-full bg-green-500 text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">✓</div>
                        <span><strong>Observer Pattern (MQTT Module)</strong>: Excellent implementation of the Observer pattern for MQTT sensor data handling, creating a scalable pub/sub system.</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <div className="rounded-full bg-green-500 text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">✓</div>
                        <span><strong>Clean Code (Component Structure)</strong>: Well-structured components with clear naming conventions and focused responsibilities.</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <div className="rounded-full bg-green-500 text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">✓</div>
                        <span><strong>DRY Principle (Hooks)</strong>: Custom hooks effectively abstract common functionality, eliminating duplication.</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <div className="rounded-full bg-green-500 text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">✓</div>
                        <span><strong>Scalability (Data Storage)</strong>: Scalable design for handling thousands of sensors with optimized resource utilization.</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card className="border border-amber-500/30 bg-amber-50/10">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Areas for Improvement</CardTitle>
                      <Badge variant="outline" className="bg-amber-600 hover:bg-amber-700 text-white">Needs Attention</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <ul className="space-y-1">
                      <li className="flex items-start gap-2 text-sm">
                        <div className="rounded-full bg-amber-500 text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">!</div>
                        <span><strong>Type Safety</strong>: Several components have TypeScript errors related to unknown types and partial object access.</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <div className="rounded-full bg-amber-500 text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">!</div>
                        <span><strong>Documentation</strong>: JSDoc comments are inconsistent across the codebase, especially for complex utility functions.</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <div className="rounded-full bg-amber-500 text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">!</div>
                        <span><strong>Testing</strong>: Insufficient automated tests for critical components, especially error handling paths.</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Card className="border border-border/70 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <div className="mr-2 h-5 w-5 rounded-full bg-gradient-to-r from-green-500 to-green-400 flex items-center justify-center text-white text-xs">1</div>
                    Clean Code Principles
                  </CardTitle>
                  <CardDescription>Assessment of code clarity, readability, and maintainability</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b">
                    <span className="text-sm font-medium">Meaningful Names</span>
                    <Badge variant="outline" className="bg-green-100 text-green-800">Excellent</Badge>
                  </div>
                  <p className="text-sm">
                    Variable, function, and component names are descriptive and accurately reflect their purpose. Class and component names like <code className="bg-muted px-1 py-0.5 rounded text-sm">SensorCard</code>, <code className="bg-muted px-1 py-0.5 rounded text-sm">SessionManager</code>, and <code className="bg-muted px-1 py-0.5 rounded text-sm">CameraStream</code> clearly communicate intent.
                  </p>
                  
                  <div className="flex items-center justify-between pb-2 border-b mt-4">
                    <span className="text-sm font-medium">Function Size and Focus</span>
                    <Badge variant="outline" className="bg-green-100 text-green-800">Good</Badge>
                  </div>
                  <p className="text-sm">
                    Most functions are concise and focused on a single responsibility. The React hooks like <code className="bg-muted px-1 py-0.5 rounded text-sm">useOnboarding</code> and <code className="bg-muted px-1 py-0.5 rounded text-sm">useLocalStorage</code> are well-designed. Some event handler functions in the UI components could be further decomposed.
                  </p>
                  
                  <div className="flex items-center justify-between pb-2 border-b mt-4">
                    <span className="text-sm font-medium">Code Formatting</span>
                    <Badge variant="outline" className="bg-green-100 text-green-800">Excellent</Badge>
                  </div>
                  <p className="text-sm">
                    Consistent formatting throughout the codebase. The project uses ESLint and Prettier effectively to maintain a uniform style.
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-border/70 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <div className="mr-2 h-5 w-5 rounded-full bg-gradient-to-r from-green-500 to-green-400 flex items-center justify-center text-white text-xs">2</div>
                    Don't Repeat Yourself (DRY)
                  </CardTitle>
                  <CardDescription>Evaluation of code reuse and abstraction</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b">
                    <span className="text-sm font-medium">Code Duplication</span>
                    <Badge variant="outline" className="bg-green-100 text-green-800">Good</Badge>
                  </div>
                  <p className="text-sm">
                    Generally low levels of duplication. Effective use of shared components and hooks. Some duplication exists in validation logic across forms that could be further abstracted.
                  </p>
                  
                  <div className="flex items-center justify-between pb-2 border-b mt-4">
                    <span className="text-sm font-medium">Component Composition</span>
                    <Badge variant="outline" className="bg-green-100 text-green-800">Excellent</Badge>
                  </div>
                  <p className="text-sm">
                    Components are well-designed for reusability through composition. UI elements like cards, buttons, and form controls are used consistently throughout the application.
                  </p>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          <Card className="border-border/60 shadow-md">
            <CardHeader>
              <CardTitle>Design Patterns</CardTitle>
              <CardDescription>
                Key patterns implemented in the codebase
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="mb-4">
                The LISA system implements several design patterns to ensure scalability, modularity, and maintainability.
                Below are the key patterns used throughout the codebase:
              </p>
              
              <div className="space-y-4">
                <Card className="border border-border/70 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center">
                      <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                      Observer Pattern
                    </CardTitle>
                    <CardDescription>Used for handling sensor data streams</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-2">
                      The Observer pattern is implemented to manage the subscription and notification system for sensor data. 
                      This pattern allows the system to efficiently handle data from thousands of sensors without overwhelming the main processing thread.
                    </p>
                    <div className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto">
                      <p className="mb-1">// Simplified example of Observer pattern implementation</p>
                      <p className="mb-1">class SensorManager &#123;</p>
                      <p className="mb-1">  private observers: Map&lt;string, Observer[]&gt; = new Map();</p>
                      <p className="mb-1">  </p>
                      <p className="mb-1">  subscribe(sensorId: string, observer: Observer) &#123;</p>
                      <p className="mb-1">    if (!this.observers.has(sensorId)) &#123;</p>
                      <p className="mb-1">      this.observers.set(sensorId, []);</p>
                      <p className="mb-1">    &#125;</p>
                      <p className="mb-1">    this.observers.get(sensorId)?.push(observer);</p>
                      <p className="mb-1">  &#125;</p>
                      <p className="mb-1">  </p>
                      <p className="mb-1">  notify(sensorId: string, data: SensorData) &#123;</p>
                      <p className="mb-1">    this.observers.get(sensorId)?.forEach(observer =&gt; observer.update(data));</p>
                      <p className="mb-1">  &#125;</p>
                      <p className="mb-1">&#125;</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-border/70 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center">
                      <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                      Repository Pattern
                    </CardTitle>
                    <CardDescription>Used for data access abstraction</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-2">
                      The Repository pattern abstracts the data access layer, providing a consistent interface for working with
                      different storage mechanisms (memory storage, file system, potentially databases in the future).
                    </p>
                    <div className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto">
                      <p className="mb-1">// Storage interface abstracting data operations</p>
                      <p className="mb-1">interface IStorage &#123;</p>
                      <p className="mb-1">  getUser(id: number): Promise&lt;User | undefined&gt;;</p>
                      <p className="mb-1">  createUser(user: InsertUser): Promise&lt;User&gt;;</p>
                      <p className="mb-1">  // Other CRUD operations</p>
                      <p className="mb-1">&#125;</p>
                      <p className="mb-1"></p>
                      <p className="mb-1">// Implementations can be swapped without changing client code</p>
                      <p className="mb-1">class MemStorage implements IStorage &#123; /* ... */ &#125;</p>
                      <p className="mb-1">class FileStorage implements IStorage &#123; /* ... */ &#125;</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-border/70 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center">
                      <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                      Publish-Subscribe Pattern
                    </CardTitle>
                    <CardDescription>Used for loosely coupled communication</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-2">
                      The Publish-Subscribe pattern allows components to communicate without direct references to each other.
                      This is especially important for the MQTT integration, where data can come from many sources.
                    </p>
                    <div className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto">
                      <p className="mb-1">// MQTT client subscribing to topics</p>
                      <p className="mb-1">mqttClient.on('connect', function() &#123;</p>
                      <p className="mb-1">  mqttClient.subscribe('sensors/#');</p>
                      <p className="mb-1">  mqttClient.subscribe('zigbee2mqtt/#');</p>
                      <p className="mb-1">&#125;);</p>
                      <p className="mb-1"></p>
                      <p className="mb-1">// Message handler publishing to internal event system</p>
                      <p className="mb-1">mqttClient.on('message', function(topic, message) &#123;</p>
                      <p className="mb-1">  eventBus.publish('sensor-data', &#123; topic, data: JSON.parse(message.toString()) &#125;);</p>
                      <p className="mb-1">&#125;);</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-border/70 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center">
                      <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                      Composition Pattern
                    </CardTitle>
                    <CardDescription>Used for UI component structure</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-2">
                      The Composition pattern is used extensively in the UI to create complex components from simpler ones.
                      This promotes reusability and makes the code more maintainable.
                    </p>
                    <div className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto">
                      <p className="mb-1">// Example of component composition</p>
                      <p className="mb-1">function SensorCard(&#123; sensor, onStatusChange &#125;) &#123;</p>
                      <p className="mb-1">  return (</p>
                      <p className="mb-1">    &lt;Card&gt;</p>
                      <p className="mb-1">      &lt;CardHeader&gt;</p>
                      <p className="mb-1">        &lt;CardTitle&gt;&#123;sensor.name&#125;&lt;/CardTitle&gt;</p>
                      <p className="mb-1">        &lt;CardDescription&gt;&#123;sensor.type&#125;&lt;/CardDescription&gt;</p>
                      <p className="mb-1">      &lt;/CardHeader&gt;</p>
                      <p className="mb-1">      &lt;CardContent&gt;</p>
                      <p className="mb-1">        &lt;StatusIndicator status=&#123;sensor.status&#125; /&gt;</p>
                      <p className="mb-1">        &lt;SensorValue value=&#123;sensor.value&#125; unit=&#123;sensor.unit&#125; /&gt;</p>
                      <p className="mb-1">      &lt;/CardContent&gt;</p>
                      <p className="mb-1">    &lt;/Card&gt;</p>
                      <p className="mb-1">  );</p>
                      <p className="mb-1">&#125;</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="architecture" className="space-y-6">
          <Card className="border-border/60 shadow-md">
            <CardHeader>
              <CardTitle>Code Architecture</CardTitle>
              <CardDescription>
                Structure and organization of the codebase
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center mb-6">
                <div className="bg-muted p-4 rounded-lg text-center">
                  <p className="mb-2 font-medium">Full System Architecture</p>
                  <a href="/doc/system-architecture" className="text-primary hover:underline flex items-center justify-center gap-2">
                    <CodeXml className="h-4 w-4" />
                    View Interactive Diagram
                  </a>
                </div>
              </div>
              
              <h3 className="text-lg font-medium mb-4">Directory Structure</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border border-border/70 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Frontend Structure</CardTitle>
                    <CardDescription>Client-side organization</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted rounded-md p-3 text-xs font-mono whitespace-pre">
                      client/
                      ├── public/         # Static assets
                      └── src/
                          ├── components/ # Reusable UI components
                          │   ├── ui/     # Base UI components
                          │   └── ...     # Feature-specific components
                          ├── hooks/      # Custom React hooks
                          ├── lib/        # Utility functions and services
                          ├── pages/      # Page components
                          │   ├── doc/    # Documentation pages
                          │   ├── help/   # Help center pages
                          │   └── ...     # Main application pages
                          └── styles/     # Global styles
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-border/70 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Backend Structure</CardTitle>
                    <CardDescription>Server-side organization</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted rounded-md p-3 text-xs font-mono whitespace-pre">
                      server/
                      ├── auth/          # Authentication logic
                      ├── controllers/   # API request handlers
                      ├── middleware/    # Express middleware
                      ├── services/      # Business logic
                      ├── utils/         # Utility functions
                      ├── storage.ts     # Data storage interface
                      ├── routes.ts      # API route definitions
                      └── index.ts       # Application entry point
                      
                      shared/
                      └── schema.ts      # Shared data models
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Card className="border border-border/70 shadow-sm mt-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Application Flow</CardTitle>
                  <CardDescription>Overview of key data and control flows</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-1">Authentication Flow</h4>
                      <p className="text-sm mb-2">
                        The authentication system uses session-based auth with Passport.js for secure login and session persistence.
                      </p>
                      <ol className="text-sm list-decimal pl-5 space-y-1">
                        <li>User submits credentials to <code className="bg-muted px-1 py-0.5 rounded text-xs">/api/login</code></li>
                        <li>Server validates credentials against stored password</li>
                        <li>Session is created with user information</li>
                        <li>Frontend uses the session for subsequent requests</li>
                      </ol>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-1">Data Recording Flow</h4>
                      <p className="text-sm mb-2">
                        Session recording involves several components working together to capture and store data.
                      </p>
                      <ol className="text-sm list-decimal pl-5 space-y-1">
                        <li>User creates a session with selected cameras and sensors</li>
                        <li>Recording manager initializes recording processes</li>
                        <li>FFMPEG processes capture video streams</li>
                        <li>MQTT client captures sensor data</li>
                        <li>Data is stored in the file system with timestamp synchronization</li>
                      </ol>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-1">Real-time Updates Flow</h4>
                      <p className="text-sm mb-2">
                        WebSockets enable real-time communication between server and clients.
                      </p>
                      <ol className="text-sm list-decimal pl-5 space-y-1">
                        <li>Client establishes WebSocket connection</li>
                        <li>Server sends status updates and sensor data</li>
                        <li>Client updates UI in response to WebSocket messages</li>
                        <li>Connection is maintained with automatic reconnection</li>
                      </ol>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="standards" className="space-y-6">
          <Card className="border-border/60 shadow-md">
            <CardHeader>
              <CardTitle>Coding Standards</CardTitle>
              <CardDescription>
                Guidelines for maintaining quality code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="mb-4">
                The following coding standards help maintain consistency and quality across the codebase:
              </p>
              
              <div className="space-y-4">
                <Card className="border border-border/70 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center">
                      <Info className="mr-2 h-5 w-5 text-blue-500" />
                      Naming Conventions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <div className="rounded-full bg-blue-500 text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                        <div>
                          <strong>Components:</strong> PascalCase, descriptive of functionality (e.g., <code className="bg-muted px-1 py-0.5 rounded text-xs">CameraCard</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">SensorGrid</code>)
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="rounded-full bg-blue-500 text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                        <div>
                          <strong>Functions:</strong> camelCase, verb descriptive of action (e.g., <code className="bg-muted px-1 py-0.5 rounded text-xs">fetchSensorData</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">startRecording</code>)
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="rounded-full bg-blue-500 text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                        <div>
                          <strong>Variables:</strong> camelCase, descriptive of content or purpose (e.g., <code className="bg-muted px-1 py-0.5 rounded text-xs">sensorCount</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">isRecording</code>)
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="rounded-full bg-blue-500 text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                        <div>
                          <strong>Types/Interfaces:</strong> PascalCase, descriptive of structure (e.g., <code className="bg-muted px-1 py-0.5 rounded text-xs">SensorData</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">CameraSettings</code>)
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="rounded-full bg-blue-500 text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                        <div>
                          <strong>Files:</strong> Match component/function name, kebab-case for utilities (e.g., <code className="bg-muted px-1 py-0.5 rounded text-xs">SensorCard.tsx</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">use-global-recording-time.ts</code>)
                        </div>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card className="border border-border/70 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center">
                      <Info className="mr-2 h-5 w-5 text-blue-500" />
                      Code Organization
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <div className="rounded-full bg-blue-500 text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                        <div>
                          <strong>Imports:</strong> Group imports by source (React, third-party, internal)
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="rounded-full bg-blue-500 text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                        <div>
                          <strong>Component Structure:</strong> Props, hooks, helper functions, JSX return
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="rounded-full bg-blue-500 text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                        <div>
                          <strong>Function Length:</strong> Keep functions under 25 lines when possible
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="rounded-full bg-blue-500 text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                        <div>
                          <strong>File Length:</strong> Keep files under 400 lines, split when larger
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="rounded-full bg-blue-500 text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                        <div>
                          <strong>Comments:</strong> Explain why, not what; use JSDoc for complex functions
                        </div>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card className="border border-border/70 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center">
                      <AlertTriangle className="mr-2 h-5 w-5 text-amber-500" />
                      Common Pitfalls
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <div className="rounded-full bg-amber-500 text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">!</div>
                        <div>
                          <strong>Type Safety:</strong> Avoid using <code className="bg-muted px-1 py-0.5 rounded text-xs">any</code> type, use proper TypeScript interfaces
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="rounded-full bg-amber-500 text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">!</div>
                        <div>
                          <strong>Side Effects:</strong> Properly manage useEffect dependencies to prevent infinite loops
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="rounded-full bg-amber-500 text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">!</div>
                        <div>
                          <strong>Memory Leaks:</strong> Ensure event listeners are cleaned up in useEffect
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="rounded-full bg-amber-500 text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">!</div>
                        <div>
                          <strong>Error Handling:</strong> Always handle promise rejections and errors
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="rounded-full bg-amber-500 text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">!</div>
                        <div>
                          <strong>Performance:</strong> Use memoization (useMemo, useCallback) for expensive operations
                        </div>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contributions" className="space-y-6">
          <Card className="border-border/60 shadow-md">
            <CardHeader>
              <CardTitle>Contributing Guidelines</CardTitle>
              <CardDescription>
                How to contribute code to the project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="mb-4">
                Follow these guidelines when contributing to the LISA codebase:
              </p>
              
              <div className="space-y-4">
                <Card className="border border-border/70 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Development Workflow</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-3 text-sm">
                      <li className="flex items-start gap-2">
                        <div className="rounded-full bg-primary text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">1</div>
                        <div>
                          <strong>Create a feature branch</strong> from the main branch with a descriptive name
                          <div className="bg-muted rounded-md p-2 mt-1 text-xs font-mono">
                            git checkout -b feature/add-sensor-filtering
                          </div>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="rounded-full bg-primary text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">2</div>
                        <div>
                          <strong>Make changes</strong> following the coding standards
                          <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li>Ensure code passes ESLint and TypeScript checks</li>
                            <li>Add appropriate documentation</li>
                            <li>Write tests if applicable</li>
                          </ul>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="rounded-full bg-primary text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">3</div>
                        <div>
                          <strong>Commit changes</strong> with descriptive messages
                          <div className="bg-muted rounded-md p-2 mt-1 text-xs font-mono">
                            git commit -m "feat: add sensor filtering functionality"
                          </div>
                          <p className="mt-1">Follow conventional commit format:</p>
                          <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li><code className="bg-muted px-1 py-0.5 rounded text-xs">feat:</code> - New feature</li>
                            <li><code className="bg-muted px-1 py-0.5 rounded text-xs">fix:</code> - Bug fix</li>
                            <li><code className="bg-muted px-1 py-0.5 rounded text-xs">docs:</code> - Documentation changes</li>
                            <li><code className="bg-muted px-1 py-0.5 rounded text-xs">style:</code> - Formatting, styling</li>
                            <li><code className="bg-muted px-1 py-0.5 rounded text-xs">refactor:</code> - Code restructuring</li>
                            <li><code className="bg-muted px-1 py-0.5 rounded text-xs">test:</code> - Adding tests</li>
                            <li><code className="bg-muted px-1 py-0.5 rounded text-xs">chore:</code> - Maintenance tasks</li>
                          </ul>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="rounded-full bg-primary text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">4</div>
                        <div>
                          <strong>Create a pull request</strong> with a detailed description
                          <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li>Explain the purpose of the changes</li>
                            <li>Reference any related issues</li>
                            <li>Include screenshots for UI changes</li>
                            <li>List any testing steps</li>
                          </ul>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="rounded-full bg-primary text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">5</div>
                        <div>
                          <strong>Respond to review feedback</strong> and make necessary changes
                        </div>
                      </li>
                    </ol>
                  </CardContent>
                </Card>
                
                <Card className="border border-border/70 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Pull Request Checklist</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <input type="checkbox" id="code-passes" className="h-4 w-4 mr-2" />
                        <label htmlFor="code-passes">Code passes all linting and type checks</label>
                      </div>
                      <div className="flex items-center">
                        <input type="checkbox" id="tests-added" className="h-4 w-4 mr-2" />
                        <label htmlFor="tests-added">Tests added or updated for new functionality</label>
                      </div>
                      <div className="flex items-center">
                        <input type="checkbox" id="docs-updated" className="h-4 w-4 mr-2" />
                        <label htmlFor="docs-updated">Documentation updated as needed</label>
                      </div>
                      <div className="flex items-center">
                        <input type="checkbox" id="no-conflicts" className="h-4 w-4 mr-2" />
                        <label htmlFor="no-conflicts">No merge conflicts with the main branch</label>
                      </div>
                      <div className="flex items-center">
                        <input type="checkbox" id="manually-tested" className="h-4 w-4 mr-2" />
                        <label htmlFor="manually-tested">Changes manually tested in development environment</label>
                      </div>
                      <div className="flex items-center">
                        <input type="checkbox" id="clean-code" className="h-4 w-4 mr-2" />
                        <label htmlFor="clean-code">Code follows project's clean code principles</label>
                      </div>
                      <div className="flex items-center">
                        <input type="checkbox" id="performance" className="h-4 w-4 mr-2" />
                        <label htmlFor="performance">No obvious performance issues introduced</label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border border-border/70 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Code Review Standards</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-3">
                      When reviewing code, focus on these areas:
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <div className="rounded-full bg-blue-500 text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                        <div>
                          <strong>Functionality:</strong> Does the code work as expected?
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="rounded-full bg-blue-500 text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                        <div>
                          <strong>Code Quality:</strong> Is the code clean, readable, and maintainable?
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="rounded-full bg-blue-500 text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                        <div>
                          <strong>Security:</strong> Are there any security vulnerabilities?
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="rounded-full bg-blue-500 text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                        <div>
                          <strong>Performance:</strong> Are there any potential performance issues?
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="rounded-full bg-blue-500 text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                        <div>
                          <strong>Testing:</strong> Is the code properly tested?
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="rounded-full bg-blue-500 text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                        <div>
                          <strong>Documentation:</strong> Is the code properly documented?
                        </div>
                      </li>
                    </ul>
                    <p className="text-sm mt-3">
                      Always provide constructive feedback and suggest solutions, not just point out problems.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}