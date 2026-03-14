import { FolderOpen } from "lucide-react";
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
  return (
    <div className="flex-1 min-h-0 overflow-auto bg-[#0a0a0b]">
      <div className="flex items-center gap-4 px-6 py-2.5 text-[11px] font-medium text-white/40 uppercase tracking-wide border-b border-white/[0.06] sticky top-0 bg-[#0a0a0b]/95 backdrop-blur-sm z-10">
        <div className="w-[200px]">Property</div>
        <div className="w-[180px]">Tenant</div>
        <div className="w-[80px]">Risk</div>
        <div className="w-[100px]">Type</div>
        <div className="w-[100px]">Status</div>
        <div className="flex-1 text-right">Updated</div>
      </div>

      <div>
        {buildings.map((b) => {
          const isSelected = selectedId === b.id;

          return (
            <div
              key={b.id}
              onClick={() => onSelectBuilding(b.id)}
              className={`
                flex items-center gap-4 px-6 py-3 cursor-pointer transition-all border-b border-white/[0.04]
                ${isSelected ? "bg-blue-500/[0.08]" : "hover:bg-white/[0.03]"}
              `}
            >
              <div className="w-[200px]">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-white/90 truncate">
                    {b.address.split(",")[0]}
                  </span>
                  {b.listed && (
                    <span className="shrink-0 text-[9px] font-medium text-indigo-300 bg-indigo-500/15 px-1.5 py-0.5 rounded border border-indigo-500/20">
                      Listed
                    </span>
                  )}
                </div>
              </div>

              <div className="w-[180px]">
                <span className="text-[13px] text-white/60 truncate block">
                  {b.tenant}
                </span>
              </div>

              <div className="w-[80px]">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${RISK_DOTS[b.riskTier]}`} />
                  <span className={`font-mono text-[13px] font-medium ${RISK_COLORS[b.riskTier]}`}>
                    {b.riskScore}
                  </span>
                </div>
              </div>

              <div className="w-[100px]">
                <span className="text-[13px] text-white/70">{b.propertyType}</span>
              </div>

              <div className="w-[100px]">
                <span
                  className={`text-[12px] font-medium
                  ${b.status === "needs_review" ? "text-amber-400" : ""}
                  ${b.status === "cleared" ? "text-emerald-400" : ""}
                  ${b.status === "monitoring" ? "text-white/50" : ""}
                `}
                >
                  {b.status === "needs_review" && "Needs Review"}
                  {b.status === "cleared" && "Cleared"}
                  {b.status === "monitoring" && "Monitoring"}
                </span>
              </div>

              <div className="flex-1 text-right">
                <span className="text-[12px] text-white/40">{formatTimestamp(b.lastUpdated)}</span>
              </div>
            </div>
          );
        })}

        {buildings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-white/40">
            <FolderOpen size={32} strokeWidth={1.5} className="mb-3 opacity-50" />
            <span className="text-[14px]">No properties match your filters</span>
          </div>
        )}
      </div>
    </div>
  );
}
