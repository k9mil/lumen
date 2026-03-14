import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { X, Eye, Target, Binary, Brain, Sparkles, GitBranch, ChevronDown, FileText } from "lucide-react";
import type { Building, RiskTier, EvidenceItem, EvidenceResponse } from "../types";
import { refreshBuilding, fetchDashboardBuildings, fetchEvidence } from "../api/client";

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

interface PipelineStage {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  duration: number;
  color: string;
  branches?: Array<{ label: string; subLabel: string }>;
  final?: boolean;
}

// New tree-structured pipeline stages
const PIPELINE_TREE: Record<string, PipelineStage> = {
  discovery: {
    id: "discovery",
    label: "Location Discovery",
    description: "Mapping coordinates & spatial context",
    icon: Target,
    duration: 2000,
    color: "#6366f1",
  },
  dataCollection: {
    id: "dataCollection",
    label: "Intelligence Gathering",
    description: "Corporate records, licensing, business profiles",
    icon: Binary,
    duration: 4000,
    color: "#8b5cf6",
    branches: [
      { label: "Corporate", subLabel: "Registry lookup" },
      { label: "Licensing", subLabel: "Permits & authorizations" },
      { label: "Profile", subLabel: "Public data" },
    ],
  },
  visualAnalysis: {
    id: "visualAnalysis",
    label: "Visual Intelligence",
    description: "Street-level imagery & pattern recognition",
    icon: Eye,
    duration: 6000,
    color: "#ec4899",
    branches: [
      { label: "Capture", subLabel: "360° imagery" },
      { label: "Analysis", subLabel: "Neural classification" },
    ],
  },
  synthesis: {
    id: "synthesis",
    label: "Risk Synthesis",
    description: "Weighted scoring & threat assessment",
    icon: Brain,
    duration: 3000,
    color: "#10b981",
    final: true,
  },
};

const STAGE_ORDER: Array<keyof typeof PIPELINE_TREE> = ["discovery", "dataCollection", "visualAnalysis", "synthesis"];

interface BuildingModalProps {
  building: Building | null;
  isOpen: boolean;
  onClose: () => void;
  onAcceptRisk: (id: string) => void;
  onDecline: (id: string) => void;
  onRefer: (id: string, target: string) => void;
  onBuildingUpdate?: (building: Building) => void;
}

