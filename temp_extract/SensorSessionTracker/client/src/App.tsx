import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./hooks/use-auth";
import { OnboardingProvider } from "./hooks/use-onboarding";
import { Toaster } from "@/components/ui/toaster";
import { Switch, Route } from "wouter";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/page404";
import { ProtectedRoute } from "./lib/protected-route";
import { MainLayout } from "./components/layout/main-layout";
import { logger } from "./lib/services/logger";
import SessionsPage from "@/pages/sessions-page";
import PlayerPage from "@/pages/player-page";
import RecordingPlayer from "@/pages/recording-player";
import SettingsPage from "@/pages/settings-page";
import SensorsPage from "@/pages/sensors-page";
import CamerasPage from "@/pages/cameras-page";
import SettingsSensorsPage from "@/pages/settings-sensors";
import ZigbeeDevicesPage from "@/pages/zigbee-devices-page";
import LiveMonitoringPage from "@/pages/live-monitoring-page";
import DeviceManagementPage from "@/pages/device-management-page";
import HelpPage from "@/pages/help";
import DocsPage from "@/pages/docs-page";
import SystemArchitecturePage from "@/pages/doc/system-architecture";
import SystemArchitecture20Page from "@/pages/doc/system-architecture-2.0";
import OverviewPage from "@/pages/doc/overview";
import CodeQualityPage from "@/pages/doc/code-quality";
import InstallationPage from "@/pages/doc/installation";

function Router() {
  logger.info("Initializing router");
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute 
        path="/" 
        component={() => (
          <MainLayout>
            <HomePage />
          </MainLayout>
        )} 
      />
      {/* Nuevas rutas para páginas con pestañas */}
      <ProtectedRoute 
        path="/live-monitoring" 
        component={() => (
          <MainLayout>
            <LiveMonitoringPage />
          </MainLayout>
        )} 
      />
      <ProtectedRoute 
        path="/device-management" 
        component={() => (
          <MainLayout>
            <DeviceManagementPage />
          </MainLayout>
        )} 
      />
      {/* Rutas existentes mantenidas para compatibilidad */}
      <ProtectedRoute 
        path="/cameras" 
        component={() => (
          <MainLayout>
            <CamerasPage />
          </MainLayout>
        )} 
      />
      <ProtectedRoute 
        path="/sensors" 
        component={() => (
          <MainLayout>
            <SensorsPage />
          </MainLayout>
        )} 
      />
      <ProtectedRoute 
        path="/settings/sensors" 
        component={() => (
          <MainLayout>
            <SettingsSensorsPage />
          </MainLayout>
        )} 
      />
      <ProtectedRoute 
        path="/sessions" 
        component={() => (
          <MainLayout>
            <SessionsPage />
          </MainLayout>
        )} 
      />
      <ProtectedRoute 
        path="/sessions/:id" 
        component={() => (
          <MainLayout>
            <RecordingPlayer />
          </MainLayout>
        )} 
      />
      <ProtectedRoute 
        path="/player" 
        component={() => (
          <MainLayout>
            <PlayerPage />
          </MainLayout>
        )} 
      />
      <ProtectedRoute 
        path="/settings" 
        component={() => (
          <MainLayout>
            <SettingsPage />
          </MainLayout>
        )} 
      />
      <ProtectedRoute 
        path="/zigbee-devices" 
        component={() => (
          <MainLayout>
            <ZigbeeDevicesPage />
          </MainLayout>
        )} 
      />
      <ProtectedRoute 
        path="/help" 
        component={() => (
          <MainLayout>
            <HelpPage />
          </MainLayout>
        )} 
      />
      <ProtectedRoute 
        path="/docs" 
        component={() => (
          <MainLayout>
            <DocsPage />
          </MainLayout>
        )} 
      />
      <ProtectedRoute 
        path="/doc/system-architecture" 
        component={() => (
          <MainLayout>
            <SystemArchitecturePage />
          </MainLayout>
        )} 
      />
      <ProtectedRoute 
        path="/doc/overview" 
        component={() => (
          <MainLayout>
            <OverviewPage />
          </MainLayout>
        )} 
      />
      <ProtectedRoute 
        path="/doc/code-quality" 
        component={() => (
          <MainLayout>
            <CodeQualityPage />
          </MainLayout>
        )} 
      />
      <ProtectedRoute 
        path="/doc/installation" 
        component={() => (
          <MainLayout>
            <InstallationPage />
          </MainLayout>
        )} 
      />
      <ProtectedRoute 
        path="/doc/system-architecture-2.0" 
        component={() => (
          <MainLayout>
            <SystemArchitecture20Page />
          </MainLayout>
        )} 
      />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  logger.info("Application starting");
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OnboardingProvider>
          <Router />
          <Toaster />
        </OnboardingProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;