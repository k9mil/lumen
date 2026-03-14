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

export type TabId = "all" | "needs_review";
