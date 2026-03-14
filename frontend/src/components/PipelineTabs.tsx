import type { TabId } from "../types";

interface PipelineTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  needsReviewCount: number;
}

const tabs: { id: TabId; label: string; showBadge?: boolean }[] = [
  { id: "all", label: "All policies" },
  { id: "needs_review", label: "Needs review", showBadge: true },
  { id: "cleared", label: "Cleared" },
  { id: "assigned", label: "Assigned to me" },
];

export default function PipelineTabs({
  activeTab,
  onTabChange,
  needsReviewCount,
}: PipelineTabsProps) {
  return (
    <div className="flex items-center gap-1 px-6 border-b border-surface-200">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            relative px-4 py-3 text-sm font-medium transition-colors
            ${
              activeTab === tab.id
                ? "text-gray-900 border-b-2 border-gray-900"
                : "text-gray-500 hover:text-gray-700 border-b-2 border-transparent"
            }
          `}
        >
          <span className="flex items-center gap-2">
            {tab.label}
            {tab.showBadge && needsReviewCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-risk-critical text-white text-[11px] font-mono font-medium">
                {needsReviewCount}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
