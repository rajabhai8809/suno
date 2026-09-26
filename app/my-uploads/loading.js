export default function Loading() {
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="h-9 w-48 animate-pulse rounded-xl bg-white/[0.06]" />
      <div className="h-12 w-full animate-pulse rounded-2xl bg-white/[0.05]" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-16 animate-pulse rounded-2xl bg-white/[0.035]" />
        ))}
      </div>
    </div>
  );
}