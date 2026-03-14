import { useState, useMemo, useCallback } from "react";
import { useBuildings } from "./hooks/useBuildings";
import type { TabId, RiskTier } from "./types";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import Header from "./components/Header";
import PortfolioMetrics from "./components/PortfolioMetrics";
import MapPanel from "./components/MapPanel";
import PipelineTabs from "./components/PipelineTabs";
import SearchFilterBar from "./components/SearchFilterBar";
import BuildingsTable from "./components/BuildingsTable";
import BuildingModal from "./components/BuildingModal";

export default function App() {
  const {
    buildings,
    setBuildings,
    loading,
    error,
  } = useBuildings();

  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskTier | "all">("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flyToId, setFlyToId] = useState<string | null>(null);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  const tabCounts = useMemo(
    () => ({
      all: buildings.length,
      needs_review: buildings.filter((b) => b.status === "needs_review").length,
    }),
    [buildings]
  );

  const filteredBuildings = useMemo(() => {
    let result = buildings;

    if (activeTab === "needs_review") {
      result = result.filter((b) => b.status === "needs_review");
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.address.toLowerCase().includes(q) ||
          b.tenant.toLowerCase().includes(q)
      );
    }

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

  const handleCloseModal = useCallback(() => {
    setSelectedId(null);
  }, []);

  const handleAcceptRisk = useCallback((id: string) => {
    setBuildings((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, status: "cleared" as const } : b
      )
    );
    setSelectedId(null);
  }, []);

  const handleDecline = useCallback((id: string) => {
    setBuildings((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, status: "monitoring" as const } : b
      )
    );
    setSelectedId(null);
  }, []);

  const handleRefer = useCallback((id: string, _target: string) => {
    // In production: route to senior UW, technical specialist, or claims
    setBuildings((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, assignedTo: "referred" } : b
      )
    );
    setSelectedId(null);
  }, []);

  const handleRequestSurvey = useCallback((_id: string) => {
    // In production: trigger loss control survey request
    setSelectedId(null);
  }, []);

  const handleFlagForRenewal = useCallback((id: string) => {
    // In production: mark for terms change at next renewal
    setBuildings((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, status: "monitoring" as const } : b
      )
    );
    setSelectedId(null);
  }, []);

  const handleFullscreenChange = useCallback((isFullscreen: boolean) => {
    setIsMapFullscreen(isFullscreen);
  }, []);

  return (
    <div className="h-screen w-screen bg-[#0a0a0b] overflow-hidden flex">
      {/* Sidebar - navigation */}
      <Sidebar />

      {/* Main content */}
      <div className={`flex-1 flex flex-col min-h-0 ${isMapFullscreen ? 'pointer-events-none' : ''}`}>
        {/* TopBar */}
        <TopBar />

        {/* Content area */}
        <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-b from-[#0a0a0b] via-[#0c0c0d] to-[#0a0a0b]">
          <Header needsReviewCount={tabCounts.needs_review} />

          {/* Metrics & Map row */}
          <div className="grid grid-cols-2 gap-6 px-6 pb-4">
            <PortfolioMetrics buildings={buildings} />
            <MapPanel
              buildings={buildings}
              selectedId={selectedId}
              onSelectBuilding={handleSelectBuilding}
              flyToId={flyToId}
              onFullscreenChange={handleFullscreenChange}
            />
          </div>

          {/* Pipeline tabs */}
          <PipelineTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counts={tabCounts}
          />

          {/* Search & filters */}
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
        </div>
      </div>

      {/* Building Modal - centered on screen */}
      <BuildingModal
        building={selectedBuilding}
        isOpen={!!selectedId}
        onClose={handleCloseModal}
        onAcceptRisk={handleAcceptRisk}
        onDecline={handleDecline}
        onRefer={handleRefer}
        onRequestSurvey={handleRequestSurvey}
        onFlagForRenewal={handleFlagForRenewal}
      />
    </div>
  );
}
