import { useEffect, useRef } from "react";
import type { Building, RiskTier } from "../types";

const RISK_COLORS: Record<RiskTier, string> = {
  critical: "#dc2626",
  high: "#d97706",
  medium: "#2563eb",
  low: "#16a34a",
};

const RISK_BG: Record<RiskTier, string> = {
  critical: "bg-risk-critical-bg",
  high: "bg-risk-high-bg",
  medium: "bg-risk-medium-bg",
  low: "bg-risk-low-bg",
};

const RISK_TEXT: Record<RiskTier, string> = {
  critical: "text-risk-critical",
  high: "text-risk-high",
  medium: "text-risk-medium",
  low: "text-risk-low",
};

const SEVERITY_DOT: Record<RiskTier, string> = {
  critical: "bg-risk-critical",
  high: "bg-risk-high",
  medium: "bg-risk-medium",
  low: "bg-risk-low",
};

const SOURCE_BADGE: Record<string, string> = {
  "Vision Model": "bg-violet-50 text-violet-700 border-violet-200/50",
  "Council Rates": "bg-amber-50 text-amber-700 border-amber-200/50",
  "Companies House": "bg-blue-50 text-blue-700 border-blue-200/50",
  "Street View": "bg-emerald-50 text-emerald-700 border-emerald-200/50",
  "Building Survey": "bg-slate-50 text-slate-700 border-slate-200/50",
  "Fire Service": "bg-red-50 text-red-700 border-red-200/50",
  "Health & Safety": "bg-orange-50 text-orange-700 border-orange-200/50",
  "Council Planning": "bg-indigo-50 text-indigo-700 border-indigo-200/50",
  "Licensing Board": "bg-purple-50 text-purple-700 border-purple-200/50",
  "Flood Risk": "bg-cyan-50 text-cyan-700 border-cyan-200/50",
  "Environmental Health": "bg-lime-50 text-lime-700 border-lime-200/50",
  "Routine Check": "bg-gray-50 text-gray-600 border-gray-200/50",
};

function ArcGauge({
  score,
  tier,
  size = 120,
}: {
  score: number;
  tier: RiskTier;
  size?: number;
}) {
  const radius = (size - 12) / 2;
  const center = size / 2;
  const circumference = Math.PI * radius; // half circle
  const progress = (score / 100) * circumference;

  return (
    <svg width={size} height={size / 2 + 16} viewBox={`0 0 ${size} ${size / 2 + 16}`}>
      {/* Background arc */}
      <path
        d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
        fill="none"
        stroke="#f0f0f0"
        strokeWidth={6}
        strokeLinecap="round"
      />
      {/* Progress arc */}
      <path
        d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
        fill="none"
        stroke={RISK_COLORS[tier]}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={`${progress} ${circumference}`}
      />
      {/* Score text */}
      <text
        x={center}
        y={center - 4}
        textAnchor="middle"
        fill={RISK_COLORS[tier]}
        fontSize={28}
        fontFamily="DM Mono"
        fontWeight={500}
      >
        {score}
      </text>
      <text
        x={center}
        y={center + 14}
        textAnchor="middle"
        fill="#9ca3af"
        fontSize={10}
        fontFamily="DM Sans"
      >
        Risk Score
      </text>
    </svg>
  );
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate();
  const month = d.toLocaleDateString("en-GB", { month: "short" });
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day} ${month}, ${time}`;
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
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [building, onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!building) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/10 animate-fade-in" />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="absolute right-0 top-0 bottom-0 w-[420px] bg-white shadow-2xl animate-slide-in flex flex-col"
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-surface-200">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {building.address}
              </h2>
              <div className="flex items-center gap-2 mt-2">
                {building.listed && (
                  <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/50">
                    Listed Building
                  </span>
                )}
                <span className="text-[11px] font-medium text-gray-500 bg-surface-100 px-2 py-0.5 rounded">
                  {building.propertyType}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M6 6L14 14M14 6L6 14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5">
          {/* Risk score gauge */}
          <div className="flex justify-center mb-6">
            <ArcGauge
              score={building.riskScore}
              tier={building.riskTier}
              size={140}
            />
          </div>

          {/* Risk tier badge */}
          <div className="flex justify-center mb-6">
            <span
              className={`
                inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border
                ${RISK_BG[building.riskTier]} ${RISK_TEXT[building.riskTier]}
              `}
              style={{ borderColor: `${RISK_COLORS[building.riskTier]}30` }}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${SEVERITY_DOT[building.riskTier]}`}
              />
              {building.riskTier.charAt(0).toUpperCase() +
                building.riskTier.slice(1)}{" "}
              Risk
            </span>
          </div>

          {/* Use comparison */}
          <div className="bg-surface-50 rounded-lg border border-surface-200 p-4 mb-6">
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-3">
              Use Classification
            </div>
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <span className="text-xs text-gray-500">Registered</span>
                <span className="text-xs font-medium text-gray-700 text-right max-w-[220px]">
                  {building.registeredUse}
                </span>
              </div>
              <div className="flex items-start justify-between">
                <span className="text-xs text-gray-500">Detected</span>
                <span
                  className={`text-xs font-medium text-right max-w-[220px] ${
                    building.useMismatch
                      ? "text-risk-critical"
                      : "text-gray-700"
                  }`}
                >
                  {building.detectedUse}
                  {building.useMismatch && (
                    <span className="block text-[10px] font-medium text-risk-critical mt-0.5">
                      &#9888; Mismatch detected
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Signal timeline */}
          <div className="mb-4">
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-3">
              Signal Timeline
            </div>
            <div className="space-y-0">
              {building.signals.map((signal, i) => {
                const sourceBadge =
                  SOURCE_BADGE[signal.source] ||
                  "bg-gray-50 text-gray-600 border-gray-200/50";
                const isLast = i === building.signals.length - 1;

                return (
                  <div key={signal.id} className="flex gap-3">
                    {/* Timeline line + dot */}
                    <div className="flex flex-col items-center w-3 shrink-0">
                      <div
                        className={`w-2 h-2 rounded-full mt-2 ${SEVERITY_DOT[signal.severity]}`}
                      />
                      {!isLast && (
                        <div className="w-px flex-1 bg-surface-200 mt-1" />
                      )}
                    </div>

                    {/* Content */}
                    <div className={`pb-4 flex-1 ${isLast ? "" : ""}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${sourceBadge}`}
                        >
                          {signal.source}
                        </span>
                        <span className="font-mono text-[10px] text-gray-400">
                          {formatTimestamp(signal.timestamp)}
                        </span>
                      </div>
                      <p className="text-[13px] text-gray-700 leading-relaxed">
                        {signal.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-surface-200 flex gap-3">
          <button
            onClick={() => onMarkReviewed(building.id)}
            className="flex-1 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            Mark as Reviewed
          </button>
          <button
            onClick={() => onDismiss(building.id)}
            className="px-4 py-2.5 text-gray-600 text-sm font-medium border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
