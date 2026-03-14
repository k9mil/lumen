import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import type { Building } from "../types";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBuildingCreated: (building: Building) => void;
}

const PROPERTY_TYPES = [
  "Retail",
  "Office", 
  "Industrial",
  "Warehouse",
  "Leisure",
  "Healthcare",
  "Hospitality",
];

export default function OnboardingModal({
  isOpen,
  onClose,
  onBuildingCreated,
}: OnboardingModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    address: "",
    tenant: "",
    property_type: "Retail",
  });

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (!formData.address.trim()) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/buildings/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: formData.address,
          tenant: formData.tenant,
          property_type: formData.property_type,
          property_class: formData.property_type,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create property");
      }

      const building = await response.json();
      onBuildingCreated(building);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4">
            <motion.div
              className="bg-[#0a0a0b] rounded-2xl shadow-2xl pointer-events-auto w-full max-w-[500px] overflow-hidden border border-white/10"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-lg font-medium text-white">Add Property</h2>
                <button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="text-white/40 hover:text-white p-1.5 hover:bg-white/5 rounded-lg transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form */}
              <div className="px-6 py-6 space-y-5">
                {/* Address */}
                <div>
                  <label className="block text-sm text-white/60 mb-2">
                    Property Address *
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="e.g., 142 Union Street, Glasgow G1 3QQ"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 focus:bg-white/[0.07] transition-all"
                    autoFocus
                  />
                </div>

                {/* Property Type */}
                <div>
                  <label className="block text-sm text-white/60 mb-2">
                    Property Type
                  </label>
                  <select
                    value={formData.property_type}
                    onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/20 focus:bg-white/[0.07] transition-all appearance-none cursor-pointer"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                  >
                    {PROPERTY_TYPES.map((type) => (
                      <option key={type} value={type} className="bg-[#1a1a1b]">{type}</option>
                    ))}
                  </select>
                </div>

                {/* Tenant */}
                <div>
                  <label className="block text-sm text-white/60 mb-2">
                    Tenant / Occupant
                  </label>
                  <input
                    type="text"
                    value={formData.tenant}
                    onChange={(e) => setFormData({ ...formData, tenant: e.target.value })}
                    placeholder="e.g., Acme Retail Ltd"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 focus:bg-white/[0.07] transition-all"
                  />
                </div>

                {error && (
                  <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {isSubmitting && (
                  <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
                    <div className="flex items-center gap-3">
                      <Loader2 size={18} className="text-blue-400 animate-spin" />
                      <div>
                        <p className="text-sm font-medium text-white">Analyzing property...</p>
                        <p className="text-xs text-white/50">Running geocoding, vision analysis, and risk scoring</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formData.address.trim()}
                  className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Analyzing..." : "Add Property"}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
