import { ChevronRight } from "lucide-react";

export default function TopBar() {
  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.08] bg-[#0a0a0b]/80 backdrop-blur-sm">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px]">
        <span className="text-white/40 hover:text-white/60 cursor-pointer transition-colors">
          Dashboard
        </span>
        <ChevronRight size={14} className="text-white/20" />
        <span className="text-white/90 font-medium">Properties</span>
      </div>

      {/* Right side - empty for now */}
      <div />
    </div>
  );
}
