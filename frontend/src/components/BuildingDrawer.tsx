import { useEffect, useRef } from "react";
import type { Building, RiskTier } from "../types";

const RISK_COLORS: Record<RiskTier, string> = {
  critical: "#ef4444",
  high: "#f59e0b",
  medium: "#3b82f6",
  low: "#10b981",
};

const RISK_LABELS: Record<RiskTier, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const SOURCE_COLORS: Record<string, string> = {
  "Vision Model": "text-violet-400 bg-violet-500/10 border-violet-500/20",
  "Council Rates": "text-amber-400 bg-amber-500/10 border-amber-500/20",
  "Companies House": "text-blue-400 bg-blue-500/10 border-blue-500/20",
  "Street View": "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  "Building Survey": "text-slate-400 bg-slate-500/10 border-slate-500/20",
  "Fire Service": "text-red-400 bg-red-500/10 border-red-500/20",
  "Health & Safety": "text-orange-400 bg-orange-500/10 border-orange-500/20",
  "Council Planning": "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  "Licensing Board": "text-purple-400 bg-purple-500/10 border-purple-500/20",
  "Flood Risk": "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  "Environmental Health": "text-lime-400 bg-lime-500/10 border-lime-500/20",
  "Routine Check": "text-white/50 bg-white/5 border-white/10",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface BuildingDrawerProps {
  building: Building | null;
  onClose: () => void;
  onMarkReviewed: (id: string) => void;
  onDismiss: (id: string) => void;
}

export default function BuildingDrawer({
  building,
  onClose,
  onMarkReviewed,
  onDismiss,
}: BuildingDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (building) {
      document.addEventListener("mousedown", handleClick);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.body.style.overflow = "";
    };
  }, [building, onClose]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (building) {
      document.addEventListener("keydown", handleKey);
    }
    return () => document.removeEventListener("keydown", handleKey);
  }, [building, onClose]);

  if (!building) return null;

  const riskChange = Math.floor(Math.random() * 20) - 5;
  const daysSinceChange = Math.floor(Math.random() * 14) + 1;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      <div
        ref={drawerRef}
        className="absolute right-0 top-0 bottom-0 w-[33vw] min-w-[400px] max-w-[500px] bg-[#0f0f10] shadow-2xl animate-slide-in flex flex-col border-l border-white/[0.08]"
      >
        <div className="px-6 py-5 border-b border-white/[0.06]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[20px] font-semibold text-white mb-1">{building.address}</h2>
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-white/50">{building.tenant}</span>
                <span className="text-white/20">·</span>
                <span className="text-[13px] text-white/50">{building.propertyType}</span>
                {building.listed && (
                  <>
                    <span className="text-white/20">·</span>
                    <span className="text-[11px] font-medium text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      Listed Building
                    </span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white p-2 hover:bg-white/[0.06] rounded-lg transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="px-6 py-5 border-b border-white/[0.06]">
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx="48" cy="48" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                  <circle
                    cx="48"
                    cy="48"
                    r="42"
                    fill="none"
                    stroke={RISK_COLORS[building.riskTier]}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${(building.riskScore / 100) * 264} 264`}
                  />
                </svg>
                <div className="text-center">
                  <div className="text-[28px] font-bold" style={{ color: RISK_COLORS[building.riskTier] }}>
                    {building.riskScore}
                  </div>
                  <div className="text-[10px] text-white/40 mt-0.5 uppercase tracking-wide">Score</div>
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="px-2 py-0.5 rounded text-[12px] font-medium border"
                    style={{
                      color: RISK_COLORS[building.riskTier],
                      backgroundColor: `${RISK_COLORS[building.riskTier]}15`,
                      borderColor: `${RISK_COLORS[building.riskTier]}30`,
                    }}
                  >
                    {RISK_LABELS[building.riskTier]} Risk
                  </span>
                  <span className="text-white/30">·</span>
                  <span className="text-[13px] text-white/60">
                    Risk {riskChange > 0 ? "increased" : "decreased"} by {Math.abs(riskChange)} points
                  </span>
                </div>
                <div className="text-[13px] text-white/50">Last change {daysSinceChange} days ago</div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-b border-white/[0.06]">
            <div className="text-[11px] text-white/40 uppercase tracking-wide mb-3">Use Classification</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.06]">
                <div className="text-[11px] text-white/40 mb-1">Registered</div>
                <div className="text-[12px] font-medium text-white/80">{building.registeredUse}</div>
              </div>
              <div
                className={`rounded-lg p-4 border ${
                  building.useMismatch ? "bg-red-500/[0.05] border-red-500/20" : "bg-white/[0.03] border-white/[0.06]"
                }`}
              >
                <div className="text-[11px] text-white/40 mb-1">Detected</div>
                <div className={`text-[12px] font-medium ${building.useMismatch ? "text-red-400" : "text-white/80"}`}>
                  {building.detectedUse}
                </div>
                {building.useMismatch && (
                  <div className="flex items-center gap-1 mt-1.5 text-[11px] text-red-400">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Mismatch detected
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 py-4">
            <div className="text-[11px] text-white/40 uppercase tracking-wide mb-4">Alert Timeline</div>
            <div className="space-y-0">
              {building.signals.map((signal, i) => {
                const sourceStyle = SOURCE_COLORS[signal.source] || "text-white/50 bg-white/5 border-white/10";
                const isLast = i === building.signals.length - 1;

                return (
                  <div key={signal.id} className="flex gap-3">
                    <div className="flex flex-col items-center w-3 shrink-0">
                      <div
                        className="w-[7px] h-[7px] rounded-full mt-[7px] ring-2 ring-[#0f0f10]"
                        style={{ backgroundColor: RISK_COLORS[signal.severity] }}
                      />
                      {!isLast && <div className="w-px flex-1 bg-white/[0.08] mt-1" />}
                    </div>

                    <div className="pb-5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[10px] font-semibold px-1.5 py-[2px] rounded-[3px] border ${sourceStyle}`}>
                          {signal.source}
                        </span>
                        <span className="font-mono text-[10px] text-white/40">{formatDate(signal.timestamp)} at {formatTime(signal.timestamp)}</span>
                      </div>
                      <p className="text-[12.5px] text-white/70 leading-relaxed">{signal.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/[0.06] flex gap-3 bg-[#0f0f10]">
          <button
            onClick={() => onMarkReviewed(building.id)}
            className="flex-1 px-4 py-2.5 bg-white text-gray-900 text-[13px] font-semibold rounded-lg hover:bg-white/90 transition-colors"
          >
            Mark as Reviewed
          </button>
          <button
            onClick={() => onDismiss(building.id)}
            className="px-4 py-2.5 text-white/60 text-[13px] font-medium border border-white/[0.12] rounded-lg hover:bg-white/[0.04] transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
