export type RiskTier = "critical" | "high" | "medium" | "low";
export type BuildingStatus = "needs_review" | "cleared" | "monitoring";

export interface Signal {
  id: string;
  source: string;
  severity: RiskTier;
  description: string;
  timestamp: string;
}

export interface Building {
  id: string;
  address: string;
  tenant: string;
  riskScore: number;
  riskTrend: "up" | "down" | "stable";
  riskTier: RiskTier;
  status: BuildingStatus;
  propertyType: string;
  listed: boolean;
  registeredUse: string;
  detectedUse: string;
  useMismatch: boolean;
  lat: number;
  lng: number;
  lastUpdated: string;
  assignedTo: string | null;
  signals: Signal[];
}

export interface EvidenceItem {
  id: number;
  snapshot_id: number;
  signal_type: string;
  description: string;
  weight: number;
  raw_data: Record<string, unknown> | null;
}

export interface EvidenceSnapshot {
  id: number;
  building_id: number;
  run_at: string;
  geocode_data: Record<string, unknown> | null;
  companies_house_data: Record<string, unknown> | null;
  places_data: Record<string, unknown> | null;
  street_view_analysis: Record<string, unknown> | null;
  licensing_data: Record<string, unknown> | null;
  risk_score: number;
  risk_tier: string;
}

export interface EvidenceResponse {
  snapshot: EvidenceSnapshot;
  evidence_items: EvidenceItem[];
  diff: Array<{ field: string; old: unknown; new: unknown; severity: string }> | null;
}

export type TabId = "all" | "needs_review";
