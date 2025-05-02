import { useState, useEffect } from 'react';
import { useOnboarding } from '@/hooks/use-onboarding';
import { deviceManagementTourSteps, docsTourSteps, helpTourSteps, liveMonitoringTourSteps, mainTourSteps, sessionsTourSteps } from './tour-steps';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, PlayCircle, HelpCircle, Monitor, Camera, LayoutList, FileCode } from 'lucide-react';
import { useLocation } from 'wouter';

export function ToursManager() {
  const { start, addSteps, resetSteps, isActive, resetOnboardingStatus } = useOnboarding();
  const [location] = useLocation();
  const [currentPage, setCurrentPage] = useState<string>('');

  // Determine current page on mount and location change
  useEffect(() => {
    // Extract the main path segment
    const pathSegment = location.split('/')[1] || 'home';
    setCurrentPage(pathSegment);
  }, [location]);

  // Helper to determine if a tour is relevant for the current page
  const isTourRelevant = (tourPage: string): boolean => {
    // Main tour is always relevant
    if (tourPage === 'main') return true;
    
    // Match specific tours to their pages
    switch (tourPage) {
      case 'device-management':
        return currentPage === 'device-management';
      case 'sessions':
        return currentPage === 'sessions';
      case 'live-monitoring':
        return currentPage === 'live-monitoring' || currentPage === 'home';
      case 'help':
        return currentPage === 'help';
      case 'docs':
        return currentPage === 'docs';
      default:
        return true;
    }
  };

  // Start a specific tour
  const startTour = (tourId: string) => {
    // Reset any existing steps
    resetSteps();
    
    // Add the appropriate steps based on tour ID
    switch (tourId) {
      case 'main-tour':
        addSteps(mainTourSteps);
        break;
      case 'device-management-tour':
        addSteps(deviceManagementTourSteps);
        break;
      case 'sessions-tour':
        addSteps(sessionsTourSteps);
        break;
      case 'live-monitoring-tour':
        addSteps(liveMonitoringTourSteps);
        break;
      case 'help-tour':
        addSteps(helpTourSteps);
        break;
      case 'docs-tour':
        addSteps(docsTourSteps);
        break;
      default:
        addSteps(mainTourSteps);
    }
    
    // Start the tour
    start(tourId);
  };

  // Reset first-time user flag (for testing)
  const resetOnboarding = () => {
    resetOnboardingStatus();
    // Refresh the page to show the welcome prompt
    window.location.reload();
  };

  return (
    <div className="space-y-6" data-tour="tours-section">
      <h2 className="text-2xl font-bold">Interactive Tours</h2>
      <p className="text-muted-foreground">
        Learn how to use the system with these guided tours. Click on any tour to begin.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Main Overview Tour */}
        <Card className={isTourRelevant('main') ? 'border-primary/50' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Info className="h-5 w-5 mr-2" />
              Main Overview
            </CardTitle>
            <CardDescription>
              Get an overview of the main system features and navigation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              This tour covers the basic navigation and main features of the system.
              Ideal for first-time users.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => startTour('main-tour')}
              disabled={isActive}
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              Start Overview Tour
            </Button>
          </CardFooter>
        </Card>

        {/* Device Management Tour */}
        <Card className={isTourRelevant('device-management') ? 'border-primary/50' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Camera className="h-5 w-5 mr-2" />
              Device Management
            </CardTitle>
            <CardDescription>
              Learn how to add and manage cameras and sensors.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              This tour shows how to add, edit, delete, and verify cameras and sensors.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => startTour('device-management-tour')}
              disabled={isActive || !isTourRelevant('device-management')}
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              {isTourRelevant('device-management') 
                ? 'Start Device Tour' 
                : 'Go to Device Management'}
            </Button>
          </CardFooter>
        </Card>

        {/* Sessions Tour */}
        <Card className={isTourRelevant('sessions') ? 'border-primary/50' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <LayoutList className="h-5 w-5 mr-2" />
              Sessions
            </CardTitle>
            <CardDescription>
              Learn how to create and manage recording sessions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              This tour covers session creation, management, and data downloading.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => startTour('sessions-tour')}
              disabled={isActive || !isTourRelevant('sessions')}
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              {isTourRelevant('sessions') 
                ? 'Start Sessions Tour' 
                : 'Go to Sessions'}
            </Button>
          </CardFooter>
        </Card>

        {/* Live Monitoring Tour */}
        <Card className={isTourRelevant('live-monitoring') ? 'border-primary/50' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Monitor className="h-5 w-5 mr-2" />
              Live Monitoring
            </CardTitle>
            <CardDescription>
              Learn how to view real-time camera and sensor data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              This tour shows how to access and use the live monitoring features.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => startTour('live-monitoring-tour')}
              disabled={isActive || !isTourRelevant('live-monitoring')}
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              {isTourRelevant('live-monitoring') 
                ? 'Start Monitoring Tour' 
                : 'Go to Live Monitoring'}
            </Button>
          </CardFooter>
        </Card>

        {/* Help Tour */}
        <Card className={isTourRelevant('help') ? 'border-primary/50' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <HelpCircle className="h-5 w-5 mr-2" />
              Help & Support
            </CardTitle>
            <CardDescription>
              Learn how to use the help and support features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              This tour covers FAQs, user guides, and how to get support.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => startTour('help-tour')}
              disabled={isActive || !isTourRelevant('help')}
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              {isTourRelevant('help') 
                ? 'Start Help Tour' 
                : 'Go to Help'}
            </Button>
          </CardFooter>
        </Card>

        {/* Technical Documentation Tour */}
        <Card className={isTourRelevant('docs') ? 'border-primary/50' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileCode className="h-5 w-5 mr-2" />
              Documentation
            </CardTitle>
            <CardDescription>
              Learn how to use the technical documentation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              This tour is designed for technical users and developers.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => startTour('docs-tour')}
              disabled={isActive || !isTourRelevant('docs')}
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              {isTourRelevant('docs') 
                ? 'Start Docs Tour' 
                : 'Go to Documentation'}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="mt-8 p-4 bg-muted rounded-lg">
        <div className="flex flex-col sm:flex-row justify-between items-center">
          <div>
            <h3 className="text-lg font-medium">Reset Onboarding Status</h3>
            <p className="text-sm text-muted-foreground">
              Reset your onboarding status to see the welcome tour prompt again.
            </p>
          </div>
          <Button 
            variant="secondary"
            onClick={resetOnboarding}
            className="mt-2 sm:mt-0"
          >
            Reset Onboarding
          </Button>
        </div>
      </div>
    </div>
  );
}