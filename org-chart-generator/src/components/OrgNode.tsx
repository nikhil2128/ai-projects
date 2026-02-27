import type { OrgNode as OrgNodeType } from "../types/org";

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
  node: OrgNodeType;
  depth: number;
}

export default function OrgNodeCard({ node, depth }: OrgNodeCardProps) {
  const colors = TIER_COLORS[depth % TIER_COLORS.length];
  const hasChildren = node.children && node.children.length > 0;

  return (
    <li className="flex flex-col items-center relative">
      <div
        className={`
          relative group px-6 py-4 rounded-2xl bg-white shadow-md hover:shadow-xl
          border border-slate-100 transition-all duration-300 hover:-translate-y-1
          min-w-[180px] max-w-[220px]
          ring-2 ${colors.ring}
        `}
      >
        <div className="flex flex-col items-center text-center gap-2">
          <div
            className={`w-12 h-12 rounded-full ${colors.bg} ${colors.text} flex items-center justify-center text-sm font-bold shadow-lg`}
          >
            {getInitials(node.name)}
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm leading-tight">
              {node.name}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 leading-tight">
              {node.title}
            </p>
          </div>
        </div>
      </div>

      {hasChildren && (
        <ul className="org-tree-children flex flex-row gap-2 pt-8 relative">
          {node.children!.map((child, index) => (
            <OrgNodeCard key={index} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}
