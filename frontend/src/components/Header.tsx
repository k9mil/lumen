interface HeaderProps {
  needsReviewCount: number;
}

export default function Header({ needsReviewCount }: HeaderProps) {
  return (
    <div className="px-6 pt-6 pb-2">
      <h1 className="text-[28px] font-semibold text-gray-900 tracking-[-0.02em]">
        Good morning, Sarah
      </h1>
      <p className="text-[15px] text-gray-500 mt-1">
        {needsReviewCount} building{needsReviewCount !== 1 ? "s" : ""} need
        {needsReviewCount === 1 ? "s" : ""} your attention today.
      </p>
    </div>
  );
}
