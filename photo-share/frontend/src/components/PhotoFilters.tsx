'use client';

interface Props {
  imageUrl: string;
  selectedFilter: string;
  onSelectFilter: (filter: string) => void;
}

const FILTERS = [
  { name: 'none', label: 'Original' },
  { name: 'grayscale', label: 'Grayscale' },
  { name: 'sepia', label: 'Sepia' },
  { name: 'saturate', label: 'Saturate' },
  { name: 'contrast', label: 'Contrast' },
  { name: 'brightness', label: 'Bright' },
  { name: 'warm', label: 'Warm' },
  { name: 'cool', label: 'Cool' },
  { name: 'vintage', label: 'Vintage' },
  { name: 'hue-rotate', label: 'Hue Shift' },
  { name: 'invert', label: 'Invert' },
];

export default function PhotoFilters({
  imageUrl,
  selectedFilter,
  onSelectFilter,
}: Props) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">Choose a Filter</h3>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {FILTERS.map((f) => (
          <button
            key={f.name}
            onClick={() => onSelectFilter(f.name)}
            className={`flex flex-shrink-0 flex-col items-center gap-1 rounded-lg p-1.5 transition-all ${
              selectedFilter === f.name
                ? 'bg-pink-50 ring-2 ring-pink-400'
                : 'hover:bg-gray-50'
            }`}
          >
            <div className="h-16 w-16 overflow-hidden rounded-lg bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={f.label}
                className={`h-full w-full object-cover filter-${f.name}`}
              />
            </div>
            <span className="text-[10px] font-medium text-gray-600">
              {f.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
