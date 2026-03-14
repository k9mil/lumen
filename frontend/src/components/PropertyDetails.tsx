import type { Building, RiskTier } from "../types";
import { Check, X } from "lucide-react";

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
  });
}

interface PropertyDetailsProps {
  building: Building | null;
  onMarkReviewed: (id: string) => void;
  onDismiss: (id: string) => void;
}

export default function PropertyDetails({ 
  building, 
  onMarkReviewed, 
  onDismiss 
}: PropertyDetailsProps) {
  if (!building) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-white/30 p-6">
        <div className="w-16 h-16 rounded-full bg-white/[0.05] flex items-center justify-center mb-4">
          <span className="text-2xl">🏢</span>
        </div>
        <p className="text-[14px]">Select a property to view details</p>
      </div>
    );
  }

  const riskChange = Math.floor(Math.random() * 20) - 5;
  const daysSinceChange = Math.floor(Math.random() * 14) + 1;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.06]">
        <h2 className="text-[16px] font-semibold text-white mb-1 leading-tight">
          {building.address}
        </h2>
        <div className="flex items-center gap-2 text-[12px]">
          <span className="text-white/50">{building.tenant}</span>
          <span className="text-white/20">·</span>
          <span className="text-white/50">{building.propertyType}</span>
          {building.listed && (
            <>
              <span className="text-white/20">·</span>
              <span className="text-[10px] font-medium text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                Listed
              </span>
            </>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto px-5 py-4">
        {/* Risk Score */}
        <div className="flex items-center gap-4 mb-5">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle cx="40" cy="40" r="35" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
              <circle
                cx="40"
                cy="40"
                r="35"
                fill="none"
                stroke={RISK_COLORS[building.riskTier]}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${(building.riskScore / 100) * 220} 220`}
              />
            </svg>
            <div className="text-center">
              <div className="text-[22px] font-bold" style={{ color: RISK_COLORS[building.riskTier] }}>
                {building.riskScore}
              </div>
            </div>
          </div>
          <div>
            <span 
              className="px-2 py-0.5 rounded text-[11px] font-medium border"
              style={{ 
                color: RISK_COLORS[building.riskTier],
                backgroundColor: `${RISK_COLORS[building.riskTier]}15`,
                borderColor: `${RISK_COLORS[building.riskTier]}30`
              }}
            >
              {RISK_LABELS[building.riskTier]}
            </span>
            <div className="text-[12px] text-white/40 mt-1">
              {riskChange > 0 ? "↑" : "↓"} {Math.abs(riskChange)} pts · {daysSinceChange}d ago
            </div>
          </div>
        </div>

        {/* Use Classification */}
        <div className="mb-5">
          <div className="text-[10px] text-white/40 uppercase tracking-wide mb-2">Use Classification</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.06]">
              <div className="text-[10px] text-white/40 mb-0.5">Registered</div>
              <div className="text-[12px] text-white/80 truncate">{building.registeredUse}</div>
            </div>
            <div className={`rounded-lg p-2.5 border ${building.useMismatch ? "bg-red-500/[0.05] border-red-500/20" : "bg-white/[0.03] border-white/[0.06]"}`}>
              <div className="text-[10px] text-white/40 mb-0.5">Detected</div>
              <div className={`text-[12px] truncate ${building.useMismatch ? "text-red-400" : "text-white/80"}`}>
                {building.detectedUse}
              </div>
              {building.useMismatch && (
                <div className="text-[10px] text-red-400 mt-0.5">Mismatch</div>
              )}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div>
          <div className="text-[10px] text-white/40 uppercase tracking-wide mb-2">Alert Timeline</div>
          <div className="space-y-0">
            {building.signals.slice(0, 4).map((signal, i) => {
              const sourceStyle = SOURCE_COLORS[signal.source] || "text-white/50 bg-white/5 border-white/10";
              const isLast = i === Math.min(building.signals.length, 4) - 1;

              return (
                <div key={signal.id} className="flex gap-3">
                  <div className="flex flex-col items-center w-6 shrink-0">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: RISK_COLORS[signal.severity] }}
                    />
                    {!isLast && (
                      <div className="w-px flex-1 bg-white/[0.08] mt-1" />
                    )}
                  </div>
                  <div className="pb-3 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[9px] font-medium px-1 py-0.5 rounded border ${sourceStyle}`}>
                        {signal.source}
                      </span>
                      <span className="text-[10px] text-white/30">
                        {formatDate(signal.timestamp)}
                      </span>
                    </div>
                    <p className="text-[12px] text-white/60 leading-snug">
                      {signal.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 py-3 border-t border-white/[0.06] flex gap-2 bg-[#0f0f10]">
        <button
          onClick={() => onMarkReviewed(building.id)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white text-gray-900 text-[12px] font-medium rounded-lg hover:bg-white/90 transition-colors"
        >
          <Check size={14} strokeWidth={2} />
          Reviewed
        </button>
        <button
          onClick={() => onDismiss(building.id)}
          className="flex items-center justify-center gap-1.5 px-3 py-2 text-white/60 text-[12px] font-medium border border-white/[0.12] rounded-lg hover:bg-white/[0.04] transition-colors"
        >
          <X size={14} strokeWidth={2} />
          Dismiss
        </button>
      </div>
    </div>
  );
}
