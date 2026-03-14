import type { ReactElement } from "react";
import type { TabId } from "../types";

interface PipelineTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  counts: Record<TabId, number>;
}

const tabConfig: {
  id: TabId;
  label: string;
  icon: (active: boolean) => ReactElement;
}[] = [
  {
    id: "all",
    label: "All",
    icon: (active) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "currentColor"} strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
  {
    id: "needs_review",
    label: "Needs review",
    icon: (active) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "currentColor"} strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
    ),
  },
];

export default function PipelineTabs({
  activeTab,
  onTabChange,
  counts,
}: PipelineTabsProps) {
  return (
    <div className="flex items-center gap-1 px-6 py-2 border-b border-white/[0.06]">
      {tabConfig.map((tab) => {
        const isActive = activeTab === tab.id;
        const count = counts[tab.id];

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-all
              ${isActive
                ? "bg-white/[0.08] text-white"
                : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
              }
            `}
          >
            <span className={isActive ? "text-blue-400" : "text-white/40"}>
              {tab.icon(isActive)}
            </span>
            <span>{tab.label}</span>
            <span
              className={`
                ml-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full
                ${isActive
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-white/10 text-white/40"
                }
              `}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
