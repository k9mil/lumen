import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, Minimize2, Search, MapPin, X } from "lucide-react";
import type { Building } from "../types";

const RISK_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f59e0b",
  medium: "#3b82f6",
  low: "#10b981",
};

// Simple L logo component
function LumenLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor">
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <rect x="4" y="11" width="7" height="7" rx="1" />
      <rect x="4" y="18" width="7" height="7" rx="1" />
      <rect x="4" y="25" width="7" height="3" rx="1" />
      <rect x="11" y="21" width="7" height="7" rx="1" />
      <rect x="18" y="21" width="7" height="7" rx="1" />
      <rect x="25" y="21" width="3" height="7" rx="1" />
    </svg>
  );
}

interface MapPanelProps {
  buildings: Building[];
  selectedId: string | null;
  onSelectBuilding: (id: string) => void;
  flyToId: string | null;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

export default function MapPanel({
  buildings,
  selectedId,
  onSelectBuilding,
  flyToId,
  onFullscreenChange,
}: MapPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHotspots, setShowHotspots] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const markersMapRef = useRef<Map<string, any>>(new Map());
  const hotspotsRef = useRef<any[]>([]);

  // Use refs for callbacks so map effect doesn't depend on them
  const onSelectBuildingRef = useRef(onSelectBuilding);
  onSelectBuildingRef.current = onSelectBuilding;
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  // Calculate hotspots
  const calculateHotspots = useCallback(() => {
    const hotspots: Array<{ lng: number; lat: number; count: number }> = [];
    const gridSize = 0.005;
    const grid = new Map<string, { buildings: Building[] }>();

    buildings.forEach((b) => {
      const gridX = Math.floor(b.lng / gridSize);
      const gridY = Math.floor(b.lat / gridSize);
      const key = `${gridX},${gridY}`;

      if (!grid.has(key)) {
        grid.set(key, { buildings: [] });
      }
      const cell = grid.get(key)!;
      cell.buildings.push(b);
    });

    grid.forEach((cell) => {
      if (cell.buildings.length >= 3) {
        const avgLng = cell.buildings.reduce((sum, b) => sum + b.lng, 0) / cell.buildings.length;
        const avgLat = cell.buildings.reduce((sum, b) => sum + b.lat, 0) / cell.buildings.length;

        hotspots.push({
          lng: avgLng,
          lat: avgLat,
          count: cell.buildings.length,
        });
      }
    });

    return hotspots;
  }, [buildings]);

  // Initialize map ONCE — no dependency on selectedId or onSelectBuilding
  useEffect(() => {
    if (!containerRef.current || !window.mapboxgl) return;

    const mb = window.mapboxgl;
    mb.accessToken =
      "pk.eyJ1IjoiZmFiaWFuc2FsZ2UiLCJhIjoiY21lendoeGo0MGI0NjJrc2c5MXJrNjhldCJ9.G9X8xJ2No5o_1-ad37cbXw";

    const map = new mb.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/standard",
      center: [-4.2518, 55.8592],
      zoom: 13.5,
      pitch: 45,
      bearing: -15,
      attributionControl: false,
      antialias: true,
    } as any);

    mapRef.current = map;

    map.on("load", () => {
      // Enable 3D terrain
      try {
        // @ts-ignore - Mapbox types issue
        map.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
          maxzoom: 14,
        });
        // @ts-ignore - Mapbox types issue
        map.setTerrain({ source: "mapbox-dem", exaggeration: 1.2 });
      } catch (_e) {
        // terrain may not be supported
      }

