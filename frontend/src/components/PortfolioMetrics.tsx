import { motion } from "framer-motion";
import type { Building } from "../types";
import { TrendingUp, AlertCircle, Shield, BuildingIcon } from "lucide-react";

interface PortfolioMetricsProps {
  buildings: Building[];
}

export default function PortfolioMetrics({ buildings }: PortfolioMetricsProps) {
  const total = buildings.length;
  const needsReview = buildings.filter((b) => b.status === "needs_review").length;
  const cleared = buildings.filter((b) => b.status === "cleared").length;
  const flagged = total - cleared;
  const avgRisk = Math.round(buildings.reduce((sum, b) => sum + b.riskScore, 0) / (buildings.length || 1));

  // Generate area chart points
  const chartData = [12, 10, 8, 7, 8, 6, 5, 4, 3, 5, 6, needsReview];
  const chartW = 460;
  const chartH = 100;
  const maxVal = Math.max(...chartData, 1);
  const stepX = chartW / (chartData.length - 1);

  const points = chartData.map((v, i) => ({
    x: i * stepX,
    y: chartH - (v / maxVal) * (chartH - 10),
  }));

  let linePath = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx1 = prev.x + stepX * 0.4;
    const cpx2 = curr.x - stepX * 0.4;
    linePath += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  const areaPath = linePath + ` L ${chartW} ${chartH} L 0 ${chartH} Z`;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      className="flex flex-col h-full"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div 
        className="flex items-center justify-between mb-4"
        variants={itemVariants}
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <TrendingUp size={18} className="text-blue-400" />
          </motion.div>
          <h3 className="text-[14px] font-medium text-white/60">
            Risk Pipeline
          </h3>
        </div>
        <button className="flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white/70 transition-colors">
          <span>Last 30 days</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </motion.div>

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <motion.div 
          className="bg-white/[0.03] hover:bg-white/[0.05] rounded-xl px-4 py-3.5 border border-white/[0.06] transition-all group"
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <BuildingIcon size={14} className="text-white/40 group-hover:text-blue-400 transition-colors" />
            <span className="text-[12px] text-white/40">Monitored</span>
          </div>
          <motion.div 
            className="text-[24px] font-semibold text-white/90 leading-none tracking-tight"
            key={total}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            {total}
          </motion.div>
        </motion.div>
        
        <motion.div 
          className="bg-gradient-to-br from-red-500/[0.15] to-orange-500/[0.08] rounded-xl px-4 py-3.5 border border-red-500/20 group"
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={14} className="text-red-400" />
            <span className="text-[12px] text-red-300/80">Flagged</span>
          </div>
          <motion.div 
            className="text-[24px] font-semibold text-white leading-none tracking-tight"
            key={flagged}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            {flagged}
          </motion.div>
        </motion.div>
        
        <motion.div 
          className="bg-white/[0.03] hover:bg-white/[0.05] rounded-xl px-4 py-3.5 border border-white/[0.06] transition-all group"
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Shield size={14} className="text-white/40 group-hover:text-emerald-400 transition-colors" />
            <span className="text-[12px] text-white/40">Cleared</span>
          </div>
          <motion.div 
            className="text-[24px] font-semibold text-white/90 leading-none tracking-tight"
            key={cleared}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            {cleared}
          </motion.div>
        </motion.div>

        <motion.div 
          className="bg-gradient-to-br from-blue-500/[0.1] to-purple-500/[0.05] rounded-xl px-4 py-3.5 border border-blue-500/20 group"
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-blue-400" />
            <span className="text-[12px] text-blue-300/80">Avg Risk</span>
          </div>
          <motion.div 
            className="text-[24px] font-semibold text-white leading-none tracking-tight"
            key={avgRisk}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            {avgRisk}
          </motion.div>
        </motion.div>
      </div>

      {/* Chart */}
      <motion.div 
        className="flex-1 min-h-0 relative"
        variants={itemVariants}
      >
        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
          <motion.path 
            d={areaPath} 
            fill="url(#areaGrad)" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          />
          <motion.path
            d={linePath}
            fill="none"
            stroke="url(#lineGrad)"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
          <motion.circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="5"
            fill="#ef4444"
            stroke="#0a0a0b"
            strokeWidth="2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1, type: "spring" }}
          />
        </svg>
        
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-white/30">
          <span>30d ago</span>
          <motion.span 
            className="text-blue-400 font-medium"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Today
          </motion.span>
        </div>
      </motion.div>
    </motion.div>
  );
}
