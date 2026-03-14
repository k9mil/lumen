export default function TopBar() {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
      <span className="font-mono text-[15px] font-medium tracking-[0.15em] text-gray-900">
        LUMEN
      </span>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">Sarah Mitchell</span>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-medium">
          SM
        </div>
      </div>
    </div>
  );
}
