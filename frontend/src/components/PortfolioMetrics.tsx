import type { Building } from "../types";

interface PortfolioMetricsProps {
  buildings: Building[];
}

export default function PortfolioMetrics({ buildings }: PortfolioMetricsProps) {
  const monitored = buildings.length;
  const needsReview = buildings.filter(
    (b) => b.status === "needs_review"
  ).length;
  const cleared = buildings.filter((b) => b.status === "cleared").length;

  const metrics = [
    {
      label: "Monitored",
      value: monitored,
      color: "text-gray-900",
      dotColor: "bg-gray-400",
    },
    {
      label: "Needs Review",
      value: needsReview,
      color: "text-risk-critical",
      dotColor: "bg-risk-critical",
    },
    {
      label: "Cleared",
      value: cleared,
      color: "text-risk-low",
      dotColor: "bg-risk-low",
    },
  ];

  // Funnel widths (percentage of container)
  const funnelSteps = [
    { label: "All", count: monitored, width: 100 },
    {
      label: "Flagged",
      count: monitored - cleared,
      width: ((monitored - cleared) / monitored) * 100,
    },
    {
      label: "Needs Review",
      count: needsReview,
      width: (needsReview / monitored) * 100,
    },
    { label: "Cleared", count: cleared, width: (cleared / monitored) * 100 },
  ];

  return (
    <div className="bg-surface-50 rounded-xl border border-surface-200 p-5 flex flex-col h-full">
      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
        Portfolio Overview
      </h3>

      {/* Metric cards */}
      <div className="flex gap-3 mb-6">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="flex-1 bg-white rounded-lg border border-surface-200 p-3"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <div className={`w-1.5 h-1.5 rounded-full ${m.dotColor}`} />
              <span className="text-[11px] text-gray-500 font-medium">
                {m.label}
              </span>
            </div>
            <span className={`text-xl font-mono font-medium ${m.color}`}>
              {m.value}
            </span>
          </div>
        ))}
      </div>

      {/* Funnel visualization */}
      <div className="flex-1 flex flex-col justify-center">
        <svg viewBox="0 0 400 180" className="w-full" fill="none">
          {funnelSteps.map((step, i) => {
            const y = i * 44;
            const barWidth = Math.max((step.width / 100) * 360, 40);
            const x = (400 - barWidth) / 2;
            const isReview = step.label === "Needs Review";
            const isCleared = step.label === "Cleared";

            let fill = "#e0e7ff";
            let textFill = "#4338ca";
            if (isReview) {
              fill = "#fef2f2";
              textFill = "#dc2626";
            } else if (isCleared) {
              fill = "#f0fdf4";
              textFill = "#16a34a";
            }

            return (
              <g key={step.label}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={32}
                  rx={8}
                  fill={fill}
                  stroke={textFill}
                  strokeWidth={1}
                  strokeOpacity={0.2}
                />
                <text
                  x={200}
                  y={y + 20}
                  textAnchor="middle"
                  fill={textFill}
                  fontSize={12}
                  fontFamily="DM Sans"
                  fontWeight={500}
                >
                  {step.label}
                  <tspan dx={8} fontFamily="DM Mono" fontSize={11}>
                    {step.count}
                  </tspan>
                </text>
                {i < funnelSteps.length - 1 && (
                  <line
                    x1={200}
                    y1={y + 32}
                    x2={200}
                    y2={y + 44}
                    stroke="#c7d2fe"
                    strokeWidth={1.5}
                    strokeDasharray="3 2"
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
