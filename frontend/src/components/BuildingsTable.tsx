import { motion } from "framer-motion";
import { FolderOpen, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import type { Building } from "../types";

const RISK_COLORS: Record<string, string> = {
  critical: "text-red-400",
  high: "text-orange-400",
  medium: "text-blue-400",
  low: "text-emerald-400",
};

const RISK_DOTS: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-blue-500",
  low: "bg-emerald-500",
};



function TrendIndicator({ trend, tier }: { trend: string; tier: string }) {
  if (trend === "up") {
    return <ArrowUpRight size={14} className={`${RISK_COLORS[tier]} inline ml-1`} />;
  }
  if (trend === "down") {
    return <ArrowDownRight size={14} className="text-emerald-400 inline ml-1" />;
  }
  return <Minus size={14} className="inline ml-1 text-white/30" />;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const time = d.toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) return time;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return `Yesterday`;

  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

interface BuildingsTableProps {
  buildings: Building[];
  onSelectBuilding: (id: string) => void;
  selectedId: string | null;
}

export default function BuildingsTable({
  buildings,
  onSelectBuilding,
  selectedId,
}: BuildingsTableProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.03,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 },
  };

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-[#0a0a0b] scrollbar-thin">
      {/* Table header */}
      <div className="flex items-center gap-4 px-6 py-3 text-[11px] font-medium text-white/40 uppercase tracking-wide border-b border-white/[0.06] sticky top-0 bg-[#0a0a0b]/95 backdrop-blur-sm z-10">
        <div className="w-[200px]">Property</div>
        <div className="w-[180px]">Tenant</div>
        <div className="w-[80px]">Risk</div>
        <div className="w-[100px]">Type</div>
        <div className="w-[100px]">Status</div>
        <div className="flex-1 text-right">Updated</div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {buildings.map((b) => {
          const isSelected = selectedId === b.id;

          return (
            <motion.div
              key={b.id}
              variants={itemVariants}
              onClick={() => onSelectBuilding(b.id)}
              whileHover={{ 
                backgroundColor: "rgba(255,255,255,0.05)",
                x: 4,
                transition: { duration: 0.2 }
              }}
              whileTap={{ scale: 0.995 }}
              className={`
                flex items-center gap-4 px-6 py-3 cursor-pointer transition-all border-b border-white/[0.04]
                ${isSelected ? "bg-blue-500/[0.12] border-l-2 border-l-blue-500" : "border-l-2 border-l-transparent"}
              `}
            >
              <div className="w-[200px]">
                <div className="flex items-center gap-2">
                  <motion.span 
                    className="text-[13px] font-medium text-white/90 truncate"
                    animate={isSelected ? { color: "#60a5fa" } : {}}
                  >
                    {b.address.split(",")[0]}
                  </motion.span>
                  {b.listed && (
                    <motion.span 
                      className="shrink-0 text-[9px] font-medium text-indigo-300 bg-indigo-500/15 px-1.5 py-0.5 rounded border border-indigo-500/20"
                      whileHover={{ scale: 1.1 }}
                    >
                      Listed
                    </motion.span>
                  )}
                  {b.status === "needs_review" && (
                    <motion.span 
                      className="shrink-0 text-[9px] font-medium text-red-300 bg-red-500/15 px-1.5 py-0.5 rounded border border-red-500/20"
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      Review
                    </motion.span>
                  )}
                </div>
              </div>

              <div className="w-[180px]">
                <span className="text-[13px] text-white/60 truncate block">
                  {b.tenant}
                </span>
              </div>

              <div className="w-[80px]">
                <motion.div 
                  className="flex items-center gap-2"
                  whileHover={{ scale: 1.1 }}
                >
                  <motion.span 
                    className={`w-2.5 h-2.5 rounded-full ${RISK_DOTS[b.riskTier]}`}
                    animate={b.riskTier === "critical" || b.riskTier === "high" ? {
                      scale: [1, 1.3, 1],
                      boxShadow: [
                        "0 0 0px rgba(239,68,68,0)",
                        "0 0 10px rgba(239,68,68,0.5)",
                        "0 0 0px rgba(239,68,68,0)"
                      ]
                    } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span className={`font-mono text-[13px] font-medium ${RISK_COLORS[b.riskTier]}`}>
                    {b.riskScore}
                  </span>
                  <TrendIndicator trend={b.riskTrend} tier={b.riskTier} />
                </motion.div>
              </div>

              <div className="w-[100px]">
                <span className="text-[13px] text-white/70">{b.propertyType}</span>
              </div>

              <div className="w-[100px]">
                <motion.span
                  className={`
                    text-[12px] font-medium px-2 py-1 rounded-full
                    ${b.status === "needs_review" ? "text-amber-400 bg-amber-500/10 border border-amber-500/20" : ""}
                    ${b.status === "cleared" ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" : ""}
                    ${b.status === "monitoring" ? "text-white/50 bg-white/5 border border-white/10" : ""}
                  `}
                  whileHover={{ scale: 1.05 }}
                >
                  {b.status === "needs_review" && "Needs Review"}
                  {b.status === "cleared" && "Cleared"}
                  {b.status === "monitoring" && "Monitoring"}
                </motion.span>
              </div>

              <div className="flex-1 text-right">
                <span className="text-[12px] text-white/40 font-mono">
                  {formatTimestamp(b.lastUpdated)}
                </span>
              </div>
            </motion.div>
          );
        })}

        {buildings.length === 0 && (
          <motion.div 
            className="flex flex-col items-center justify-center py-16 text-white/40"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <FolderOpen size={48} strokeWidth={1} className="mb-4 opacity-50" />
            </motion.div>
            <span className="text-[14px]">No properties match your filters</span>
            <span className="text-[12px] text-white/20 mt-2">Try adjusting your search criteria</span>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
