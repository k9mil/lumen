import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { X, Eye, Shield, Zap, Globe, Search, Building as BuildingIcon } from "lucide-react";
import type { Building, RiskTier } from "../types";
import { refreshBuilding, fetchDashboardBuildings } from "../api/client";

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

const PIPELINE_STEPS = [
  { icon: Globe, label: "Geocode", duration: 2000 },
  { icon: BuildingIcon, label: "Companies", duration: 3000 },
  { icon: Search, label: "Places", duration: 2500 },
  { icon: Eye, label: "Street View", duration: 4000 },
  { icon: Zap, label: "Vision AI", duration: 8000 },
  { icon: Shield, label: "Score", duration: 2000 },
];

interface BuildingModalProps {
  building: Building | null;
  isOpen: boolean;
  onClose: () => void;
  onAcceptRisk: (id: string) => void;
  onDecline: (id: string) => void;
  onRefer: (id: string, target: string) => void;
  onBuildingUpdate?: (building: Building) => void;
}

export default function BuildingModal({
  building,
  isOpen,
  onClose,
  onAcceptRisk,
  onDecline,
  onRefer,
  onBuildingUpdate,
}: BuildingModalProps) {
  const [localBuilding, setLocalBuilding] = useState<Building | null>(building);
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0);
  
  useEffect(() => {
    setLocalBuilding(building);
  }, [building]);

  const handleRerunPipeline = useCallback(async () => {
    if (!localBuilding) return;
    
    setIsPipelineRunning(true);
    setPipelineStep(0);
    
    try {
      await refreshBuilding(localBuilding.id);
      
      for (let i = 0; i < PIPELINE_STEPS.length; i++) {
        setPipelineStep(i);
        await new Promise(resolve => setTimeout(resolve, PIPELINE_STEPS[i].duration));
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      const updatedBuildings = await fetchDashboardBuildings();
      const updated = updatedBuildings.find(b => b.id === localBuilding.id);
      if (updated) {
        setLocalBuilding(updated);
        onBuildingUpdate?.(updated);
      }
    } catch (error) {
      console.error("Pipeline failed:", error);
    } finally {
      setIsPipelineRunning(false);
      setPipelineStep(0);
    }
  }, [localBuilding, onBuildingUpdate]);

  if (!localBuilding) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
            <motion.div
              className="bg-[#111] rounded-2xl shadow-2xl overflow-hidden border border-white/[0.08] pointer-events-auto w-full max-w-2xl max-h-[85vh] flex flex-col"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-lg font-medium text-white">{localBuilding.address}</h2>
                  <p className="text-sm text-white/50 mt-0.5">{localBuilding.tenant}</p>
                </div>
                <button
                  onClick={onClose}
                  className="text-white/40 hover:text-white p-2 hover:bg-white/[0.06] rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto p-6">
                {/* Risk Score */}
                <div className="flex items-center gap-6 mb-8">
                  <div className="relative w-28 h-28">
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle cx="56" cy="56" r="48" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                      <circle
                        cx="56"
                        cy="56"
                        r="48"
                        fill="none"
                        stroke={RISK_COLORS[localBuilding.riskTier]}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${(localBuilding.riskScore / 100) * 301} 301`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-semibold" style={{ color: RISK_COLORS[localBuilding.riskTier] }}>
                        {localBuilding.riskScore}
                      </span>
                      <span className="text-xs text-white/40 uppercase tracking-wider">Risk</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-medium border"
                        style={{
                          color: RISK_COLORS[localBuilding.riskTier],
                          backgroundColor: `${RISK_COLORS[localBuilding.riskTier]}15`,
                          borderColor: `${RISK_COLORS[localBuilding.riskTier]}30`
                        }}
                      >
                        {RISK_LABELS[localBuilding.riskTier]} Risk
                      </span>
                      {localBuilding.useMismatch && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium border border-red-500/30 text-red-400 bg-red-500/10">
                          Use Mismatch
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white/60">
                      {localBuilding.propertyType} · {localBuilding.signals.length} signals · {new Date(localBuilding.lastUpdated).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Classification */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <div className="text-xs text-white/40 mb-1">Registered Use</div>
                    <div className="text-sm text-white/90">{localBuilding.registeredUse}</div>
                  </div>
                  <div className={`rounded-xl p-4 border ${localBuilding.useMismatch ? "bg-red-500/[0.04] border-red-500/20" : "bg-white/[0.03] border-white/[0.06]"}`}>
                    <div className="text-xs text-white/40 mb-1">Detected Use</div>
                    <div className={`text-sm ${localBuilding.useMismatch ? "text-red-400" : "text-white/90"}`}>
                      {localBuilding.detectedUse}
                    </div>
                  </div>
                </div>

                {/* Signals Timeline */}
                {localBuilding.signals.length > 0 && (
                  <div>
                    <h3 className="text-xs text-white/40 uppercase tracking-wider mb-4">Signal Timeline</h3>
                    <div className="relative max-h-[200px] overflow-y-auto pr-2">
                      {/* Timeline line */}
                      <div className="absolute left-[15px] top-3 bottom-3 w-px bg-white/[0.08]" />
                      
                      <div className="space-y-1">
                        {localBuilding.signals.map((signal, index) => {
                          const isLatest = index === 0;
                          return (
                            <div key={signal.id} className="flex gap-3 relative">
                              {/* Timeline node */}
                              <div className="flex flex-col items-center shrink-0 w-[30px]">
                                <div className={`${isLatest ? "p-0.5 rounded-full" : ""}`} style={isLatest ? { backgroundColor: `${RISK_COLORS[signal.severity]}40` } : {}}>
                                <div
                                  className="w-3 h-3 rounded-full border-2"
                                  style={{
                                    backgroundColor: RISK_COLORS[signal.severity],
                                    borderColor: RISK_COLORS[signal.severity],
                                  }}
                                />
                              </div>
                              </div>
                              
                              {/* Content */}
                              <div className="flex-1 pb-4">
                                <div className="flex items-baseline gap-2 mb-1">
                                  <span className="text-xs text-white/70">{signal.source}</span>
                                  <span className="text-[10px] text-white/30">
                                    {new Date(signal.timestamp).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-sm text-white/60 leading-relaxed">{signal.description}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Pipeline Progress */}
                <AnimatePresence>
                  {isPipelineRunning && (
                    <motion.div
                      className="mt-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-blue-400">Running AI Pipeline</span>
                        <span className="text-sm text-blue-400">{Math.round(((pipelineStep + 1) / PIPELINE_STEPS.length) * 100)}%</span>
                      </div>
                      <div className="h-1 bg-white/[0.1] rounded-full overflow-hidden mb-3">
                        <motion.div
                          className="h-full bg-blue-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${((pipelineStep + 1) / PIPELINE_STEPS.length) * 100}%` }}
                        />
                      </div>
                      <div className="flex gap-2">
                        {PIPELINE_STEPS.map((step, index) => {
                          const Icon = step.icon;
                          const isActive = index === pipelineStep;
                          const isComplete = index < pipelineStep;
                          return (
                            <div
                              key={step.label}
                              className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-lg ${
                                isActive ? "bg-blue-500/20" : isComplete ? "bg-emerald-500/10" : "bg-white/[0.03]"
                              }`}
                            >
                              <Icon size={14} className={isActive ? "text-blue-400" : isComplete ? "text-emerald-400" : "text-white/30"} />
                              <span className={`text-[10px] ${isActive ? "text-blue-300" : isComplete ? "text-emerald-300" : "text-white/30"}`}>
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer - Actions */}
              <div className="px-6 py-4 border-t border-white/[0.06] flex items-center gap-3">
                <button
                  onClick={() => onAcceptRisk(localBuilding.id)}
                  className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition-colors"
                >
                  Accept Risk
                </button>
                
                <button
                  onClick={handleRerunPipeline}
                  disabled={isPipelineRunning}
                  className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    isPipelineRunning
                      ? "border-blue-500/50 text-blue-400 cursor-wait"
                      : "border-white/20 text-white/70 hover:bg-white/[0.06]"
                  }`}
                >
                  {isPipelineRunning ? "Running..." : "Rerun Pipeline"}
                </button>

                <div className="flex-1" />

                <button
                  onClick={() => onRefer(localBuilding.id, "senior")}
                  className="px-3 py-2 text-sm text-white/50 hover:text-white/70 transition-colors"
                >
                  Refer
                </button>

                <button
                  onClick={() => onDecline(localBuilding.id)}
                  className="px-3 py-2 text-sm text-white/40 hover:text-red-400 transition-colors"
                >
                  Decline
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
