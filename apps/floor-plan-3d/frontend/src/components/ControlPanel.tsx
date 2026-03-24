import { FloorPlan, ROOM_COLORS, ROOM_TYPE_LABELS, RoomType } from '../types';

interface ControlPanelProps {
  floorPlan: FloorPlan;
  wallHeight: number;
  onWallHeightChange: (h: number) => void;
  showLabels: boolean;
  onShowLabelsChange: (v: boolean) => void;
  showGrid: boolean;
  onShowGridChange: (v: boolean) => void;
}

export function ControlPanel({
  floorPlan,
  wallHeight,
  onWallHeightChange,
  showLabels,
  onShowLabelsChange,
  showGrid,
  onShowGridChange,
}: ControlPanelProps) {
  const usedTypes = [...new Set(floorPlan.rooms.map((r) => r.type))];

  return (
    <div className="space-y-5">
      <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
        <p className="text-xs font-medium text-indigo-700 mb-1">Floor Plan Summary</p>
        <p className="text-sm text-indigo-600">
          {floorPlan.rooms.length} rooms &middot;{' '}
          {floorPlan.totalWidth} &times; {floorPlan.totalLength} {floorPlan.unit}
        </p>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 flex items-center justify-between">
          Wall Height
          <span className="text-xs font-normal text-gray-500">
            {wallHeight} {floorPlan.unit}
          </span>
        </label>
        <input
          type="range"
          min={1}
          max={20}
          step={0.5}
          value={wallHeight}
          onChange={(e) => onWallHeightChange(parseFloat(e.target.value))}
          className="w-full mt-1.5 accent-indigo-600"
        />
      </div>

      <div className="space-y-2">
        <Toggle label="Show Labels" checked={showLabels} onChange={onShowLabelsChange} />
        <Toggle label="Show Grid" checked={showGrid} onChange={onShowGridChange} />
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Room Legend</p>
        <div className="space-y-1.5">
          {usedTypes.map((type) => {
            const rooms = floorPlan.rooms.filter((r) => r.type === type);
            return (
              <div key={type} className="flex items-center gap-2 text-sm">
                <span
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: ROOM_COLORS[type as RoomType] }}
                />
                <span className="text-gray-700">
                  {ROOM_TYPE_LABELS[type as RoomType]}
                </span>
                <span className="text-gray-400 text-xs ml-auto">
                  {rooms.length}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Room Details</p>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {floorPlan.rooms.map((room, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded-md"
            >
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: ROOM_COLORS[room.type] }}
              />
              <span className="text-gray-800 truncate">{room.name}</span>
              <span className="text-gray-400 text-xs ml-auto whitespace-nowrap">
                {room.width} &times; {room.length}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-9 h-5 bg-gray-300 peer-checked:bg-indigo-600 rounded-full transition-colors" />
        <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow
          peer-checked:translate-x-4 transition-transform" />
      </div>
    </label>
  );
}
