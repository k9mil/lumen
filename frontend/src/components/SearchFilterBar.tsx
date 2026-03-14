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

function SelectFilter({
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
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm text-gray-600 bg-white border border-surface-200 rounded-lg px-3 py-2 pr-8 appearance-none cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-colors"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M3 5l3 3 3-3'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 8px center",
      }}
    >
      <option value="all">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
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
  return (
    <div className="flex items-center gap-3 px-6 py-3">
      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <circle
            cx="7"
            cy="7"
            r="5.5"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M11 11L14 14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <input
          type="text"
          placeholder="Search buildings..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full text-sm pl-9 pr-3 py-2 border border-surface-200 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-colors"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <SelectFilter
          value={riskFilter}
          onChange={(v) => onRiskFilterChange(v as RiskTier | "all")}
          placeholder="Risk tier"
          options={[
            { value: "critical", label: "Critical" },
            { value: "high", label: "High" },
            { value: "medium", label: "Medium" },
            { value: "low", label: "Low" },
          ]}
        />
        <SelectFilter
          value={sourceFilter}
          onChange={onSourceFilterChange}
          placeholder="Data source"
          options={[
            { value: "Vision Model", label: "Vision Model" },
            { value: "Council Rates", label: "Council Rates" },
            { value: "Companies House", label: "Companies House" },
            { value: "Building Survey", label: "Building Survey" },
            { value: "Street View", label: "Street View" },
            { value: "Fire Service", label: "Fire Service" },
            { value: "Flood Risk", label: "Flood Risk" },
          ]}
        />
        <SelectFilter
          value={propertyFilter}
          onChange={onPropertyFilterChange}
          placeholder="Property type"
          options={[
            { value: "Retail", label: "Retail" },
            { value: "Office", label: "Office" },
            { value: "Leisure", label: "Leisure" },
            { value: "Industrial", label: "Industrial" },
            { value: "Warehouse", label: "Warehouse" },
            { value: "Healthcare", label: "Healthcare" },
          ]}
        />
        <SelectFilter
          value={statusFilter}
          onChange={onStatusFilterChange}
          placeholder="Status"
          options={[
            { value: "needs_review", label: "Needs Review" },
            { value: "cleared", label: "Cleared" },
            { value: "monitoring", label: "Monitoring" },
          ]}
        />
      </div>
    </div>
  );
}
