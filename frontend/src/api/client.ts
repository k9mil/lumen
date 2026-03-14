import type { Building } from "../types";

const API_BASE = "/api";

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

interface DashboardResponse {
  buildings: Building[];
  total: number;
}

export async function fetchDashboardBuildings(): Promise<Building[]> {
  const data = await fetchJSON<DashboardResponse>("/buildings/dashboard");
  return data.buildings;
}

interface ReviewPayload {
  reviewer_name: string;
  action: "cleared" | "escalated" | "noted";
  notes?: string;
}

export async function createReview(
  buildingId: string,
  payload: ReviewPayload
): Promise<void> {
  await fetchJSON(`/buildings/${buildingId}/review`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function refreshBuilding(buildingId: string): Promise<void> {
  await fetchJSON(`/buildings/${buildingId}/refresh`, {
    method: "POST",
  });
}
