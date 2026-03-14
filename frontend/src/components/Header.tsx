interface HeaderProps {
  needsReviewCount: number;
}

export default function Header({ needsReviewCount }: HeaderProps) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="px-6 pt-6 pb-4">
      <h1 className="text-[28px] font-semibold text-white tracking-[-0.02em]">
        {greeting}, Kamil
      </h1>
      {needsReviewCount > 0 && (
        <p className="text-[14px] text-white/50 mt-1">
          {needsReviewCount} properties need attention today
        </p>
      )}
    </div>
  );
}
