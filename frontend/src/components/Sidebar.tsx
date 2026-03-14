import { useState } from "react";
import { 
  LayoutGrid, 
  Building2, 
  BarChart3, 
  Settings, 
  ChevronDown,
  Plus
} from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
}

interface SidebarProps {
  onAddProperty: () => void;
}

const navItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <LayoutGrid size={18} strokeWidth={1.5} />,
  },
  {
    id: "properties",
    label: "Properties",
    icon: <Building2 size={18} strokeWidth={1.5} />,
    count: 12,
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: <BarChart3 size={18} strokeWidth={1.5} />,
  },
  {
    id: "settings",
    label: "Settings",
    icon: <Settings size={18} strokeWidth={1.5} />,
  },
];

// Connected blocky L logo - solid shape, not levitating blocks
function LumenLogo({ className = "" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 32 32" 
      className={className}
      fill="currentColor"
    >
      {/* Connected L shape - one cohesive form made of touching blocks */}
      {/* Vertical stem - connected blocks */}
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <rect x="4" y="11" width="7" height="7" rx="1" />
      <rect x="4" y="18" width="7" height="7" rx="1" />
      <rect x="4" y="25" width="7" height="3" rx="1" />
      
      {/* Horizontal base - connected to vertical */}
      <rect x="11" y="21" width="7" height="7" rx="1" />
      <rect x="18" y="21" width="7" height="7" rx="1" />
      <rect x="25" y="21" width="3" height="7" rx="1" />
    </svg>
  );
}

export default function Sidebar({ onAddProperty }: SidebarProps) {
  const [activeItem, setActiveItem] = useState("dashboard");

  return (
    <div className="w-64 h-full flex flex-col border-r border-white/[0.08] bg-[#0a0a0b]">
      {/* Logo area - lowercase lumen with white blocky icon */}
      <div className="px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 text-white">
            <LumenLogo className="w-full h-full" />
          </div>
          <span className="font-semibold text-white/90 text-[17px] tracking-tight lowercase">
            lumen
          </span>
        </div>
      </div>

      {/* Add Property Button */}
      <div className="px-3 mb-4">
        <button
          onClick={onAddProperty}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-[13px] font-medium rounded-xl hover:from-blue-500 hover:to-cyan-500 transition-all shadow-lg shadow-blue-600/20"
        >
          <Plus size={16} />
          Add Property
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2">
        <div className="space-y-0.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveItem(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all
                ${activeItem === item.id
                  ? "bg-white/[0.08] text-white"
                  : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
                }
              `}
            >
              <span className={activeItem === item.id ? "text-blue-400" : ""}>
                {item.icon}
              </span>
              <span>{item.label}</span>
              {item.count !== undefined && (
                <span className={`
                  ml-auto text-[11px] font-medium px-1.5 py-0.5 rounded-full
                  ${activeItem === item.id
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-white/10 text-white/40"
                  }
                `}>
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* User section with avatar */}
      <div className="p-3 border-t border-white/[0.08]">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-all group">
          <img 
            src="/avatar.jpeg" 
            alt="Kamil Zak" 
            className="w-8 h-8 rounded-full object-cover"
          />
          <div className="flex-1 text-left">
            <div className="text-[13px] font-medium text-white/90">Kamil Zak</div>
            <div className="text-[11px] text-white/40">Risk Analyst</div>
          </div>
          <ChevronDown size={16} className="text-white/30" />
        </button>
      </div>
    </div>
  );
}
