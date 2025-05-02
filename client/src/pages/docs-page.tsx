import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileIcon, FolderIcon, Code, Database, GitBranch, FileJson, FileText, Coffee, BookOpen, Server, Cable, Workflow, ShieldCheck, Network } from "lucide-react";

export default function DocsPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Documentation</h1>
          <p className="text-muted-foreground">Technical documentation and reference for developers and administrators</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="hidden md:flex">
          <FileText className="mr-2 h-4 w-4" />
          Print / PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <Card className="md:col-span-1 md:row-span-2 h-fit">
          <CardHeader>
            <CardTitle>
              <BookOpen className="h-5 w-5 mb-2" />
              Contents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Getting Started</h3>
                  <ul className="space-y-1">
                    <li>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground">
                        Overview
                      </Button>
                    </li>
                    <li>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground">
                        Installation
                      </Button>
                    </li>
                    <li>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground">
                        Configuration
                      </Button>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Core Components</h3>
                  <ul className="space-y-1">
                    <li>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-start text-muted-foreground hover:text-foreground"
                        onClick={() => window.location.href = '/doc/system-architecture'}
                      >
                        System Architecture
                      </Button>
                    </li>
                    <li>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-start text-muted-foreground hover:text-foreground"
                        onClick={() => window.location.href = '/doc/system-architecture-2.0'}
                      >
                        Architecture 2.0 (PostgreSQL)
                      </Button>
                    </li>
                    <li>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-primary font-medium">
                        API Reference
                      </Button>
                    </li>
                    <li>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground">
                        WebSocket Events
                      </Button>
                    </li>
                    <li>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground">
                        Data Models
                      </Button>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Integration</h3>
                  <ul className="space-y-1">
                    <li>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground">
                        MQTT Integration
                      </Button>
                    </li>
                    <li>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground">
                        Camera Integration
                      </Button>
                    </li>
                    <li>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground">
                        Third-party Systems
                      </Button>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Advanced</h3>
                  <ul className="space-y-1">
                    <li>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground">
                        Security
                      </Button>
                    </li>
                    <li>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground">
                        Performance
                      </Button>
                    </li>
                    <li>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground">
                        Scaling
                      </Button>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Development</h3>
                  <ul className="space-y-1">
                    <li>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-primary font-medium">
                        Code Quality
                      </Button>
                    </li>
                    <li>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground">
                        Contributing
                      </Button>
                    </li>
                    <li>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground">
                        Deployment
                      </Button>
                    </li>
                  </ul>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 h-fit">
          <CardHeader>
            <CardTitle className="text-2xl">Technical Documentation</CardTitle>
            <CardDescription>
              Reference materials for developers and system administrators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="bg-transparent grid w-full grid-cols-5 gap-2">
                <TabsTrigger value="overview" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/50 border border-border/30 shadow-sm">Overview</TabsTrigger>
                <TabsTrigger value="auth" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/50 border border-border/30 shadow-sm">Authentication</TabsTrigger>
                <TabsTrigger value="endpoints" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/50 border border-border/30 shadow-sm">Endpoints</TabsTrigger>
                <TabsTrigger value="examples" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/50 border border-border/30 shadow-sm">Examples</TabsTrigger>
                <TabsTrigger value="code-quality" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/50 border border-border/30 shadow-sm">Code Quality</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">About the API</h3>
                  <p>
                    The monitoring system provides a RESTful API for programmatic access to all system functions. The API uses JSON for request and response payloads and standard HTTP methods and status codes.
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="auth" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Authentication</h3>
                  <p>
                    The API uses session-based authentication. You must authenticate through the login endpoint before accessing protected endpoints.
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="endpoints" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">API Endpoints</h3>
                  <p>
                    The system provides various endpoints for managing cameras, sensors, and recording sessions.
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="examples" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">API Examples</h3>
                  <p>
                    Sample code snippets and examples for common operations.
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="code-quality" className="space-y-4 pt-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">Compliance Audit Report</h3>
                    <p className="mt-2 text-muted-foreground">
                      This report summarizes the code quality assessment of our application against established best practices.
                      The assessment was conducted on April 8, 2025, reviewing key components against the organization's coding standards.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border border-green-500/30 bg-green-50/10">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">Strengths</CardTitle>
                          <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">Excellent</span>
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
                          <span className="bg-amber-600 text-white text-xs px-2 py-1 rounded-full">Needs Attention</span>
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

                  <h4 className="text-lg font-medium mt-6">Detailed Assessment by Category</h4>
                  
                  <div className="space-y-4">
                    <Card className="border border-border/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center">
                          <div className="mr-2 h-5 w-5 rounded-full bg-gradient-to-r from-green-500 to-green-400 flex items-center justify-center text-white text-xs">1</div>
                          Clean Code Principles
                        </CardTitle>
                        <CardDescription>Assessment of code clarity, readability, and maintainability</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center justify-between pb-2 border-b">
                          <span className="text-sm font-medium">Meaningful Names</span>
                          <span className="text-sm bg-green-100 text-green-800 rounded px-2 py-0.5">Excellent</span>
                        </div>
                        <p className="text-sm">
                          Variable, function, and component names are descriptive and accurately reflect their purpose. Class and component names like <code>SensorCard</code>, <code>SessionManager</code>, and <code>CameraStream</code> clearly communicate intent.
                        </p>
                        
                        <div className="flex items-center justify-between pb-2 border-b mt-4">
                          <span className="text-sm font-medium">Function Size and Focus</span>
                          <span className="text-sm bg-green-100 text-green-800 rounded px-2 py-0.5">Good</span>
                        </div>
                        <p className="text-sm">
                          Most functions are concise and focused on a single responsibility. The React hooks like <code>useOnboarding</code> and <code>useLocalStorage</code> are well-designed. Some event handler functions in the UI components could be further decomposed.
                        </p>
                        
                        <div className="flex items-center justify-between pb-2 border-b mt-4">
                          <span className="text-sm font-medium">Code Formatting</span>
                          <span className="text-sm bg-green-100 text-green-800 rounded px-2 py-0.5">Excellent</span>
                        </div>
                        <p className="text-sm">
                          Consistent formatting throughout the codebase. The project uses ESLint and Prettier effectively to maintain a uniform style.
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card className="border border-border/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center">
                          <div className="mr-2 h-5 w-5 rounded-full bg-gradient-to-r from-green-500 to-green-400 flex items-center justify-center text-white text-xs">2</div>
                          Don't Repeat Yourself (DRY)
                        </CardTitle>
                        <CardDescription>Evaluation of code reuse and abstraction</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center justify-between pb-2 border-b">
                          <span className="text-sm font-medium">Code Duplication</span>
                          <span className="text-sm bg-green-100 text-green-800 rounded px-2 py-0.5">Good</span>
                        </div>
                        <p className="text-sm">
                          Generally low levels of duplication. Effective use of shared components and hooks. Some duplication exists in the form handling and validation logic which could be further abstracted.
                        </p>
                        
                        <div className="flex items-center justify-between pb-2 border-b mt-4">
                          <span className="text-sm font-medium">Abstraction Quality</span>
                          <span className="text-sm bg-green-100 text-green-800 rounded px-2 py-0.5">Excellent</span>
                        </div>
                        <p className="text-sm">
                          Strong abstractions for core functionality. The <code>useLocalStorage</code> hook and the WebSocket connection management are particularly well-designed abstractions that promote reuse.
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card className="border border-border/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center">
                          <div className="mr-2 h-5 w-5 rounded-full bg-gradient-to-r from-green-500 to-green-400 flex items-center justify-center text-white text-xs">3</div>
                          Design Patterns Usage
                        </CardTitle>
                        <CardDescription>Analysis of architectural patterns implementation</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center justify-between pb-2 border-b">
                          <span className="text-sm font-medium">Observer Pattern</span>
                          <span className="text-sm bg-green-100 text-green-800 rounded px-2 py-0.5">Excellent</span>
                        </div>
                        <p className="text-sm">
                          Exemplary implementation for the sensor data management system. The MQTT module uses the Observer pattern to notify components of new sensor data, allowing for efficient propagation of updates.
                        </p>
                        
                        <div className="flex items-center justify-between pb-2 border-b mt-4">
                          <span className="text-sm font-medium">Factory Pattern</span>
                          <span className="text-sm bg-green-100 text-green-800 rounded px-2 py-0.5">Good</span>
                        </div>
                        <p className="text-sm">
                          Appropriate use for creating camera and sensor configurations. The <code>createCameraConfig</code> and <code>createSensorConfig</code> functions implement a simple factory pattern.
                        </p>
                        
                        <div className="flex items-center justify-between pb-2 border-b mt-4">
                          <span className="text-sm font-medium">Singleton Pattern</span>
                          <span className="text-sm bg-amber-100 text-amber-800 rounded px-2 py-0.5">Adequate</span>
                        </div>
                        <p className="text-sm">
                          Used for the logger and WebSocket connection, but implementation could be improved. The WebSocket connection management could benefit from a more robust singleton implementation with better error recovery.
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card className="border border-border/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center">
                          <div className="mr-2 h-5 w-5 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 flex items-center justify-center text-white text-xs">4</div>
                          Code Testing & Documentation
                        </CardTitle>
                        <CardDescription>Review of test coverage and documentation quality</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center justify-between pb-2 border-b">
                          <span className="text-sm font-medium">Test Coverage</span>
                          <span className="text-sm bg-amber-100 text-amber-800 rounded px-2 py-0.5">Needs Improvement</span>
                        </div>
                        <p className="text-sm">
                          Insufficient test coverage, especially for critical components. The core business logic should have more unit tests, and end-to-end tests are largely missing.
                        </p>
                        
                        <div className="flex items-center justify-between pb-2 border-b mt-4">
                          <span className="text-sm font-medium">Code Documentation</span>
                          <span className="text-sm bg-amber-100 text-amber-800 rounded px-2 py-0.5">Inconsistent</span>
                        </div>
                        <p className="text-sm">
                          Documentation is present but inconsistent. Some complex functions lack JSDoc comments entirely, while others have detailed documentation. The overall architecture documentation is good, but component-level documentation could be improved.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <h4 className="text-lg font-medium mt-6">Action Plan</h4>
                  
                  <Card className="border border-blue-500/30 bg-blue-50/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Recommended Improvements</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2 text-sm">
                          <div className="rounded-full bg-blue-500 text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">1</div>
                          <div>
                            <strong>Fix TypeScript Issues</strong>
                            <p className="text-muted-foreground mt-1">Address all type safety warnings in components, especially in the sessions page. Use proper typing for all parameters and avoid using 'any' types.</p>
                          </div>
                        </li>
                        <li className="flex items-start gap-2 text-sm">
                          <div className="rounded-full bg-blue-500 text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">2</div>
                          <div>
                            <strong>Improve Test Coverage</strong>
                            <p className="text-muted-foreground mt-1">Develop unit tests for critical components, focusing on error handling paths. Implement end-to-end tests for key user flows like session creation and export.</p>
                          </div>
                        </li>
                        <li className="flex items-start gap-2 text-sm">
                          <div className="rounded-full bg-blue-500 text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">3</div>
                          <div>
                            <strong>Standardize Documentation</strong>
                            <p className="text-muted-foreground mt-1">Implement a consistent JSDoc documentation standard across the codebase, especially for utility functions and hooks. Document complex logic and algorithms thoroughly.</p>
                          </div>
                        </li>
                        <li className="flex items-start gap-2 text-sm">
                          <div className="rounded-full bg-blue-500 text-white h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">4</div>
                          <div>
                            <strong>Refactor Form Logic</strong>
                            <p className="text-muted-foreground mt-1">Refactor duplicate form handling logic into a shared abstraction. Consider creating a custom form management hook that builds on react-hook-form and zod validation.</p>
                          </div>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 h-fit">
          <CardHeader>
            <CardTitle className="text-xl">Technical Documentation</CardTitle>
            <CardDescription>
              Detailed technical specifications, protocols, and configuration options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border border-border/50">
                <CardHeader className="p-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Server className="h-4 w-4 text-primary" />
                    Server Architecture
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-sm text-muted-foreground">
                    Node.js and Express backend with TypeScript, WebSockets for real-time communication, and modular component design.
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-border/50">
                <CardHeader className="p-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Network className="h-4 w-4 text-primary" />
                    Network Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-sm text-muted-foreground">
                    HTTP/HTTPS for web interface, RTSP for camera streams, MQTT for sensor data, and WebSockets for real-time updates.
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-border/50">
                <CardHeader className="p-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Database className="h-4 w-4 text-primary" />
                    Data Storage
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-sm text-muted-foreground">
                    File-based storage for recordings, JSON format for metadata, and PostgreSQL for user and session management.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg space-y-4">
              <h3 className="font-medium text-lg flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                Developer Resources
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-base">Schema Documentation</h4>
                  <p className="text-sm text-muted-foreground">
                    Explore the data models and schema definitions used throughout the system.
                  </p>
                  <Button variant="outline" size="sm" className="mt-2">
                    <FileJson className="mr-2 h-4 w-4" />
                    View Schemas
                  </Button>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-base">API Playground</h4>
                  <p className="text-sm text-muted-foreground">
                    Interactive environment to test API endpoints and see results in real-time.
                  </p>
                  <Button variant="outline" size="sm" className="mt-2">
                    <Coffee className="mr-2 h-4 w-4" />
                    Open Playground
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helper components
function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "secondary" | "destructive" | "outline" }) {
  const baseClasses = "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset";
  const variantClasses = {
    default: "bg-primary/10 text-primary ring-primary/20",
    secondary: "bg-secondary/10 text-secondary ring-secondary/20",
    destructive: "bg-destructive/10 text-destructive ring-destructive/20",
    outline: "bg-background text-foreground ring-border",
  };

  return <span className={`${baseClasses} ${variantClasses[variant]}`}>{children}</span>;
}