      buildings.forEach((b) => {
        const size = Math.max(14, Math.min(24, b.riskScore / 3.5));

        const wrapper = document.createElement("div");
        wrapper.style.position = "absolute";
        wrapper.style.transform = "translate(-50%, -50%)";
        wrapper.style.pointerEvents = "auto";

        const el = document.createElement("div");
        el.style.cssText = `
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background: ${RISK_COLORS[b.riskTier]};
          border: 2.5px solid white;
          box-shadow: 0 0 0 3px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.5), 0 0 12px ${RISK_COLORS[b.riskTier]}66;
          cursor: pointer;
          transition: transform 0.2s ease;
        `;

        wrapper.appendChild(el);

        wrapper.addEventListener("mouseenter", () => {
          el.style.transform = "scale(1.3)";
        });

        wrapper.addEventListener("mouseleave", () => {
          if (selectedIdRef.current !== b.id) {
            el.style.transform = "scale(1)";
          }
        });

        wrapper.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelectBuildingRef.current(b.id);
        });

        const marker = new (mb.Marker as any)(wrapper)
          .setLngLat([b.lng, b.lat])
          .addTo(map);

        markersMapRef.current.set(b.id, marker);
      });
    });

    return () => {
      markersMapRef.current.forEach((marker) => marker.remove());
      markersMapRef.current.clear();
      hotspotsRef.current.forEach((marker) => marker.remove());
      hotspotsRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [buildings]); // Only rebuild when buildings data changes

  // Manage hotspots separately
  useEffect(() => {
    if (!mapRef.current || !showHotspots) {
      // Remove existing hotspots
      hotspotsRef.current.forEach((marker) => marker.remove());
      hotspotsRef.current = [];
      return;
    }

    const addHotspotsWhenReady = () => {
      const mb = window.mapboxgl;
      const hotspots = calculateHotspots();

      if (!document.getElementById("hotspot-styles")) {
        const style = document.createElement("style");
        style.id = "hotspot-styles";
        style.textContent = `
          @keyframes hotspot-pulse {
            0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
            50% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
          }
        `;
        document.head.appendChild(style);
      }

      hotspots.forEach((hotspot) => {
        const size = 50 + hotspot.count * 10;
        const wrapper = document.createElement("div");
        wrapper.style.position = "absolute";
        wrapper.style.pointerEvents = "none";

        const el = document.createElement("div");
        el.style.cssText = `
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(239, 68, 68, 0.25) 0%, rgba(239, 68, 68, 0.08) 60%, transparent 100%);
          border: 1px solid rgba(239, 68, 68, 0.2);
          pointer-events: none;
          transform: translate(-50%, -50%);
          animation: hotspot-pulse 3s ease-in-out infinite;
        `;

        wrapper.appendChild(el);

        const marker = new (mb.Marker as any)(wrapper)
          .setLngLat([hotspot.lng, hotspot.lat])
          .addTo(mapRef.current);

        hotspotsRef.current.push(marker);
      });
    };

    // If map is already loaded, add immediately
    if (mapRef.current.loaded()) {
      addHotspotsWhenReady();
    } else {
      mapRef.current.on("load", addHotspotsWhenReady);
    }

    return () => {
      hotspotsRef.current.forEach((marker) => marker.remove());
      hotspotsRef.current = [];
    };
  }, [showHotspots, calculateHotspots]);

  // Update marker highlights when selection changes — no map rebuild
  useEffect(() => {
    markersMapRef.current.forEach((marker, buildingId) => {
      const wrapper = marker.getElement();
      const el = wrapper.firstChild as HTMLElement;
      if (el) {
        if (buildingId === selectedId) {
          el.style.transform = "scale(1.5)";
        } else {
          el.style.transform = "scale(1)";
        }
      }
    });
  }, [selectedId]);

  // Fly to building when requested
  useEffect(() => {
    if (!flyToId || !mapRef.current) return;
    const building = buildings.find((b) => b.id === flyToId);
    if (building) {
      mapRef.current.flyTo({
        center: [building.lng, building.lat],
        zoom: 16,
        duration: 1500,
      });
    }
  }, [flyToId, buildings]);

  // Filter buildings for autosuggest
  const suggestions = searchQuery.trim().length > 0
    ? buildings.filter((b) => {
        const q = searchQuery.toLowerCase();
        return b.address.toLowerCase().includes(q) || b.tenant.toLowerCase().includes(q);
      }).slice(0, 6)
    : [];

  const selectSuggestion = (building: Building) => {
    setSearchQuery(building.address);
    setSearchFocused(false);
    onSelectBuilding(building.id);
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [building.lng, building.lat],
        zoom: 17,
        duration: 1500,
      });
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (suggestions.length > 0) {
      selectSuggestion(suggestions[0]);
    }
  };

  const toggleFullscreen = () => {
    const newFullscreen = !isFullscreen;
    setIsFullscreen(newFullscreen);
    if (onFullscreenChange) {
      onFullscreenChange(newFullscreen);
    }
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    }, 100);
  };

  return (
    <motion.div
      layout
      className={`
        flex flex-col overflow-hidden
        ${isFullscreen
          ? "fixed inset-0 z-40 bg-[#0a0a0b] rounded-none pointer-events-auto"
          : "h-full rounded-2xl border border-white/[0.08] bg-[#0c0c0d]"
        }
      `}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 text-white">
            <LumenLogo className="w-full h-full" />
          </div>
          <span className="text-[15px] font-medium text-white/90 lowercase">lumen</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Hotspots toggle */}
          <button
            onClick={() => setShowHotspots(!showHotspots)}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all
              ${showHotspots
                ? "bg-white text-gray-900"
                : "bg-white/[0.06] text-white/70 hover:bg-white/[0.1] hover:text-white"
              }
            `}
          >
            <MapPin size={14} />
            Hotspots
          </button>

          {/* Legend */}
          <div className="flex items-center gap-3 text-[11px] text-white/50 px-3 py-1.5 rounded-lg bg-white/[0.03]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Critical
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              High
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Med
            </span>
          </div>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white/70 hover:text-white transition-all"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>

      {/* Map container */}
      <div className="flex-1 relative">
        <div ref={containerRef} className="w-full h-full" />

        {/* Search bar */}
        <AnimatePresence>
          {isFullscreen && (
            <motion.div
              className="absolute inset-x-0 bottom-24 z-20 flex justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="relative">
                <form onSubmit={handleSearch}>
                  <div className="flex items-center bg-black/50 backdrop-blur-xl rounded-2xl border border-white/[0.12] px-5 py-3.5 shadow-2xl">
                    <Search size={16} className="text-white/50 mr-3" />
                    <input
                      ref={searchRef}
                      type="text"
                      placeholder="Search properties..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setSearchFocused(true); }}
                      onFocus={() => setSearchFocused(true)}
                      className="bg-transparent text-white placeholder-white/30 text-[14px] w-[280px] focus:outline-none"
                      autoFocus
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => { setSearchQuery(""); setSearchFocused(false); searchRef.current?.focus(); }}
                        className="ml-2 text-white/30 hover:text-white transition-colors"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </form>

                {/* Autosuggest dropdown */}
                <AnimatePresence>
                  {searchFocused && suggestions.length > 0 && (
                    <motion.div
                      className="absolute bottom-full mb-2 left-0 right-0 bg-black/70 backdrop-blur-xl rounded-xl border border-white/[0.12] overflow-hidden shadow-2xl"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.15 }}
                    >
                      {suggestions.map((b) => (
                        <button
                          key={b.id}
                          className="w-full text-left px-4 py-2.5 hover:bg-white/[0.08] transition-colors flex items-center gap-3 group"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectSuggestion(b)}
                        >
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: RISK_COLORS[b.riskTier] }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] text-white/80 truncate">{b.address}</div>
                            <div className="text-[11px] text-white/40 truncate">{b.tenant}{b.tenant && " · "}{b.propertyType}</div>
                          </div>
                          <span className="text-[11px] text-white/30 shrink-0">{b.riskScore}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ESC hint in fullscreen */}
        <AnimatePresence>
          {isFullscreen && (
            <motion.div
              className="absolute bottom-8 right-8 text-white/30 text-[12px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Press ESC to exit
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