function StreetViewGallery({ buildingId }: { buildingId: string }) {
  const directions = ["north", "east", "south", "west"];
  return (
    <div>
      <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Street View</div>
      <div className="grid grid-cols-4 gap-1.5">
        {directions.map((dir) => (
          <div key={dir} className="relative group">
            <img
              src={`/api/buildings/${buildingId}/streetview?direction=${dir}`}
              alt={`Street view ${dir}`}
              className="w-full aspect-[4/3] object-cover rounded-md bg-white/[0.03]"
              loading="lazy"
            />
            <span className="absolute bottom-1 left-1 text-[9px] text-white/70 bg-black/60 px-1 rounded uppercase">
              {dir}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompanyCard({ company }: { company: Record<string, unknown> }) {
  const status = String(company.company_status ?? "").toLowerCase();
  const isDissolved = status === "dissolved" || status === "liquidation" || status === "administration";
  return (
    <div className={`p-2 rounded-md border ${isDissolved ? "border-red-500/20 bg-red-500/[0.04]" : "border-white/[0.06] bg-white/[0.02]"}`}>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-white/80 font-medium">{String(company.company_name ?? "")}</span>
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${isDissolved ? "text-red-400 bg-red-500/15" : "text-emerald-400 bg-emerald-500/15"}`}>
          {String(company.company_status ?? "")}
        </span>
      </div>
      {(company.sic_codes as string[] | undefined)?.length ? (
        <div className="mt-1 flex gap-1 flex-wrap">
          {(company.sic_codes as string[]).map((sic, i) => (
            <span key={i} className="text-[9px] text-white/50 bg-white/[0.06] px-1.5 py-0.5 rounded">{sic}</span>
          ))}
        </div>
      ) : null}
      {company.date_of_creation && (
        <div className="text-[10px] text-white/30 mt-1">Incorporated {String(company.date_of_creation)}</div>
      )}
    </div>
  );
}

function ReviewSnippet({ text }: { text: string }) {
  return (
    <div className="p-2 rounded-md border border-white/[0.06] bg-white/[0.02]">
      <p className="text-[11px] text-white/60 italic leading-relaxed">&ldquo;{text}&rdquo;</p>
    </div>
  );
}

function LicensedPremise({ premise }: { premise: Record<string, unknown> }) {
  return (
    <div className="p-2 rounded-md border border-amber-500/20 bg-amber-500/[0.04]">
      <span className="text-[11px] text-white/80 font-medium">{String(premise.name ?? "")}</span>
      {premise.distance_m != null && (
        <span className="text-[10px] text-white/40 ml-2">{Number(premise.distance_m).toFixed(0)}m away</span>
      )}
    </div>
  );
}

function EvidenceDetail({
  data,
  buildingId,
  signalType,
  snapshot,
}: {
  data: Record<string, unknown>;
  buildingId: string;
  signalType: string;
  snapshot: EvidenceResponse["snapshot"] | null;
}) {
  const companies = (snapshot?.companies_house_data as Record<string, unknown> | null)?.companies as Record<string, unknown>[] | undefined;
  const places = snapshot?.places_data as Record<string, unknown> | null;
  const reviews = (places?.review_snippets ?? []) as string[];
  const vision = snapshot?.street_view_analysis as Record<string, unknown> | null;
  const licensing = snapshot?.licensing_data as Record<string, unknown> | null;
  const licensedPremises = (licensing?.premises ?? []) as Record<string, unknown>[];

  return (
    <div className="space-y-3">
      {/* Street View images — for vision-related signals */}
      {signalType === "cv_classification" && <StreetViewGallery buildingId={buildingId} />}

      {/* Vision analysis summary — for vision signals */}
      {signalType === "cv_classification" && vision && (
        <div>
          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Vision Analysis</div>
          <div className="space-y-1">
            <div className="flex gap-2">
              <span className="text-[11px] text-white/40 min-w-[80px]">Detected</span>
              <span className="text-[11px] text-white/70">{String(vision.occupier_type ?? "—")}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-[11px] text-white/40 min-w-[80px]">Confidence</span>
              <span className="text-[11px] text-white/70">{Math.round(Number(vision.confidence ?? 0) * 100)}%</span>
            </div>
            {(vision.signage_text as string[] | undefined)?.length ? (
              <div className="flex gap-2">
                <span className="text-[11px] text-white/40 min-w-[80px]">Signage</span>
                <div className="flex flex-wrap gap-1">
                  {(vision.signage_text as string[]).map((t, i) => (
                    <span key={i} className="text-[10px] text-white/60 bg-white/[0.06] px-1.5 py-0.5 rounded">{t}</span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Companies House — for SIC mismatch or dissolved company signals */}
      {signalType === "sic_mismatch" && companies && companies.length > 0 && (
        <div>
          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Companies House Records</div>
          <div className="space-y-1.5">
            {companies.slice(0, 5).map((c, i) => <CompanyCard key={i} company={c} />)}
          </div>
        </div>
      )}

      {/* Reviews — for keyword hit signals */}
      {signalType === "keyword_hit" && reviews.length > 0 && (
        <div>
          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Review Excerpts</div>
          <div className="space-y-1.5">
            {reviews.slice(0, 3).map((r, i) => <ReviewSnippet key={i} text={r} />)}
          </div>
        </div>
      )}

      {/* Keyword source — show where keywords were found */}
      {signalType === "keyword_hit" && (
        <div>
          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Matched Keywords</div>
          <div className="flex flex-wrap gap-1">
            {((data.keywords ?? []) as string[]).map((k, i) => (
              <span key={i} className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">{k}</span>
            ))}
          </div>
        </div>
      )}

      {/* Licensed premises — for licensing signals */}
      {signalType === "licensing" && licensedPremises.length > 0 && (
        <div>
          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Licensed Premises Nearby</div>
          <div className="space-y-1.5">
            {licensedPremises.slice(0, 5).map((p, i) => <LicensedPremise key={i} premise={p} />)}
          </div>
        </div>
      )}

      {/* Places data — rating & reviews when available */}
      {places && (places.rating || places.review_count) && (
        <div>
          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Google Places</div>
          <div className="flex gap-4">
            {places.rating && (
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-amber-400">★ {String(places.rating)}</span>
                <span className="text-[10px] text-white/30">({String(places.review_count ?? 0)} reviews)</span>
              </div>
            )}
            {places.trading_name && (
              <div className="text-[11px] text-white/50">Trading as: {String(places.trading_name)}</div>
            )}
          </div>
        </div>
      )}

      {/* Fallback: raw key-value data for anything not covered above */}
      {Object.keys(data).length > 0 && !["keywords", "premises"].includes(Object.keys(data)[0]) && (
        <div>
          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Raw Data</div>
          <div className="space-y-1">
            {Object.entries(data).map(([key, value]) => {
              if (key === "keywords" || key === "premises") return null;
              const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
              return (
                <div key={key} className="flex gap-2">
                  <span className="text-[11px] text-white/40 shrink-0 min-w-[80px]">{label}</span>
                  <span className="text-[11px] text-white/70">
                    {Array.isArray(value)
                      ? value.length === 0
                        ? "—"
                        : value.map((v, i) => (
                            <span key={i} className="inline-block mr-1 mb-1 px-1.5 py-0.5 bg-white/[0.06] rounded text-[10px]">
                              {typeof v === "object" ? JSON.stringify(v) : String(v)}
                            </span>
                          ))
                      : typeof value === "object" && value !== null
                      ? JSON.stringify(value)
                      : String(value ?? "—")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
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
  const [evidence, setEvidence] = useState<EvidenceResponse | null>(null);
  const [expandedSignal, setExpandedSignal] = useState<string | null>(null);

  useEffect(() => {
    setLocalBuilding(building);
    setExpandedSignal(null);
    if (building) {
      fetchEvidence(building.id).then(setEvidence);
    }
  }, [building]);

  const handleRerunPipeline = useCallback(async () => {
    if (!localBuilding) return;
    
    setIsPipelineRunning(true);
    setPipelineStep(0);
    
    try {
      await refreshBuilding(localBuilding.id);
      
      // Animate through tree stages
      for (let i = 0; i < STAGE_ORDER.length; i++) {
        setPipelineStep(i);
        const stage = PIPELINE_TREE[STAGE_ORDER[i]];
        await new Promise(resolve => setTimeout(resolve, stage.duration));
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      const updatedBuildings = await fetchDashboardBuildings();
      const updated = updatedBuildings.find(b => b.id === localBuilding.id);
      if (updated) {
        setLocalBuilding(updated);
        onBuildingUpdate?.(updated);
      }
      fetchEvidence(localBuilding.id).then(setEvidence);
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
                    <div className="text-sm text-white/90">{localBuilding.registeredUse || <span className="text-white/30 italic">Not specified</span>}</div>
                  </div>
                  <div className={`rounded-xl p-4 border ${localBuilding.useMismatch ? "bg-red-500/[0.04] border-red-500/20" : "bg-white/[0.03] border-white/[0.06]"}`}>
                    <div className="text-xs text-white/40 mb-1">Detected Use</div>
                    <div className={`text-sm ${localBuilding.useMismatch ? "text-red-400" : "text-white/90"}`}>
                      {localBuilding.detectedUse || <span className="text-white/30 italic">Pending analysis</span>}
                    </div>
                  </div>
                </div>

                {/* Signals Timeline */}
                {localBuilding.signals.length > 0 && (
                  <div>
                    <h3 className="text-xs text-white/40 uppercase tracking-wider mb-4">Signal Timeline</h3>
                    <div className="relative max-h-[300px] overflow-y-auto pr-2">
                      {/* Timeline line */}
                      <div className="absolute left-[15px] top-3 bottom-3 w-px bg-white/[0.08]" />

                      <div className="space-y-1">
                        {localBuilding.signals.map((signal, index) => {
                          const isLatest = index === 0;
                          const isExpanded = expandedSignal === signal.id;
                          const evidenceItem = evidence?.evidence_items.find(
                            (e) => `s${e.id}` === signal.id
                          );
                          const hasEvidence = !!evidenceItem?.raw_data;
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
                                <button
                                  className="w-full text-left group"
                                  onClick={() => hasEvidence && setExpandedSignal(isExpanded ? null : signal.id)}
                                >
                                  <div className="flex items-baseline gap-2 mb-1">
                                    <span className="text-xs text-white/70">{signal.source}</span>
                                    <span className="text-[10px] text-white/30">
                                      {new Date(signal.timestamp).toLocaleDateString()}
                                    </span>
                                    {hasEvidence && (
                                      <ChevronDown
                                        size={12}
                                        className={`text-white/30 group-hover:text-white/60 transition-all ${isExpanded ? "rotate-180" : ""}`}
                                      />
                                    )}
                                  </div>
                                  <p className="text-sm text-white/60 leading-relaxed">{signal.description}</p>
                                </button>

                                {/* Evidence Detail Panel */}
                                <AnimatePresence>
                                  {isExpanded && evidenceItem?.raw_data && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      exit={{ opacity: 0, height: 0 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="mt-2 p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                                        <div className="flex items-center gap-1.5 mb-2">
                                          <FileText size={11} className="text-white/40" />
                                          <span className="text-[10px] text-white/40 uppercase tracking-wider">Evidence</span>
                                        </div>
                                        <EvidenceDetail
                                          data={evidenceItem.raw_data}
                                          buildingId={localBuilding.id}
                                          signalType={evidenceItem.signal_type}
                                          snapshot={evidence?.snapshot ?? null}
                                        />
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
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
                      className="mt-6 p-5 bg-[#0c0c0d] rounded-xl border border-white/[0.06] overflow-hidden"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                          <Sparkles size={14} className="text-white/40" />
                          <span className="text-sm font-medium text-white/70">Intelligence Pipeline Active</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-xs text-white/40 font-mono">
                            {Math.round(((pipelineStep + 1) / STAGE_ORDER.length) * 100)}%
                          </span>
                        </div>
                      </div>

                      {/* Tree Visualization */}
                      <div className="relative">
                        {/* Connection Lines */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                          {/* Vertical backbone */}
                          <motion.line
                            x1="20"
                            y1="28"
                            x2="20"
                            y2={28 + (STAGE_ORDER.length - 1) * 80}
                            stroke="rgba(255,255,255,0.06)"
                            strokeWidth="2"
                          />
                          {/* Active progress line */}
                          <motion.line
                            x1="20"
                            y1="28"
                            x2="20"
                            y2={28 + pipelineStep * 80 + (pipelineStep === STAGE_ORDER.length - 1 ? 0 : 40)}
                            stroke="url(#gradient)"
                            strokeWidth="2"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: (pipelineStep + 1) / STAGE_ORDER.length }}
                            transition={{ duration: 0.5 }}
                          />
                          <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#6366f1" />
                              <stop offset="50%" stopColor="#8b5cf6" />
                              <stop offset="100%" stopColor="#10b981" />
                            </linearGradient>
                          </defs>
                        </svg>

                        {/* Stages */}
                        <div className="relative z-10 space-y-2">
                          {STAGE_ORDER.map((stageId, index) => {
                            const stage = PIPELINE_TREE[stageId];
                            const Icon = stage.icon;
                            const isActive = index === pipelineStep;
                            const isComplete = index < pipelineStep;

                            return (
                              <motion.div
                                key={stageId}
                                className="flex items-start gap-4"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                              >
                                {/* Node */}
                                <div className="relative flex flex-col items-center shrink-0 w-10">
                                  <motion.div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                                      isActive
                                        ? "border-white/30 bg-[#111]"
                                        : isComplete
                                        ? "border-white/10 bg-white/[0.05]"
                                        : "border-white/[0.04] bg-transparent"
                                    }`}
                                    animate={
                                      isActive
                                        ? { scale: [1, 1.1, 1], boxShadow: ["0 0 0 0 rgba(255,255,255,0)", "0 0 20px 4px rgba(255,255,255,0.1)", "0 0 0 0 rgba(255,255,255,0)"] }
                                        : {}
                                    }
                                    transition={isActive ? { duration: 2, repeat: Infinity } : {}}
                                  >
                                    <Icon
                                      size={16}
                                      style={{ color: isActive ? stage.color : isComplete ? "#10b981" : "rgba(255,255,255,0.2)" }}
                                    />
                                  </motion.div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 pt-1.5 pb-4">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span
                                      className={`text-sm font-medium transition-colors ${
                                        isActive ? "text-white" : isComplete ? "text-white/60" : "text-white/30"
                                      }`}
                                    >
                                      {stage.label}
                                    </span>
                                    {isActive && (
                                      <motion.span
                                        className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50"
                                        animate={{ opacity: [0.5, 1, 0.5] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                      >
                                        Analyzing...
                                      </motion.span>
                                    )}
                                    {isComplete && (
                                      <span className="text-[10px] text-emerald-400">Complete</span>
                                    )}
                                  </div>
                                  <p className={`text-xs transition-colors ${isActive ? "text-white/50" : "text-white/30"}`}>
                                    {stage.description}
                                  </p>

                                  {/* Branching sub-steps */}
                                  {stage.branches && (isActive || isComplete) && (
                                    <motion.div
                                      className="flex flex-wrap gap-2 mt-3"
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      transition={{ delay: 0.2 }}
                                    >
                                      {stage.branches.map((branch, bIndex) => (
                                        <motion.div
                                          key={branch.label}
                                          className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${
                                            isComplete
                                              ? "border-emerald-500/20 bg-emerald-500/5"
                                              : isActive
                                              ? "border-white/10 bg-white/[0.03]"
                                              : "border-white/[0.04]"
                                          }`}
                                          initial={{ opacity: 0, scale: 0.9 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          transition={{ delay: bIndex * 0.1 }}
                                        >
                                          <GitBranch size={10} className={isComplete ? "text-emerald-400" : "text-white/30"} />
                                          <span className={`text-[10px] ${isComplete ? "text-emerald-300" : "text-white/40"}`}>
                                            {branch.label}
                                          </span>
                                        </motion.div>
                                      ))}
                                    </motion.div>
                                  )}

                                  {/* Final output indicator */}
                                  {stage.final && isActive && (
                                    <motion.div
                                      className="mt-3 flex items-center gap-2"
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ delay: 0.3 }}
                                    >
                                      <div className="flex gap-0.5">
                                        {[0, 1, 2].map((i) => (
                                          <motion.div
                                            key={i}
                                            className="w-1 h-3 rounded-full bg-emerald-500"
                                            animate={{ height: [12, 20, 12] }}
                                            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                                          />
                                        ))}
                                      </div>
                                      <span className="text-xs text-emerald-400">Synthesizing risk profile...</span>
                                    </motion.div>
                                  )}
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
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
