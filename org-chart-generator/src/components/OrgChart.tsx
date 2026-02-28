import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { OrgNode } from "../types/org";
import type { EditableOrgNode } from "../types/org";
import OrgNodeCard from "./OrgNode";
import { downloadAsPng, downloadAsSvg } from "../utils/download";
import {
  buildEditableTree,
  updateNodeById,
  addChildById,
  deleteNodeById,
  findNodeById,
  layoutTree,
  flattenNodes,
  flattenEdges,
  NODE_WIDTH,
  NODE_HEIGHT,
  LEVEL_GAP,
  CANVAS_PADDING,
} from "../utils/tree";

interface OrgChartProps {
  data: OrgNode;
}

type DialogState =
  | { type: "edit"; nodeId: string; name: string; title: string }
  | { type: "add-child"; parentId: string; name: string; title: string }
  | { type: "add-root"; name: string; title: string }
  | null;

export default function OrgChart({ data }: OrgChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const idCounterRef = useRef(0);
  const [downloading, setDownloading] = useState(false);
  const [root, setRoot] = useState<EditableOrgNode | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);

  const getNextId = () => {
    const next = idCounterRef.current;
    idCounterRef.current += 1;
    return `node-${next}`;
  };

  useEffect(() => {
    setRoot(
      buildEditableTree(data, () => {
        const next = idCounterRef.current;
        idCounterRef.current += 1;
        return `node-${next}`;
      }),
    );
  }, [data]);

  const layout = useMemo(() => {
    if (!root) return null;
    return layoutTree(root);
  }, [root]);

  const positionedNodes: PositionedNode[] = useMemo(() => {
    if (!layout) return [];
    return flattenNodes(layout.positioned);
  }, [layout]);

  const edges: Array<{ fromX: number; fromY: number; toX: number; toY: number }> =
    useMemo(() => {
    if (!layout) return [];
    return flattenEdges(layout.positioned);
    }, [layout]);

  const canvasWidth = layout ? layout.width + CANVAS_PADDING * 2 : NODE_WIDTH + CANVAS_PADDING * 2;
  const canvasHeight = layout
    ? (layout.maxDepth + 1) * LEVEL_GAP + NODE_HEIGHT + CANVAS_PADDING * 2
    : NODE_HEIGHT + CANVAS_PADDING * 2;

  const handleDownload = async (format: "png" | "svg") => {
    if (!chartRef.current) return;
    setDownloading(true);
    try {
      if (format === "png") {
        await downloadAsPng(chartRef.current);
      } else {
        await downloadAsSvg(chartRef.current);
      }
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  const handleEditClick = (nodeId: string) => {
    if (!root) return;
    const node = findNodeById(root, nodeId);
    if (!node) return;
    setDialog({
      type: "edit",
      nodeId,
      name: node.name,
      title: node.title,
    });
  };

  const handleAddChildClick = (parentId: string) => {
    setDialog({
      type: "add-child",
      parentId,
      name: "",
      title: "",
    });
  };

  const handleDeleteClick = (nodeId: string) => {
    if (!root) return;
    const target = findNodeById(root, nodeId);
    if (!target) return;
    const confirmed = window.confirm(
      `Delete ${target.name}${target.children.length > 0 ? " and all reports under this node" : ""}?`,
    );
    if (!confirmed) return;

    setRoot((current) => {
      if (!current) return current;
      return deleteNodeById(current, nodeId);
    });
  };

  const closeDialog = () => setDialog(null);

  const handleDialogNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDialog((current) =>
      current ? { ...current, name: event.target.value } : current,
    );
  };

  const handleDialogTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDialog((current) =>
      current ? { ...current, title: event.target.value } : current,
    );
  };

  const submitDialog = () => {
    if (!dialog) return;

    const name = dialog.name.trim();
    const title = dialog.title.trim();
    if (!name || !title) return;

    setRoot((current) => {
      if (dialog.type === "add-root") {
        return {
          id: getNextId(),
          name,
          title,
          children: [],
        };
      }

      if (!current) return current;

      if (dialog.type === "edit") {
        return updateNodeById(current, dialog.nodeId, { name, title });
      }

      return addChildById(current, dialog.parentId, {
        id: getNextId(),
        name,
        title,
        children: [],
      });
    });

    closeDialog();
  };

  return (
    <div className="flex flex-col items-center w-full min-h-[calc(100vh-80px)] py-8 px-6">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => handleDownload("png")}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
          Download PNG
        </button>
        <button
          onClick={() => handleDownload("svg")}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 font-medium rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
            />
          </svg>
          Download SVG
        </button>
      </div>

      <div className="w-full overflow-x-auto pb-8">
        <div
          ref={chartRef}
          className="org-chart-container relative mx-auto rounded-2xl border border-slate-100 shadow-sm"
          style={{ width: canvasWidth, height: canvasHeight }}
        >
          {!root && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <p className="text-sm text-slate-500">
                Chart is empty. Add a root team member to continue.
              </p>
              <button
                type="button"
                onClick={() => setDialog({ type: "add-root", name: "", title: "" })}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
              >
                Add root member
              </button>
            </div>
          )}

          {root && (
            <>
              <svg
                className="absolute inset-0 pointer-events-none"
                width={canvasWidth}
                height={canvasHeight}
              >
                {edges.map((edge, index) => {
                  const fromX = edge.fromX + CANVAS_PADDING;
                  const fromY = edge.fromY + CANVAS_PADDING;
                  const toX = edge.toX + CANVAS_PADDING;
                  const toY = edge.toY + CANVAS_PADDING;
                  const midY = fromY + (toY - fromY) / 2;

                  return (
                    <path
                      key={index}
                      d={`M ${fromX} ${fromY} V ${midY} H ${toX} V ${toY}`}
                      fill="none"
                      stroke="#c7d2fe"
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  );
                })}
              </svg>

              {positionedNodes.map((positioned) => (
                <div
                  key={positioned.node.id}
                  className="absolute"
                  style={{
                    left: positioned.x + CANVAS_PADDING,
                    top: positioned.y + CANVAS_PADDING,
                    width: NODE_WIDTH,
                  }}
                >
                  <OrgNodeCard
                    node={positioned.node}
                    depth={Math.round(positioned.y / LEVEL_GAP)}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                    onAddChild={handleAddChildClick}
                  />
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={closeDialog}
          />
          <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              {dialog.type === "edit"
                ? "Edit team member"
                : dialog.type === "add-root"
                  ? "Add root team member"
                  : "Add team member"}
            </h3>
            <p className="text-sm text-slate-500 mb-5">
              Update the member details below.
            </p>

            <div className="space-y-4">
              <label className="block">
                <span className="text-sm text-slate-700">Name</span>
                <input
                  value={dialog.name}
                  onChange={handleDialogNameChange}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Jane Doe"
                />
              </label>

              <label className="block">
                <span className="text-sm text-slate-700">Role</span>
                <input
                  value={dialog.title}
                  onChange={handleDialogTitleChange}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Engineering Manager"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDialog}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitDialog}
                disabled={!dialog.name.trim() || !dialog.title.trim()}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
