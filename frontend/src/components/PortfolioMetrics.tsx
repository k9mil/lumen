import type { Building } from "../types";

interface PortfolioMetricsProps {
  buildings: Building[];
}

export default function PortfolioMetrics({ buildings }: PortfolioMetricsProps) {
  const total = buildings.length;
  const needsReview = buildings.filter((b) => b.status === "needs_review").length;
  const cleared = buildings.filter((b) => b.status === "cleared").length;
  const flagged = total - cleared;

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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-medium text-white/60">
          Risk Pipeline
        </h3>
        <button className="flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white/70 transition-colors">
          <span>Last 30 days</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {/* Metric cards - clean minimal style */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white/[0.03] hover:bg-white/[0.05] rounded-xl px-4 py-3.5 border border-white/[0.06] transition-all">
          <div className="text-[12px] text-white/40 mb-1">Monitored</div>
          <div className="text-[24px] font-semibold text-white/90 leading-none tracking-tight">
            {total}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-red-500/[0.15] to-orange-500/[0.08] rounded-xl px-4 py-3.5 border border-red-500/20">
          <div className="flex items-center gap-1.5 text-[12px] text-red-300/80 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            Flagged
          </div>
          <div className="text-[24px] font-semibold text-white leading-none tracking-tight">
            {flagged}
          </div>
        </div>
        
        <div className="bg-white/[0.03] hover:bg-white/[0.05] rounded-xl px-4 py-3.5 border border-white/[0.06] transition-all">
          <div className="text-[12px] text-white/40 mb-1">Total Policies</div>
          <div className="text-[24px] font-semibold text-white/90 leading-none tracking-tight">
            1,030
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0 relative">
        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#areaGrad)" />
          <path
            d={linePath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="4"
            fill="#3b82f6"
            stroke="#0a0a0b"
            strokeWidth="2"
          />
        </svg>
        
        {/* X-axis labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-white/30">
          <span>30d ago</span>
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}
