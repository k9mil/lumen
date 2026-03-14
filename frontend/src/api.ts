import type { Building } from "./types";

const API_BASE_URL = "http://localhost:8000";

export async function fetchBuildings(): Promise<Building[]> {
  const response = await fetch(`${API_BASE_URL}/api/buildings/dashboard`);
  if (!response.ok) {
    throw new Error(`Failed to fetch buildings: ${response.statusText}`);
  }
  const data = await response.json();
  return data.buildings;
}

export async function refreshBuilding(buildingId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/buildings/${buildingId}/refresh`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Failed to refresh building: ${response.statusText}`);
  }
}
