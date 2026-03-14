import type { RiskTier } from "../types";

interface SearchFilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  riskFilter: RiskTier | "all";
  onRiskFilterChange: (v: RiskTier | "all") => void;
  sourceFilter: string;
  onSourceFilterChange: (v: string) => void;
  propertyFilter: string;
  onPropertyFilterChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
}

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  const isActive = value !== "all";

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
          appearance-none cursor-pointer text-[12px] font-medium pl-3 pr-8 py-1.5 rounded-lg border transition-all
          focus:outline-none focus:ring-2 focus:ring-blue-500/20
          ${isActive
            ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
            : "bg-white/[0.03] text-white/60 border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.05]"
          }
        `}
      >
        <option value="all">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${isActive ? "text-blue-400" : "text-white/30"}`}
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}

export default function SearchFilterBar({
  search,
  onSearchChange,
  riskFilter,
  onRiskFilterChange,
  sourceFilter,
  onSourceFilterChange,
  propertyFilter,
  onPropertyFilterChange,
  statusFilter,
  onStatusFilterChange,
}: SearchFilterBarProps) {
  const hasActiveFilters = riskFilter !== "all" || sourceFilter !== "all" || propertyFilter !== "all" || statusFilter !== "all";

  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06] bg-[#0a0a0b]/50">
      <div className="relative w-[280px]">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Search properties..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full text-[13px] pl-10 pr-3 py-2 border border-white/[0.08] rounded-lg placeholder-white/30 text-white/80 bg-white/[0.03] focus:outline-none focus:border-white/[0.2] focus:bg-white/[0.05] transition-all"
        />
      </div>

      <div className="flex items-center gap-2">
        <FilterSelect
          value={riskFilter}
          onChange={(v) => onRiskFilterChange(v as RiskTier | "all")}
          placeholder="Risk"
          options={[
            { value: "critical", label: "Critical" },
            { value: "high", label: "High" },
            { value: "medium", label: "Medium" },
            { value: "low", label: "Low" },
          ]}
        />
        <FilterSelect
          value={sourceFilter}
          onChange={onSourceFilterChange}
          placeholder="Source"
          options={[
            { value: "Vision Model", label: "Vision Model" },
            { value: "Council Rates", label: "Council Rates" },
            { value: "Companies House", label: "Companies House" },
            { value: "Building Survey", label: "Building Survey" },
            { value: "Fire Service", label: "Fire Service" },
            { value: "Flood Risk", label: "Flood Risk" },
          ]}
        />
        <FilterSelect
          value={propertyFilter}
          onChange={onPropertyFilterChange}
          placeholder="Type"
          options={[
            { value: "Retail", label: "Retail" },
            { value: "Office", label: "Office" },
            { value: "Leisure", label: "Leisure" },
            { value: "Industrial", label: "Industrial" },
            { value: "Warehouse", label: "Warehouse" },
            { value: "Healthcare", label: "Healthcare" },
          ]}
        />
        <FilterSelect
          value={statusFilter}
          onChange={onStatusFilterChange}
          placeholder="Status"
          options={[
            { value: "needs_review", label: "Needs Review" },
            { value: "cleared", label: "Cleared" },
            { value: "monitoring", label: "Monitoring" },
          ]}
        />

        {hasActiveFilters && (
          <button
            onClick={() => {
              onRiskFilterChange("all");
              onSourceFilterChange("all");
              onPropertyFilterChange("all");
              onStatusFilterChange("all");
            }}
            className="ml-2 text-[12px] text-white/40 hover:text-white/70 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
