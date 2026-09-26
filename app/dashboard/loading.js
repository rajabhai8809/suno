export default function DashboardLoading() {
  return (
    <div className="min-h-screen animate-pulse overflow-x-clip bg-[#08080c] px-3 py-4 text-white sm:px-5 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
        <div className="h-7 w-28 rounded-full bg-white/[0.06]" />
        <div className="h-11 w-full max-w-md rounded-2xl bg-white/[0.06]" />
        <div className="h-5 w-full max-w-2xl rounded-xl bg-white/[0.05]" />
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,.85fr)]">
          <div className="h-64 rounded-[1.75rem] bg-white/[0.05] sm:h-72" />
          <div className="h-64 rounded-[1.75rem] bg-white/[0.05] sm:h-72" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 rounded-2xl bg-white/[0.05] sm:h-28" />
          ))}
        </div>
        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,.8fr)]">
          <div className="h-80 rounded-[1.7rem] bg-white/[0.05]" />
          <div className="h-80 rounded-[1.7rem] bg-white/[0.05]" />
        </div>
      </div>
    </div>
  );
}