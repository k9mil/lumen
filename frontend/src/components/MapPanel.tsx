import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, Minimize2, MapPin, Zap, Layers, Activity } from "lucide-react";
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
  
  const [showPulse, setShowPulse] = useState(true);
  const markersMapRef = useRef<Map<string, any>>(new Map());
  const hotspotsRef = useRef<any[]>([]);
  const pulseIntervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);

  // Calculate hotspots
  const calculateHotspots = useCallback(() => {
    const hotspots: Array<{ lng: number; lat: number; intensity: number; count: number }> = [];
    const gridSize = 0.003;
    const grid = new Map<string, { buildings: Building[]; totalRisk: number }>();
    
    buildings.forEach((b) => {
      const gridX = Math.floor(b.lng / gridSize);
      const gridY = Math.floor(b.lat / gridSize);
      const key = `${gridX},${gridY}`;
      
      if (!grid.has(key)) {
        grid.set(key, { buildings: [], totalRisk: 0 });
      }
      const cell = grid.get(key)!;
      cell.buildings.push(b);
      cell.totalRisk += b.riskScore;
    });
    
    grid.forEach((cell) => {
      if (cell.buildings.length >= 2) {
        const avgLng = cell.buildings.reduce((sum, b) => sum + b.lng, 0) / cell.buildings.length;
        const avgLat = cell.buildings.reduce((sum, b) => sum + b.lat, 0) / cell.buildings.length;
        
        hotspots.push({
          lng: avgLng,
          lat: avgLat,
          intensity: Math.min(cell.totalRisk / 150, 0.8),
          count: cell.buildings.length,
        });
      }
    });
    
    return hotspots;
  }, [buildings]);

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
        const size = Math.max(12, Math.min(28, b.riskScore / 3));

        const wrapper = document.createElement("div");
        wrapper.style.position = "absolute";
        wrapper.style.transform = "translate(-50%, -50%)";
        wrapper.style.pointerEvents = "auto";

        // Create pulsing ring effect
        if (showPulse && b.riskTier === "critical" || b.riskTier === "high") {
          const pulseRing = document.createElement("div");
          pulseRing.className = "marker-pulse";
          pulseRing.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: ${size * 3}px;
            height: ${size * 3}px;
            border-radius: 50%;
            background: ${RISK_COLORS[b.riskTier]}20;
            border: 2px solid ${RISK_COLORS[b.riskTier]}40;
            animation: pulse-ring 2s ease-out infinite;
            pointer-events: none;
          `;
          wrapper.appendChild(pulseRing);
        }

        const el = document.createElement("div");
        el.style.cssText = `
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background: ${RISK_COLORS[b.riskTier]};
          border: 3px solid rgba(255,255,255,0.95);
          box-shadow: 0 0 20px ${RISK_COLORS[b.riskTier]}60, 0 4px 12px rgba(0,0,0,0.4);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          z-index: 10;
        `;

        wrapper.appendChild(el);

        wrapper.addEventListener("mouseenter", () => {
          el.style.transform = "scale(1.5)";
          el.style.boxShadow = `0 0 30px ${RISK_COLORS[b.riskTier]}80, 0 6px 20px rgba(0,0,0,0.5)`;
        });

        wrapper.addEventListener("mouseleave", () => {
          if (selectedId !== b.id) {
            el.style.transform = "scale(1)";
            el.style.boxShadow = `0 0 20px ${RISK_COLORS[b.riskTier]}60, 0 4px 12px rgba(0,0,0,0.4)`;
          }
        });

        wrapper.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelectBuilding(b.id);
        });

        const marker = new (mb.Marker as any)(wrapper)
          .setLngLat([b.lng, b.lat])
          .addTo(map);

        markersMapRef.current.set(b.id, marker);
      });

      // Add hotspots
      if (showHotspots) {
        addHotspots();
      }
    });

    return () => {
      markersMapRef.current.forEach((marker) => marker.remove());
      markersMapRef.current.clear();
      hotspotsRef.current.forEach((marker) => marker.remove());
      hotspotsRef.current = [];
      pulseIntervalsRef.current.forEach(clearInterval);
      pulseIntervalsRef.current = [];
      map.remove();
    };
  }, [buildings, selectedId, onSelectBuilding, showHotspots, showPulse]);

  const addHotspots = useCallback(() => {
    if (!mapRef.current) return;
    
    const mb = window.mapboxgl;
    const hotspots = calculateHotspots();
    
    hotspots.forEach((hotspot) => {
      const el = document.createElement("div");
      el.style.cssText = `
        width: 150px;
        height: 150px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(239, 68, 68, ${hotspot.intensity}) 0%, rgba(239, 68, 68, 0.4) 40%, rgba(239, 68, 68, 0) 70%);
        pointer-events: none;
        animation: pulse-hotspot 3s ease-in-out infinite;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      
      // Add count badge
      const badge = document.createElement("div");
      badge.style.cssText = `
        background: rgba(239, 68, 68, 0.9);
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        border: 2px solid rgba(255,255,255,0.8);
      `;
      badge.textContent = hotspot.count.toString();
      el.appendChild(badge);
      
      const marker = new (mb.Marker as any)(el)
        .setLngLat([hotspot.lng, hotspot.lat])
        .addTo(mapRef.current);
      
      hotspotsRef.current.push(marker);
    });
  }, [calculateHotspots]);

  useEffect(() => {
    markersMapRef.current.forEach((marker, buildingId) => {
      const wrapper = marker.getElement();
      const el = wrapper.querySelector("div:last-child") as HTMLElement;
      if (buildingId === selectedId) {
        el.style.transform = "scale(1.8)";
        el.style.zIndex = "100";
        el.style.boxShadow = `0 0 40px ${el.style.backgroundColor}80, 0 8px 24px rgba(0,0,0,0.6)`;
      } else {
        el.style.transform = "scale(1)";
        el.style.zIndex = "10";
      }
    });
  }, [selectedId]);

  useEffect(() => {
    if (!flyToId || !mapRef.current) return;
    const building = buildings.find((b) => b.id === flyToId);
    if (building) {
      mapRef.current.flyTo({
        center: [building.lng, building.lat],
        zoom: 16,
        duration: 1200,
        pitch: 45,
      });
    }
  }, [flyToId, buildings]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.resize();
        if (!isFullscreen) {
          // Enable 3D when going fullscreen
          mapRef.current.setPitch(60);
        } else {
          mapRef.current.setPitch(0);
        }
      }
    }, 300);
  };

  const stats = {
    total: buildings.length,
    critical: buildings.filter((b) => b.riskTier === "critical").length,
    high: buildings.filter((b) => b.riskTier === "high").length,
    avgScore: Math.round(buildings.reduce((sum, b) => sum + b.riskScore, 0) / buildings.length),
  };

  return (
    <motion.div
      layout
      className={`
        flex flex-col overflow-hidden
        ${isFullscreen
          ? "fixed inset-0 z-50 bg-[#0a0a0b] rounded-none"
          : "h-full rounded-2xl border border-white/[0.08] bg-[#0c0c0d]"
        }
      `}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Animated header bar */}
      <motion.div 
        className="flex items-center justify-between px-4 py-3 bg-white/[0.03] backdrop-blur-sm border-b border-white/[0.06]"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <MapPin size={18} className="text-blue-400" />
          </motion.div>
          <h3 className="text-[14px] font-semibold text-white/90">Exposure Map</h3>
          
          {/* Stats pills - only show in fullscreen */}
          <AnimatePresence>
            {isFullscreen && (
              <motion.div 
                className="flex items-center gap-2 ml-4"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <span className="px-2 py-1 bg-white/5 rounded text-[11px] text-white/60 border border-white/10">
                  {stats.total} Properties
                </span>
                <span className="px-2 py-1 bg-red-500/20 rounded text-[11px] text-red-400 border border-red-500/30">
                  {stats.critical} Critical
                </span>
                <span className="px-2 py-1 bg-orange-500/20 rounded text-[11px] text-orange-400 border border-orange-500/30">
                  {stats.high} High
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2">
          {/* Hotspots toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowHotspots(!showHotspots)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all
              ${showHotspots
                ? "bg-gradient-to-r from-red-500/30 to-orange-500/30 text-white border border-red-500/40 shadow-lg shadow-red-500/20"
                : "bg-white/[0.06] text-white/50 border border-white/[0.08]"
              }
            `}
          >
            <Zap size={14} className={showHotspots ? "animate-pulse" : ""} />
            Hotspots
          </motion.button>

          {/* Pulse toggle */}
          {isFullscreen && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowPulse(!showPulse)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all
                ${showPulse
                  ? "bg-gradient-to-r from-blue-500/30 to-cyan-500/30 text-white border border-blue-500/40 shadow-lg shadow-blue-500/20"
                  : "bg-white/[0.06] text-white/50 border border-white/[0.08]"
                }
              `}
            >
              <Activity size={14} className={showPulse ? "animate-pulse" : ""} />
              Pulse
            </motion.button>
          )}

          {/* Legend */}
          <motion.div 
            className="flex items-center gap-3 text-[11px] text-white/60 bg-white/[0.05] px-3 py-1.5 rounded-lg border border-white/[0.08]"
            whileHover={{ scale: 1.02 }}
          >
            <span className="flex items-center gap-1.5">
              <motion.span 
                className="w-2.5 h-2.5 rounded-full bg-red-500"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              Critical
            </span>
            <span className="flex items-center gap-1.5">
              <motion.span 
                className="w-2.5 h-2.5 rounded-full bg-orange-500"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
              />
              High
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              Med
            </span>
          </motion.div>

          {/* Fullscreen toggle */}
          <motion.button
            whileHover={{ scale: 1.1, rotate: isFullscreen ? -180 : 180 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 hover:from-blue-500/30 hover:to-blue-600/30 text-blue-400 transition-all border border-blue-500/30 shadow-lg shadow-blue-500/10"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </motion.button>
        </div>
      </motion.div>

      {/* Map container with glow effect */}
      <motion.div 
        className="flex-1 relative overflow-hidden"
        animate={isFullscreen ? { 
          boxShadow: "inset 0 0 100px rgba(59, 130, 246, 0.1)" 
        } : {}}
      >
        <div ref={containerRef} className="w-full h-full" />
        
        {/* Corner decorations in fullscreen */}
        <AnimatePresence>
          {isFullscreen && (
            <>
              <motion.div
                className="absolute top-4 left-4 w-32 h-32 border border-blue-500/20 rounded-full"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ duration: 0.5 }}
              />
              <motion.div
                className="absolute bottom-4 right-4 w-48 h-48 border border-red-500/10 rounded-full"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              />
            </>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Bottom stats bar in fullscreen */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 px-6 py-4 bg-gradient-to-t from-black/80 to-transparent"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-white/40" />
                  <span className="text-white/60 text-sm">Zoom: {Math.round((mapRef.current?.getZoom() || 13.5) * 10) / 10}x</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-white/40" />
                  <span className="text-white/60 text-sm">Avg Risk: {stats.avgScore}</span>
                </div>
              </div>
              <div className="text-white/40 text-xs">
                Press ESC to exit fullscreen
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
