import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Building2, MapPin, FileText, AlertCircle, CheckCircle, Loader2, Sparkles, ArrowRight } from "lucide-react";
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
  "Education",
  "Hospitality",
];

const REGISTERED_USES = [
  "Class 1 — Retail",
  "Class 2 — Financial & Professional",
  "Class 3 — Food & Drink",
  "Class 4 — Business",
  "Class 5 — General Industrial",
  "Class 6 — Storage & Distribution",
  "Class 11 — Assembly & Leisure",
];

export default function OnboardingModal({
  isOpen,
  onClose,
  onBuildingCreated,
}: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    address: "",
    tenant: "",
    property_type: "Retail",
    property_class: "Retail",
    registered_use: "Class 1 — Retail",
    listed: false,
  });

  const resetForm = () => {
    setStep(1);
    setFormData({
      address: "",
      tenant: "",
      property_type: "Retail",
      property_class: "Retail",
      registered_use: "Class 1 — Retail",
      listed: false,
    });
    setError(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/buildings/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to create property");
      }

      const building = await response.json();
      onBuildingCreated(building);
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsSubmitting(false);
    }
  };

  const canProceed = formData.address.trim().length > 5;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={handleClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4">
            <motion.div
              className="bg-[#0f0f10] rounded-2xl shadow-2xl border border-white/[0.08] pointer-events-auto w-full max-w-[520px] overflow-hidden"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20 flex items-center justify-center">
                    <Sparkles size={18} className="text-violet-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      Add Property
                    </h2>
                    <p className="text-[12px] text-white/40">
                      Step {step} of 2
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="text-white/40 hover:text-white p-2 hover:bg-white/[0.06] rounded-lg transition-all disabled:opacity-50"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-6 min-h-[320px]">
                <AnimatePresence mode="wait">
                  {step === 1 ? (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-5"
                    >
                    <div className="space-y-2">
                      <label className="text-[12px] font-medium text-white/70 uppercase tracking-wide flex items-center gap-2">
                        <MapPin size={14} />
                        Address
                      </label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) =>
                          setFormData({ ...formData, address: e.target.value })
                        }
                        placeholder="e.g., 142 Union Street, Glasgow G1 3QQ"
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.05] transition-all"
                        autoFocus
                      />
                      <p className="text-[11px] text-white/40">
                        We'll geocode this and enrich with external data
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[12px] font-medium text-white/70 uppercase tracking-wide flex items-center gap-2">
                        <Building2 size={14} />
                        Tenant / Occupant
                      </label>
                      <input
                        type="text"
                        value={formData.tenant}
                        onChange={(e) =>
                          setFormData({ ...formData, tenant: e.target.value })
                        }
                        placeholder="e.g., Acme Retail Ltd"
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.05] transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[12px] font-medium text-white/70 uppercase tracking-wide">
                          Property Type
                        </label>
                        <select
                          value={formData.property_type}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              property_type: e.target.value,
                              property_class: e.target.value,
                            })
                          }
                          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] text-white focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.05] transition-all appearance-none cursor-pointer"
                        >
                          {PROPERTY_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[12px] font-medium text-white/70 uppercase tracking-wide">
                          Listed Building
                        </label>
                        <button
                          onClick={() =>
                            setFormData({ ...formData, listed: !formData.listed })
                          }
                          className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[14px] font-medium border transition-all ${
                            formData.listed
                              ? "bg-amber-500/[0.15] border-amber-500/30 text-amber-300"
                              : "bg-white/[0.03] border-white/[0.08] text-white/50 hover:bg-white/[0.05]"
                          }`}
                        >
                          {formData.listed ? (
                            <>
                              <CheckCircle size={16} />
                              Yes, Listed
                            </>
                          ) : (
                            <>
                              <AlertCircle size={16} />
                              Not Listed
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    <div className="space-y-2">
                      <label className="text-[12px] font-medium text-white/70 uppercase tracking-wide flex items-center gap-2">
                        <FileText size={14} />
                        Registered Use Class
                      </label>
                      <select
                        value={formData.registered_use}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            registered_use: e.target.value,
                          })
                        }
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] text-white focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.05] transition-all appearance-none cursor-pointer"
                      >
                        {REGISTERED_USES.map((use) => (
                          <option key={use} value={use}>
                            {use}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-white/40">
                        We'll detect actual use and flag any mismatches
                      </p>
                    </div>

                    <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                      <h3 className="text-[12px] font-medium text-white/70 uppercase tracking-wide mb-3">
                        Summary
                      </h3>
                      <div className="space-y-2 text-[13px]">
                        <div className="flex justify-between">
                          <span className="text-white/40">Address</span>
                          <span className="text-white/90 max-w-[240px] text-right">
                            {formData.address || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/40">Tenant</span>
                          <span className="text-white/90">
                            {formData.tenant || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/40">Type</span>
                          <span className="text-white/90">
                            {formData.property_type}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/40">Use Class</span>
                          <span className="text-white/90">
                            {formData.registered_use}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isSubmitting && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-br from-violet-500/10 to-indigo-500/10 rounded-xl p-4 border border-violet-500/20"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Loader2 size={20} className="text-violet-400 animate-spin" />
                          </div>
                          <div>
                            <p className="text-[13px] font-medium text-white">
                              Analyzing property...
                            </p>
                            <p className="text-[11px] text-white/50">
                              Running geocoding, vision analysis, and risk scoring
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-500/10 rounded-xl p-3 border border-red-500/20 flex items-center gap-2"
                      >
                        <AlertCircle size={16} className="text-red-400" />
                        <span className="text-[13px] text-red-300">{error}</span>
                      </motion.div>
                    )}
                  </motion.div>
                )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
                {step === 1 ? (
                  <>
                    <button
                      onClick={handleClose}
                      disabled={isSubmitting}
                      className="px-4 py-2 text-[13px] text-white/50 hover:text-white transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setStep(2)}
                      disabled={!canProceed || isSubmitting}
                      className="flex items-center gap-2 px-5 py-2.5 bg-violet-500 text-white text-[13px] font-medium rounded-xl hover:bg-violet-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue
                      <ArrowRight size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setStep(1)}
                      disabled={isSubmitting}
                      className="px-4 py-2 text-[13px] text-white/50 hover:text-white transition-colors disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-[13px] font-medium rounded-xl hover:from-violet-400 hover:to-indigo-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} />
                          Add & Analyze
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
