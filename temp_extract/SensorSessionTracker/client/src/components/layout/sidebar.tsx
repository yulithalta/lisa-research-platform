import { Link, useLocation } from "wouter";
import { 
  Home, 
  Video,
  Settings,
  LogOut,
  Camera,
  Thermometer,
  PlaySquare,
  Wrench,
  MonitorSmartphone,
  Wifi,
  WifiOff,
  HelpCircle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Menu,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import useSimpleMqtt from "@/hooks/useSimpleMqtt";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [collapsed, setCollapsed] = useLocalStorage<boolean>("sidebar-collapsed", false);
  const [hovered, setHovered] = useState(false);
  const { isConnected, connectionError, reconnect } = useSimpleMqtt();
  
  const navigationItems = [
    { 
      icon: Home, 
      label: "Dashboard", 
      href: "/",
      isActive: (loc: string) => loc === "/"
    },
    {
      icon: PlaySquare,
      label: "Sessions",
      href: "/sessions",
      isActive: (loc: string) => loc === "/sessions"
    },
    {
      icon: MonitorSmartphone,
      label: "Live Monitoring",
      href: "/live-monitoring",
      isActive: (loc: string) => loc === "/live-monitoring" || loc === "/player" || loc === "/sensors"
    },
    {
      icon: Wrench,
      label: "Device Management",
      href: "/device-management",
      isActive: (loc: string) => loc === "/device-management" || loc.startsWith("/cameras") || loc.startsWith("/settings/sensors")
    },
    {
      icon: HelpCircle,
      label: "Help",
      href: "/help",
      isActive: (loc: string) => loc === "/help"
    },
    {
      icon: BookOpen,
      label: "Docs",
      href: "/docs",
      isActive: (loc: string) => loc === "/docs"
    }
  ];

  // Handle mouse events for hover effect on collapsed sidebar
  const handleMouseEnter = () => {
    if (collapsed) {
      setHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setHovered(false);
  };

  // Toggle the sidebar collapsed state
  const toggleSidebar = () => {
    setCollapsed(!collapsed);
    setHovered(false);
  };

  return (
    <div 
      className={cn(
        "hidden md:flex h-screen flex-col fixed left-0 bg-card/50 backdrop-blur-xl border-r transition-all duration-500 ease-in-out shadow-sm z-10",
        collapsed ? "w-16" : "w-64",
        hovered && collapsed && "w-64"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={cn(
        "flex items-center transition-all",
        collapsed ? "justify-center py-6" : "p-6"
      )}>
        <div className="flex items-center gap-2 overflow-hidden">
          <img 
            src="/LOGO-LISAv2.0.png" 
            alt="LISA Logo" 
            className="h-8 w-auto object-contain"
          />
          {(!collapsed || hovered) && (
            <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent whitespace-nowrap">
              LISA
            </h2>
          )}
        </div>
        <div className="ml-auto">
          <Button 
            variant="ghost" 
            size="default" 
            className="p-1 ml-2 h-10 w-10 hover:bg-primary/10 hover:text-primary"
            onClick={toggleSidebar}
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <nav className={cn(
        "flex-1 space-y-1.5 overflow-hidden transition-all",
        collapsed ? "px-2" : "px-3"
      )}>
        {navigationItems.map((item) => {
          const isActive = item.isActive(location);
          
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "justify-start gap-2 transition-all duration-300",
                  collapsed && !hovered ? "w-12 p-2 h-12" : "w-full",
                  isActive ? "bg-primary/5 text-primary" : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                )}
                title={collapsed && !hovered ? item.label : undefined}
              >
                <item.icon className={cn(
                  "flex-shrink-0 transition-all duration-300",
                  collapsed && !hovered ? "h-5 w-5" : "h-4 w-4"
                )} />
                {(!collapsed || hovered) && (
                  <span className="truncate">{item.label}</span>
                )}
              </Button>
            </Link>
          );
        })}
      </nav>

      <div className={cn(
        "border-t space-y-4 transition-all",
        collapsed && !hovered ? "px-2 py-3" : "p-4"
      )}>
        {(collapsed && !hovered) ? (
          // Indicador compacto cuando la barra lateral está colapsada
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex justify-center mb-3">
                  {isConnected ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                {isConnected 
                  ? "MQTT broker connected. Sensor data is being captured." 
                  : connectionError 
                    ? `MQTT Error: ${connectionError}` 
                    : "MQTT broker disconnected. No sensor data available."
                }
                {!isConnected && (
                  <div className="mt-1 text-xs">
                    <Button variant="link" className="p-0 h-auto text-xs underline" onClick={reconnect}>
                      Try reconnecting
                    </Button>
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <div className="text-sm text-muted-foreground">
            Welcome, {user?.username}
          </div>
        )}
        <Button
          variant="ghost"
          className={cn(
            "justify-center gap-2 transition-all duration-300 text-muted-foreground",
            collapsed && !hovered ? "w-12 p-2 h-12" : "w-full",
            "hover:bg-red-50 hover:text-red-500 border border-transparent hover:border-red-100"
          )}
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          title={collapsed && !hovered ? "Log out" : undefined}
        >
          {logoutMutation.isPending ? (
            <Loader2 className={cn(
              "animate-spin flex-shrink-0 transition-all duration-300",
              collapsed && !hovered ? "h-5 w-5" : "h-4 w-4"
            )} />
          ) : (
            <LogOut className={cn(
              "flex-shrink-0 transition-all duration-300",
              collapsed && !hovered ? "h-5 w-5" : "h-4 w-4"
            )} />
          )}
          {(!collapsed || hovered) && "Log out"}
        </Button>
        {(!collapsed || hovered) && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              LISA v3.0.0 - GDPR Compliant
            </p>
          </div>
        )}
      </div>
    </div>
  );
}