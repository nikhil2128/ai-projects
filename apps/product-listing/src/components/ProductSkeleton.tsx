import { useFeatureFlags } from "../context/FeatureFlagContext";

function GridSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-100" />
      <div className="p-5 space-y-3">
        <div className="flex gap-2">
          <div className="h-5 w-16 bg-gray-100 rounded-md" />
          <div className="h-5 w-12 bg-gray-100 rounded-md" />
        </div>
        <div className="h-4 w-3/4 bg-gray-100 rounded" />
        <div className="h-3 w-full bg-gray-100 rounded" />
        <div className="h-3 w-2/3 bg-gray-100 rounded" />
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-4 h-4 bg-gray-100 rounded" />
          ))}
        </div>
        <div className="h-6 w-20 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse flex">
      <div className="w-48 min-h-[10rem] bg-gray-100 flex-shrink-0" />
      <div className="flex-1 p-5 space-y-3">
        <div className="flex gap-2">
          <div className="h-5 w-16 bg-gray-100 rounded-md" />
          <div className="h-5 w-12 bg-gray-100 rounded-md" />
        </div>
        <div className="h-5 w-1/2 bg-gray-100 rounded" />
        <div className="h-4 w-full bg-gray-100 rounded" />
        <div className="h-4 w-3/4 bg-gray-100 rounded" />
        <div className="flex justify-between items-center mt-auto">
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-4 h-4 bg-gray-100 rounded" />
            ))}
          </div>
          <div className="h-6 w-20 bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  );
}

export function ProductSkeletons({ count = 10 }: { count?: number }) {
  const { viewMode } = useFeatureFlags();

  if (viewMode === "list") {
    return (
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <ListSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <GridSkeleton key={i} />
      ))}
    </div>
  );
}
