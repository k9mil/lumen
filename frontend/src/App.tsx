import { useState, useMemo, useCallback } from "react";
import { buildings as initialBuildings } from "./data";
import type { Building, TabId, RiskTier } from "./types";
import TopBar from "./components/TopBar";
import Header from "./components/Header";
import PortfolioMetrics from "./components/PortfolioMetrics";
import MapPanel from "./components/MapPanel";
import PipelineTabs from "./components/PipelineTabs";
import SearchFilterBar from "./components/SearchFilterBar";
import BuildingsTable from "./components/BuildingsTable";
import BuildingDrawer from "./components/BuildingDrawer";

export default function App() {
  const [buildings, setBuildings] = useState<Building[]>(initialBuildings);
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskTier | "all">("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flyToId, setFlyToId] = useState<string | null>(null);

  const needsReviewCount = useMemo(
    () => buildings.filter((b) => b.status === "needs_review").length,
    [buildings]
  );

  const filteredBuildings = useMemo(() => {
    let result = buildings;

    // Tab filter
    if (activeTab === "needs_review") {
      result = result.filter((b) => b.status === "needs_review");
    } else if (activeTab === "cleared") {
      result = result.filter((b) => b.status === "cleared");
    } else if (activeTab === "assigned") {
      result = result.filter((b) => b.assignedTo === "me");
    }

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.address.toLowerCase().includes(q) ||
          b.tenant.toLowerCase().includes(q)
      );
    }

    // Dropdown filters
    if (riskFilter !== "all") {
      result = result.filter((b) => b.riskTier === riskFilter);
    }
    if (sourceFilter !== "all") {
      result = result.filter((b) =>
        b.signals.some((s) => s.source === sourceFilter)
      );
    }
    if (propertyFilter !== "all") {
      result = result.filter((b) => b.propertyType === propertyFilter);
    }
    if (statusFilter !== "all") {
      result = result.filter((b) => b.status === statusFilter);
    }

    return result;
  }, [
    buildings,
    activeTab,
    search,
    riskFilter,
    sourceFilter,
    propertyFilter,
    statusFilter,
  ]);

  const selectedBuilding = useMemo(
    () => buildings.find((b) => b.id === selectedId) || null,
    [buildings, selectedId]
  );

  const handleSelectBuilding = useCallback((id: string) => {
    setSelectedId(id);
    setFlyToId(id);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setSelectedId(null);
  }, []);

  const handleMarkReviewed = useCallback((id: string) => {
    setBuildings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: "cleared" as const } : b))
    );
    setSelectedId(null);
  }, []);

  const handleDismiss = useCallback((id: string) => {
    setBuildings((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, status: "monitoring" as const } : b
      )
    );
    setSelectedId(null);
  }, []);

  return (
    <div className="min-h-screen bg-[#1a1a2e] p-4">
      <div className="max-w-[1400px] mx-auto bg-white rounded-2xl shadow-2xl min-h-[calc(100vh-32px)] flex flex-col overflow-hidden">
        <TopBar />
        <Header needsReviewCount={needsReviewCount} />

        {/* Two-panel section */}
        <div className="grid grid-cols-2 gap-4 px-6 py-4">
          <PortfolioMetrics buildings={buildings} />
          <MapPanel
            buildings={buildings}
            selectedId={selectedId}
            onSelectBuilding={handleSelectBuilding}
            flyToId={flyToId}
          />
        </div>

        {/* Pipeline */}
        <PipelineTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          needsReviewCount={needsReviewCount}
        />

        {/* Search & Filters */}
        <SearchFilterBar
          search={search}
          onSearchChange={setSearch}
          riskFilter={riskFilter}
          onRiskFilterChange={setRiskFilter}
          sourceFilter={sourceFilter}
          onSourceFilterChange={setSourceFilter}
          propertyFilter={propertyFilter}
          onPropertyFilterChange={setPropertyFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        {/* Table */}
        <BuildingsTable
          buildings={filteredBuildings}
          onSelectBuilding={handleSelectBuilding}
          selectedId={selectedId}
        />

        {/* Drawer */}
        <BuildingDrawer
          building={selectedBuilding}
          onClose={handleCloseDrawer}
          onMarkReviewed={handleMarkReviewed}
          onDismiss={handleDismiss}
        />
      </div>
    </div>
  );
}
