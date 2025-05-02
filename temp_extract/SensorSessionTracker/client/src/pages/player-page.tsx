import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Camera } from "@shared/schema";

export default function PlayerPage() {
  const { data: cameras } = useQuery<Camera[]>({
    queryKey: ["/api/cameras"],
  });

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cameras?.map((camera) => (
        <Card key={camera.id}>
          <CardContent className="p-4">
            <div className="aspect-video bg-black/5 rounded-lg mb-4 relative group">
              <div className="absolute inset-0 flex items-center justify-center">
                <a
                  href={`http://${camera.ipAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white bg-black/50 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ExternalLink className="h-6 w-6" />
                </a>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{camera.name}</h3>
              <a
                href={`http://${camera.ipAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:underline flex items-center gap-1"
              >
                Acceso Web
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              IP: {camera.ipAddress}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}