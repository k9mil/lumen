import { useState, useEffect, useCallback } from "react";
import type { Building } from "../types";
import { fetchDashboardBuildings, createReview } from "../api/client";

export function useBuildings() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDashboardBuildings();
      setBuildings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load buildings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const markReviewed = useCallback(
    async (id: string) => {
      await createReview(id, {
        reviewer_name: "Kamil",
        action: "cleared",
      });
      // Optimistic update
      setBuildings((prev) =>
        prev.map((b) =>
          b.id === id ? { ...b, status: "cleared" as const } : b
        )
      );
    },
    []
  );

  const dismiss = useCallback(
    async (id: string) => {
      await createReview(id, {
        reviewer_name: "Kamil",
        action: "noted",
        notes: "Dismissed — monitoring",
      });
      setBuildings((prev) =>
        prev.map((b) =>
          b.id === id ? { ...b, status: "monitoring" as const } : b
        )
      );
    },
    []
  );

  const escalate = useCallback(
    async (id: string) => {
      await createReview(id, {
        reviewer_name: "Kamil",
        action: "escalated",
      });
      setBuildings((prev) =>
        prev.map((b) =>
          b.id === id
            ? { ...b, status: "needs_review" as const, assignedTo: "escalated" }
            : b
        )
      );
    },
    []
  );

  return {
    buildings,
    setBuildings,
    loading,
    error,
    refresh,
    markReviewed,
    dismiss,
    escalate,
  };
}
