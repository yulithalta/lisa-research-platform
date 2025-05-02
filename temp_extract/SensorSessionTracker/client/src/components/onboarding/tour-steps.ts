import { Step } from 'react-joyride';

// Main application tour - shown on first visit
export const mainTourSteps: Step[] = [
  {
    target: 'body',
    content: 'Welcome to the Lab Monitoring System! This tour will help you understand how to use the main features.',
    placement: 'center',
    disableBeacon: true,
    title: 'Welcome',
  },
  {
    target: '.sidebar',
    content: 'This is the main navigation. You can access all the important areas of the application from here.',
    placement: 'right',
    title: 'Navigation',
  },
  {
    target: '[data-tour="live-monitoring"]',
    content: 'Access real-time video feeds and sensor data from this section. You can see what\'s happening in the lab right now.',
    placement: 'right',
    title: 'Live Monitoring',
  },
  {
    target: '[data-tour="device-management"]',
    content: 'Add, edit, and configure your IP cameras and sensors here. You can verify camera connections and manage sensor properties.',
    placement: 'right',
    title: 'Device Management',
  },
  {
    target: '[data-tour="sessions"]',
    content: 'Start new recording sessions, view session history, and download recorded data from this section.',
    placement: 'right',
    title: 'Sessions',
  },
  {
    target: '[data-tour="help"]',
    content: 'Need help? Access documentation, FAQ, and restart this tour anytime from the help section.',
    placement: 'right',
    title: 'Help & Documentation',
  },
  {
    target: 'body',
    content: 'That covers the basics! Let\'s get started. You can always access the tour again from the Help section.',
    placement: 'center',
    title: 'Ready to Go',
  },
];

// Device Management tour
export const deviceManagementTourSteps: Step[] = [
  {
    target: 'body',
    content: 'Welcome to Device Management! Here you can add and configure all your laboratory devices.',
    placement: 'center',
    disableBeacon: true,
    title: 'Device Management',
  },
  {
    target: '[data-tour="device-tabs"]',
    content: 'Switch between Cameras and Sensors using these tabs.',
    placement: 'bottom',
    title: 'Device Tabs',
  },
  {
    target: '[data-tour="add-camera-button"]',
    content: 'Click here to add a new IP camera to the system.',
    placement: 'left',
    title: 'Add Camera',
  },
  {
    target: '[data-tour="camera-card"]',
    content: 'Each camera is displayed as a card showing status, name and IP address. You can verify, edit, or delete cameras using the menu button.',
    placement: 'bottom',
    title: 'Camera Card',
  },
  {
    target: '[data-tour="add-sensor-button"]',
    content: 'Click here to add a new sensor to the system.',
    placement: 'left',
    title: 'Add Sensor',
  },
  {
    target: '[data-tour="sensor-card"]',
    content: 'Each sensor is displayed with its status, type and topic. You can edit or delete sensors using the menu button.',
    placement: 'bottom',
    title: 'Sensor Card',
  },
];

// Sessions tour
export const sessionsTourSteps: Step[] = [
  {
    target: 'body',
    content: 'This is the Sessions page where you can manage recording sessions and view session history.',
    placement: 'center',
    disableBeacon: true,
    title: 'Sessions Management',
  },
  {
    target: '[data-tour="start-session-button"]',
    content: 'Click here to start a new recording session. You\'ll be able to select which cameras and sensors to include.',
    placement: 'bottom',
    title: 'Start New Session',
  },
  {
    target: '[data-tour="session-filters"]',
    content: 'Filter sessions by date range, title, or participants to quickly find what you need.',
    placement: 'bottom',
    title: 'Session Filters',
  },
  {
    target: '[data-tour="active-sessions"]',
    content: 'Currently active sessions appear here. You can monitor their status and stop them when finished.',
    placement: 'top',
    title: 'Active Sessions',
  },
  {
    target: '[data-tour="completed-sessions"]',
    content: 'Completed sessions are listed here. You can download recordings and sensor data as ZIP files.',
    placement: 'top',
    title: 'Completed Sessions',
  },
  {
    target: '[data-tour="session-card"]',
    content: 'Each session card shows metadata including title, duration, number of devices, and download options.',
    placement: 'left',
    title: 'Session Details',
  },
];

// Live Monitoring tour
export const liveMonitoringTourSteps: Step[] = [
  {
    target: 'body',
    content: 'Welcome to Live Monitoring! Here you can view real-time feeds from cameras and sensors.',
    placement: 'center',
    disableBeacon: true,
    title: 'Live Monitoring',
  },
  {
    target: '[data-tour="monitoring-tabs"]',
    content: 'Switch between Cameras and Sensors views using these tabs.',
    placement: 'bottom',
    title: 'Monitoring Tabs',
  },
  {
    target: '[data-tour="camera-feeds"]',
    content: 'All connected cameras with verified status are displayed here in real-time.',
    placement: 'top',
    title: 'Camera Feeds',
  },
  {
    target: '[data-tour="sensor-feeds"]',
    content: 'Connected sensors display their current readings with real-time updates.',
    placement: 'top',
    title: 'Sensor Readings',
  },
  {
    target: '[data-tour="refresh-button"]',
    content: 'Click here to manually refresh all feeds if needed.',
    placement: 'left',
    title: 'Refresh Data',
  },
];

// Help Section tour
export const helpTourSteps: Step[] = [
  {
    target: 'body',
    content: 'Welcome to the Help section. Here you can find information about using the system.',
    placement: 'center',
    disableBeacon: true,
    title: 'Help & Documentation',
  },
  {
    target: '[data-tour="faqs"]',
    content: 'Find answers to frequently asked questions about the system.',
    placement: 'bottom',
    title: 'FAQs',
  },
  {
    target: '[data-tour="user-guide"]',
    content: 'View comprehensive guides on how to use different features.',
    placement: 'bottom',
    title: 'User Guide',
  },
  {
    target: '[data-tour="support"]',
    content: 'Contact information for technical support if you need additional help.',
    placement: 'bottom',
    title: 'Support',
  },
  {
    target: '[data-tour="tours-section"]',
    content: 'Restart any of the interactive tours from here if you need a refresher.',
    placement: 'bottom',
    title: 'Interactive Tours',
  },
];

// Technical Documentation tour
export const docsTourSteps: Step[] = [
  {
    target: 'body',
    content: 'Welcome to the Technical Documentation. This section is designed for developers and technical users.',
    placement: 'center',
    disableBeacon: true,
    title: 'Technical Documentation',
  },
  {
    target: '[data-tour="architecture"]',
    content: 'Learn about the system architecture, including design patterns and component structures.',
    placement: 'bottom',
    title: 'Architecture',
  },
  {
    target: '[data-tour="api-reference"]',
    content: 'Reference documentation for all API endpoints used by the system.',
    placement: 'bottom',
    title: 'API Reference',
  },
  {
    target: '[data-tour="data-formats"]',
    content: 'Details about data formats used for storing and exchanging information.',
    placement: 'bottom',
    title: 'Data Formats',
  },
  {
    target: '[data-tour="developer-guides"]',
    content: 'Step-by-step guides for developers working on extending the system.',
    placement: 'bottom',
    title: 'Developer Guides',
  },
];