import type { Building, RiskTier } from "../types";

const RISK_STYLES: Record<
  RiskTier,
  { text: string; bg: string; border: string }
> = {
  critical: {
    text: "text-risk-critical",
    bg: "bg-risk-critical-bg",
    border: "border-risk-critical/20",
  },
  high: {
    text: "text-risk-high",
    bg: "bg-risk-high-bg",
    border: "border-risk-high/20",
  },
  medium: {
    text: "text-risk-medium",
    bg: "bg-risk-medium-bg",
    border: "border-risk-medium/20",
  },
  low: {
    text: "text-risk-low",
    bg: "bg-risk-low-bg",
    border: "border-risk-low/20",
  },
};

function TrendArrow({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up")
    return <span className="text-risk-critical text-xs ml-1">&#9650;</span>;
  if (trend === "down")
    return <span className="text-risk-low text-xs ml-1">&#9660;</span>;
  return <span className="text-gray-400 text-xs ml-1">&#8212;</span>;
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    needs_review:
      "bg-risk-critical-bg text-risk-critical border border-risk-critical/20",
    cleared: "bg-risk-low-bg text-risk-low border border-risk-low/20",
    monitoring:
      "bg-risk-medium-bg text-risk-medium border border-risk-medium/20",
  };
  const labels: Record<string, string> = {
    needs_review: "Needs Review",
    cleared: "Cleared",
    monitoring: "Monitoring",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${styles[status] || ""}`}
    >
      {labels[status] || status}
    </span>
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
  return (
    <div className="flex-1 overflow-auto scrollbar-thin">
      <table className="w-full">
        <thead>
          <tr className="border-b border-surface-200 text-left">
            <th className="px-6 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
              Building
            </th>
            <th className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
              Risk Score
            </th>
            <th className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
              Category
            </th>
            <th className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
              Updated
            </th>
          </tr>
        </thead>
        <tbody>
          {buildings.map((b, i) => {
            const risk = RISK_STYLES[b.riskTier];
            return (
              <tr
                key={b.id}
                onClick={() => onSelectBuilding(b.id)}
                className={`
                  border-b border-surface-100 cursor-pointer transition-colors
                  animate-fade-up
                  ${selectedId === b.id ? "bg-indigo-50/50" : "hover:bg-surface-50"}
                `}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        {b.address.split(",")[0]}
                        {b.status === "needs_review" && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-risk-critical-bg text-risk-critical border border-risk-critical/20">
                            Needs Review
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {b.tenant}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span className="flex items-center">
                    <span
                      className={`font-mono text-sm font-medium ${risk.text}`}
                    >
                      {b.riskScore}
                    </span>
                    <TrendArrow trend={b.riskTrend} />
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-gray-700">
                      {b.propertyType}
                    </span>
                    {b.listed && (
                      <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/50">
                        Listed
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <StatusPill status={b.status} />
                </td>
                <td className="px-4 py-3.5">
                  <span className="font-mono text-xs text-gray-500">
                    {formatTimestamp(b.lastUpdated)}
                  </span>
                </td>
              </tr>
            );
          })}
          {buildings.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="px-6 py-12 text-center text-sm text-gray-400"
              >
                No buildings match your filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
