import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { X, Check, Building2, AlertTriangle, Clock, Eye, FileText, Shield, ClipboardList, Flag, ChevronDown, UserCheck, Users, Scale } from "lucide-react";
import type { Building, RiskTier, Signal } from "../types";

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

const SOURCE_ICONS: Record<string, typeof Eye> = {
  "Vision Model": Eye,
  "Council Rates": FileText,
  "Companies House": Building2,
  "Street View": Eye,
  "Building Survey": Shield,
  "Fire Service": AlertTriangle,
  "Health & Safety": Shield,
  "Council Planning": FileText,
  "Licensing Board": FileText,
  "Flood Risk": AlertTriangle,
  "Environmental Health": Shield,
  "Routine Check": Check,
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function daysBetween(iso1: string, iso2: string): number {
  const d1 = new Date(iso1);
  const d2 = new Date(iso2);
  return Math.round(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

interface BuildingModalProps {
  building: Building | null;
  isOpen: boolean;
  onClose: () => void;
  onAcceptRisk: (id: string) => void;
  onDecline: (id: string) => void;
  onRefer: (id: string, target: string) => void;
  onRequestSurvey: (id: string) => void;
  onFlagForRenewal: (id: string) => void;
}

export default function BuildingModal({
  building,
  isOpen,
  onClose,
  onAcceptRisk,
  onDecline,
  onRefer,
  onRequestSurvey,
  onFlagForRenewal,
}: BuildingModalProps) {
  const [showReferMenu, setShowReferMenu] = useState(false);
  if (!building) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            onClick={onClose}
          />

          {/* Modal — centered with flexbox, NOT transform */}
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <motion.div
              className="bg-[#0f0f10] rounded-2xl shadow-2xl overflow-hidden border border-white/[0.08] pointer-events-auto w-[85vw] max-w-[1050px]"
              style={{ maxHeight: "80vh" }}
              initial={{ opacity: 0, scale: 0.85, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 25,
                mass: 1.2,
              }}
            >
              <div className="flex flex-col" style={{ maxHeight: "80vh" }}>
                {/* Header */}
                <motion.div
                  className="px-8 py-6 border-b border-white/[0.06] flex items-start justify-between shrink-0"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Building2 size={20} className="text-white/40" />
                      <h2 className="text-[22px] font-semibold text-white">{building.address}</h2>
                    </div>
                    <div className="flex items-center gap-3 text-[13px]">
                      <span className="text-white/50">{building.tenant}</span>
                      <span className="text-white/20">·</span>
                      <span className="text-white/50">{building.propertyType}</span>
                      {building.listed && (
                        <>
                          <span className="text-white/20">·</span>
                          <span className="text-[11px] font-medium text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                            Listed Building
                          </span>
                        </>
                      )}
                      {building.useMismatch && (
                        <>
                          <span className="text-white/20">·</span>
                          <span className="text-[11px] font-medium text-red-300 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 flex items-center gap-1">
                            <AlertTriangle size={10} />
                            Use Mismatch
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-white/40 hover:text-white p-2 hover:bg-white/[0.06] rounded-lg transition-all"
                  >
                    <X size={20} />
                  </button>
                </motion.div>

                {/* Content — two column layout */}
                <div className="flex-1 overflow-auto min-h-0">
                  <div className="flex min-h-0">
                    {/* Left column — Risk + Classification */}
                    <motion.div
                      className="w-[340px] shrink-0 border-r border-white/[0.06] p-8"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25, duration: 0.45 }}
                    >
                      {/* Risk gauge */}
                      <div className="flex flex-col items-center mb-8">
                        <div className="relative w-44 h-44 flex items-center justify-center mb-4">
                          <svg className="absolute inset-0 w-full h-full -rotate-90">
                            <circle cx="88" cy="88" r="76" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                            <motion.circle
                              cx="88"
                              cy="88"
                              r="76"
                              fill="none"
                              stroke={RISK_COLORS[building.riskTier]}
                              strokeWidth="10"
                              strokeLinecap="round"
                              strokeDasharray={`${(building.riskScore / 100) * 478} 478`}
                              initial={{ strokeDasharray: "0 478" }}
                              animate={{ strokeDasharray: `${(building.riskScore / 100) * 478} 478` }}
                              transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                            />
                          </svg>
                          <div className="text-center">
                            <motion.div
                              className="text-[52px] font-bold font-mono leading-none"
                              style={{ color: RISK_COLORS[building.riskTier] }}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.4 }}
                            >
                              {building.riskScore}
                            </motion.div>
                            <div className="text-[11px] text-white/40 uppercase tracking-wider mt-1">Risk Score</div>
                          </div>
                        </div>

                        <span
                          className="px-4 py-1.5 rounded-full text-[12px] font-semibold border"
                          style={{
                            color: RISK_COLORS[building.riskTier],
                            backgroundColor: `${RISK_COLORS[building.riskTier]}15`,
                            borderColor: `${RISK_COLORS[building.riskTier]}30`
                          }}
                        >
                          {RISK_LABELS[building.riskTier]} Risk
                        </span>
                      </div>

                      {/* Use Classification */}
                      <div className="mb-6">
                        <h3 className="text-[11px] text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <FileText size={12} />
                          Use Classification
                        </h3>
                        <div className="space-y-3">
                          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                            <div className="text-[11px] text-white/40 mb-1.5">Registered</div>
                            <div className="text-[14px] font-medium text-white/90">{building.registeredUse}</div>
                          </div>
                          <div
                            className={`rounded-xl p-4 border ${
                              building.useMismatch
                                ? "bg-red-500/[0.06] border-red-500/20"
                                : "bg-white/[0.03] border-white/[0.06]"
                            }`}
                          >
                            <div className="text-[11px] text-white/40 mb-1.5">Detected</div>
                            <div className={`text-[14px] font-medium ${building.useMismatch ? "text-red-400" : "text-white/90"}`}>
                              {building.detectedUse}
                            </div>
                            {building.useMismatch && (
                              <div className="flex items-center gap-1.5 mt-2.5 text-[11px] text-red-400 font-medium">
                                <AlertTriangle size={12} />
                                Classification mismatch — investigate
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quick stats */}
                      <div>
                        <h3 className="text-[11px] text-white/40 uppercase tracking-wider mb-3">Summary</h3>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.06]">
                            <div className="text-[20px] font-semibold text-white font-mono">{building.signals.length}</div>
                            <div className="text-[10px] text-white/40">Signals</div>
                          </div>
                          <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.06]">
                            <div className="text-[20px] font-semibold text-white font-mono">
                              {building.signals.filter(s => s.severity === "critical" || s.severity === "high").length}
                            </div>
                            <div className="text-[10px] text-white/40">High / Critical</div>
                          </div>
                          <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.06]">
                            <div className="text-[14px] font-semibold text-white font-mono">
                              {formatDate(building.signals[0]?.timestamp || building.lastUpdated).split(' ').slice(0, 2).join(' ')}
                            </div>
                            <div className="text-[10px] text-white/40">Latest signal</div>
                          </div>
                          <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.06]">
                            <div className="text-[14px] font-semibold text-white font-mono">
                              {building.signals.length >= 2
                                ? `${daysBetween(building.signals[0].timestamp, building.signals[building.signals.length - 1].timestamp)}d`
                                : "—"
                              }
                            </div>
                            <div className="text-[10px] text-white/40">Span</div>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* Right column — Full visual timeline */}
                    <motion.div
                      className="flex-1 p-8 overflow-auto"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3, duration: 0.45 }}
                    >
                      <h3 className="text-[11px] text-white/40 uppercase tracking-wider mb-6 flex items-center gap-2">
                        <Clock size={12} />
                        Signal Timeline
                      </h3>

                      <div className="relative">
                        {/* Continuous timeline line */}
                        <div className="absolute left-[19px] top-3 bottom-0 w-px bg-white/[0.06]" />

                        {building.signals.map((signal: Signal, i: number) => {
                          const sourceStyle = SOURCE_COLORS[signal.source] || "text-white/50 bg-white/5 border-white/10";
                          const IconComponent = SOURCE_ICONS[signal.source] || FileText;
                          const isFirst = i === 0;
                          const dayGap = i > 0
                            ? daysBetween(building.signals[i - 1].timestamp, signal.timestamp)
                            : 0;

                          return (
                            <motion.div
                              key={signal.id}
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.25 + i * 0.08 }}
                            >
                              {/* Day gap indicator */}
                              {dayGap > 0 && (
                                <div className="flex items-center gap-3 ml-[11px] py-2">
                                  <div className="w-[17px] flex justify-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/[0.08]" />
                                  </div>
                                  <span className="text-[10px] text-white/20 font-mono">{dayGap}d gap</span>
                                </div>
                              )}

                              <div className="flex gap-4 relative">
                                {/* Timeline node */}
                                <div className="flex flex-col items-center shrink-0 w-[38px]">
                                  <div
                                    className={`w-[38px] h-[38px] rounded-xl flex items-center justify-center border ${
                                      isFirst ? 'ring-2 ring-offset-2 ring-offset-[#0f0f10]' : ''
                                    }`}
                                    style={{
                                      backgroundColor: `${RISK_COLORS[signal.severity]}15`,
                                      borderColor: `${RISK_COLORS[signal.severity]}30`,
                                      ...(isFirst ? { ringColor: `${RISK_COLORS[signal.severity]}40` } : {}),
                                    }}
                                  >
                                    <IconComponent size={16} style={{ color: RISK_COLORS[signal.severity] }} />
                                  </div>
                                </div>

                                {/* Content card */}
                                <div className={`flex-1 mb-5 rounded-xl p-4 border transition-colors hover:bg-white/[0.03] ${
                                  signal.severity === "critical"
                                    ? "bg-red-500/[0.04] border-red-500/15"
                                    : "bg-white/[0.02] border-white/[0.06]"
                                }`}>
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${sourceStyle}`}>
                                        {signal.source}
                                      </span>
                                      <span
                                        className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                                        style={{
                                          color: RISK_COLORS[signal.severity],
                                          backgroundColor: `${RISK_COLORS[signal.severity]}15`,
                                        }}
                                      >
                                        {signal.severity.charAt(0).toUpperCase() + signal.severity.slice(1)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-white/30 font-mono">
                                      <span>{formatDate(signal.timestamp)}</span>
                                      <span className="text-white/15">·</span>
                                      <span>{formatTime(signal.timestamp)}</span>
                                    </div>
                                  </div>
                                  <p className="text-[13px] text-white/75 leading-relaxed">
                                    {signal.description}
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  </div>
                </div>

                {/* Footer — underwriting decisions */}
                <motion.div
                  className="px-8 py-4 border-t border-white/[0.06] bg-[#0f0f10] shrink-0"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Accept Risk — primary */}
                    <button
                      onClick={() => onAcceptRisk(building.id)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white text-[13px] font-semibold rounded-xl hover:bg-emerald-400 transition-colors"
                    >
                      <Check size={15} />
                      Accept Risk
                    </button>

                    {/* Refer — dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setShowReferMenu(!showReferMenu)}
                        className="flex items-center gap-2 px-4 py-2.5 text-white/70 text-[13px] font-medium border border-white/[0.1] rounded-xl hover:bg-white/[0.04] transition-colors"
                      >
                        <Users size={14} />
                        Refer
                        <ChevronDown size={12} className={`transition-transform ${showReferMenu ? 'rotate-180' : ''}`} />
                      </button>
                      {showReferMenu && (
                        <motion.div
                          className="absolute bottom-full left-0 mb-2 w-[220px] bg-[#1a1a1b] border border-white/[0.1] rounded-xl shadow-2xl overflow-hidden z-10"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <button
                            onClick={() => { onRefer(building.id, "senior"); setShowReferMenu(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-white/70 hover:bg-white/[0.06] transition-colors text-left"
                          >
                            <UserCheck size={14} className="text-amber-400 shrink-0" />
                            <div>
                              <div className="font-medium text-white/90">Senior Underwriter</div>
                              <div className="text-[11px] text-white/40">Exceeds authority limit</div>
                            </div>
                          </button>
                          <button
                            onClick={() => { onRefer(building.id, "technical"); setShowReferMenu(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-white/70 hover:bg-white/[0.06] transition-colors text-left border-t border-white/[0.06]"
                          >
                            <Shield size={14} className="text-blue-400 shrink-0" />
                            <div>
                              <div className="font-medium text-white/90">Technical Specialist</div>
                              <div className="text-[11px] text-white/40">Listed building, flood, etc.</div>
                            </div>
                          </button>
                          <button
                            onClick={() => { onRefer(building.id, "claims"); setShowReferMenu(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-white/70 hover:bg-white/[0.06] transition-colors text-left border-t border-white/[0.06]"
                          >
                            <Scale size={14} className="text-red-400 shrink-0" />
                            <div>
                              <div className="font-medium text-white/90">Claims Team</div>
                              <div className="text-[11px] text-white/40">Potential existing claim</div>
                            </div>
                          </button>
                        </motion.div>
                      )}
                    </div>

                    {/* Request Survey */}
                    <button
                      onClick={() => onRequestSurvey(building.id)}
                      className="flex items-center gap-2 px-4 py-2.5 text-white/70 text-[13px] font-medium border border-white/[0.1] rounded-xl hover:bg-white/[0.04] transition-colors"
                    >
                      <ClipboardList size={14} />
                      Request Survey
                    </button>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Flag for Renewal */}
                    <button
                      onClick={() => onFlagForRenewal(building.id)}
                      className="flex items-center gap-2 px-3 py-2.5 text-amber-400/70 text-[12px] font-medium rounded-lg hover:bg-amber-500/[0.06] transition-colors"
                    >
                      <Flag size={13} />
                      Flag for Renewal
                    </button>

                    {/* Decline */}
                    <button
                      onClick={() => onDecline(building.id)}
                      className="flex items-center gap-2 px-4 py-2.5 text-white/40 text-[12px] font-medium rounded-lg hover:bg-red-500/[0.06] hover:text-red-400 transition-colors"
                    >
                      <X size={14} />
                      Decline
                    </button>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
