import { cn } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { PropsWithChildren, useEffect, useState } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";

interface MainLayoutProps extends PropsWithChildren {
  className?: string;
}

export function MainLayout({ children, className }: MainLayoutProps) {
  const [sidebarCollapsed] = useLocalStorage<boolean>("sidebar-collapsed", false);
  const [mainPaddingLeft, setMainPaddingLeft] = useState("pl-64");
  const [containerMaxWidth, setContainerMaxWidth] = useState("max-w-7xl");
  
  // Adjust main content padding and max width based on sidebar collapsed state
  useEffect(() => {
    setMainPaddingLeft(sidebarCollapsed ? "pl-16" : "pl-64");
    setContainerMaxWidth(sidebarCollapsed ? "max-w-[95%]" : "max-w-7xl");
  }, [sidebarCollapsed]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900">
      <div className="flex min-h-screen">
        <Sidebar />
        <main className={cn(
          "flex-1 p-4 md:p-6 overflow-auto transition-all duration-500 ease-in-out",
          mainPaddingLeft,
          className
        )}>
          <div className={cn(
            "container mx-auto transition-all duration-500 ease-in-out",
            containerMaxWidth
          )}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}