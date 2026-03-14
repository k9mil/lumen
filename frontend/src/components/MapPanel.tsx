import { useEffect, useRef } from "react";
import type { Building } from "../types";

const RISK_COLORS: Record<string, string> = {
  critical: "#dc2626",
  high: "#d97706",
  medium: "#2563eb",
  low: "#16a34a",
};

interface MapPanelProps {
  buildings: Building[];
  selectedId: string | null;
  onSelectBuilding: (id: string) => void;
  flyToId: string | null;
}

export default function MapPanel({
  buildings,
  selectedId,
  onSelectBuilding,
  flyToId,
}: MapPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || !window.mapboxgl) return;

    const mb = window.mapboxgl;
    mb.accessToken = "pk.YOUR_MAPBOX_TOKEN_HERE";

    const map = new mb.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-4.2518, 55.8592],
      zoom: 13.5,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on("load", () => {
      buildings.forEach((b) => {
        const el = document.createElement("div");
        el.className = "map-marker";
        el.style.cssText = `
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: ${RISK_COLORS[b.riskTier]};
          border: 2px solid white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
          cursor: pointer;
          transition: transform 0.15s ease;
        `;
        el.addEventListener("mouseenter", () => {
          el.style.transform = "scale(1.4)";
        });
        el.addEventListener("mouseleave", () => {
          el.style.transform = "scale(1)";
        });
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelectBuilding(b.id);
        });

        const marker = new mb.Marker({ element: el })
          .setLngLat([b.lng, b.lat])
          .setPopup(
            new mb.Popup({
              offset: 12,
              closeButton: false,
              closeOnClick: true,
            }).setHTML(
              `<div style="font-weight:500">${b.address.split(",")[0]}</div>
               <div style="color:#6b7280;font-size:12px">${b.tenant}</div>`
            )
          )
          .addTo(map);

        markersRef.current.push(marker);
      });
    });

    return () => {
      map.remove();
      markersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fly to building when selected from table
  useEffect(() => {
    if (!flyToId || !mapRef.current) return;
    const building = buildings.find((b) => b.id === flyToId);
    if (building) {
      mapRef.current.flyTo({
        center: [building.lng, building.lat],
        zoom: 15.5,
        duration: 1200,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyToId]);

  // Highlight selected marker
  useEffect(() => {
    markersRef.current.forEach((marker, i) => {
      const el = marker.getElement();
      if (buildings[i]?.id === selectedId) {
        el.style.transform = "scale(1.6)";
        el.style.zIndex = "10";
      } else {
        el.style.transform = "scale(1)";
        el.style.zIndex = "1";
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <div className="rounded-xl border border-surface-200 overflow-hidden h-full min-h-[320px]">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
