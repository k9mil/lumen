import { useState, useEffect, useRef } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import type { Building } from "../types";

const RISK_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f59e0b",
  medium: "#3b82f6",
  low: "#10b981",
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
  const mapRef = useRef<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHotspots, setShowHotspots] = useState(true);
  const markersMapRef = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    if (!containerRef.current || !window.mapboxgl) return;

    const mb = window.mapboxgl;
    mb.accessToken =
      "pk.eyJ1Ijoia2FtaWx6YWsiLCJhIjoiY21tbDJubmd0MDZ4bzJzcjhtenNkemVtcyJ9.XlGtaB72L5YlbYTnywBaDw";

    const map = new mb.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-4.2518, 55.8592],
      zoom: 13.5,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on("load", () => {
      buildings.forEach((b) => {
        const size = Math.max(10, Math.min(24, b.riskScore / 4));

        const container = document.createElement("div");
        container.style.position = "absolute";
        container.style.transform = "translate(-50%, -50%)";
        container.style.pointerEvents = "auto";

        const el = document.createElement("div");
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.borderRadius = "50%";
        el.style.backgroundColor = RISK_COLORS[b.riskTier];
        el.style.border = "2px solid rgba(255,255,255,0.95)";
        el.style.boxShadow = `0 2px 8px ${RISK_COLORS[b.riskTier]}80`;
        el.style.cursor = "pointer";
        el.style.transition = "transform 0.2s ease";

        container.appendChild(el);

        container.addEventListener("mouseenter", () => {
          el.style.transform = "scale(1.3)";
        });

        container.addEventListener("mouseleave", () => {
          if (selectedId !== b.id) {
            el.style.transform = "scale(1)";
          }
        });

        container.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelectBuilding(b.id);
        });

        const marker = new (mb.Marker as any)(container)
          .setLngLat([b.lng, b.lat])
          .addTo(map);

        markersMapRef.current.set(b.id, marker);
      });
    });

    return () => {
      markersMapRef.current.forEach((marker) => marker.remove());
      markersMapRef.current.clear();
      map.remove();
    };
  }, []);

  useEffect(() => {
    markersMapRef.current.forEach((marker, buildingId) => {
      const container = marker.getElement();
      const el = container.firstChild as HTMLElement;
      if (buildingId === selectedId) {
        el.style.transform = "scale(1.5)";
      } else {
        el.style.transform = "scale(1)";
      }
    });
  }, [selectedId]);

  useEffect(() => {
    if (!flyToId || !mapRef.current) return;
    const building = buildings.find((b) => b.id === flyToId);
    if (building) {
      mapRef.current.flyTo({
        center: [building.lng, building.lat],
        zoom: 15,
        duration: 1000,
      });
    }
  }, [flyToId, buildings]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    }, 300);
  };

  return (
    <div
      className={`
        flex flex-col transition-all duration-500 ease-in-out
        ${isFullscreen
          ? "fixed inset-4 z-50 bg-[#0a0a0b] rounded-2xl shadow-2xl overflow-hidden border border-white/[0.08]"
          : "h-full"
        }
      `}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-[14px] font-medium text-white/60">Exposure Map</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHotspots(!showHotspots)}
            className={`
              flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors
              ${showHotspots
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : "bg-white/[0.06] text-white/50 border border-white/[0.08]"
              }
            `}
          >
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Hotspots
          </button>

          <div className="flex items-center gap-3 text-[11px] text-white/40 bg-white/[0.03] px-3 py-1.5 rounded-lg border border-white/[0.06]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Critical
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              High
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Med
            </span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white/60 hover:text-white/90 transition-colors border border-white/[0.08]"
          >
            {isFullscreen ? (
              <Minimize2 size={16} strokeWidth={1.5} />
            ) : (
              <Maximize2 size={16} strokeWidth={1.5} />
            )}
          </button>
        </div>
      </div>

      <div
        className={`
        flex-1 rounded-xl overflow-hidden border border-white/[0.08] min-h-0 bg-[#0c0c0d]
        ${isFullscreen ? "m-0" : ""}
      `}
      >
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
