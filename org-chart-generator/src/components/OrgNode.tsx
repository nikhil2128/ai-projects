import type { EditableOrgNode } from "../types/org";

const TIER_COLORS = [
  { bg: "bg-gradient-to-br from-indigo-500 to-purple-600", text: "text-white", ring: "ring-indigo-200" },
  { bg: "bg-gradient-to-br from-sky-500 to-blue-600", text: "text-white", ring: "ring-sky-200" },
  { bg: "bg-gradient-to-br from-emerald-500 to-teal-600", text: "text-white", ring: "ring-emerald-200" },
  { bg: "bg-gradient-to-br from-amber-500 to-orange-600", text: "text-white", ring: "ring-amber-200" },
  { bg: "bg-gradient-to-br from-rose-500 to-pink-600", text: "text-white", ring: "ring-rose-200" },
  { bg: "bg-gradient-to-br from-slate-500 to-slate-700", text: "text-white", ring: "ring-slate-200" },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface OrgNodeCardProps {
  node: EditableOrgNode;
  depth: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAddChild: (id: string) => void;
}

export default function OrgNodeCard({
  node,
  depth,
  onEdit,
  onDelete,
  onAddChild,
}: OrgNodeCardProps) {
  const colors = TIER_COLORS[depth % TIER_COLORS.length];

  return (
    <div
      className={`
        relative group px-6 py-5 rounded-2xl bg-white shadow-md hover:shadow-xl
        border border-slate-100 transition-all duration-300 hover:-translate-y-1
        w-[240px] min-h-[160px] ring-2 ${colors.ring}
      `}
    >
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        <button
          type="button"
          onClick={() => onEdit(node.id)}
          className="px-2 py-1 text-[11px] font-medium rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200"
          title="Edit team member"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onAddChild(node.id)}
          className="px-2 py-1 text-[11px] font-medium rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
          title="Add team member under this node"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => onDelete(node.id)}
          className="px-2 py-1 text-[11px] font-medium rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100"
          title="Delete team member"
        >
          Delete
        </button>
      </div>

      <div className="flex flex-col items-center text-center gap-2 h-full justify-center">
        <div
          className={`w-12 h-12 rounded-full ${colors.bg} ${colors.text} flex items-center justify-center text-sm font-bold shadow-lg`}
        >
          {getInitials(node.name)}
        </div>
        <div>
          <p className="font-semibold text-slate-900 text-sm leading-tight break-words">
            {node.name}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 leading-tight break-words">
            {node.title}
          </p>
        </div>
        {node.children.length > 0 && (
          <p className="text-[11px] mt-2 text-slate-400">
            {node.children.length} direct report
            {node.children.length > 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
