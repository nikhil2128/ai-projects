import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
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
  toOrgNode,
  NODE_WIDTH,
  NODE_HEIGHT,
  LEVEL_GAP,
  CANVAS_PADDING,
} from "../utils/tree";
import type { PositionedNode } from "../utils/tree";

interface OrgChartProps {
  data: OrgNode;
  onTreeChange?: (data: OrgNode) => void;
}

export interface OrgChartHandle {
  downloadPng: () => Promise<void>;
  downloadSvg: () => Promise<void>;
}

type DialogState =
  | { type: "edit"; nodeId: string; name: string; title: string }
  | { type: "add-child"; parentId: string; name: string; title: string }
  | { type: "add-root"; name: string; title: string }
  | null;

interface Transform {
  scale: number;
  x: number;
  y: number;
}

const MIN_SCALE = 0.05;
const MAX_SCALE = 2;
const ZOOM_STEP = 1.25;

const OrgChart = forwardRef<OrgChartHandle, OrgChartProps>(function OrgChart({ data, onTreeChange }, ref) {
  const chartRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const idCounterRef = useRef(0);
  const [downloading, setDownloading] = useState(false);
  const [root, setRoot] = useState<EditableOrgNode | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const userActionRef = useRef(false);
  const [transform, setTransform] = useState<Transform>({ scale: 1, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startTx: number;
    startTy: number;
    dragging: boolean;
  } | null>(null);

  useImperativeHandle(ref, () => ({
    async downloadPng() {
      if (!chartRef.current) return;
      await downloadAsPng(chartRef.current);
    },
    async downloadSvg() {
      if (!chartRef.current) return;
      await downloadAsSvg(chartRef.current);
    },
  }));

  const getNextId = () => {
    const next = idCounterRef.current;
    idCounterRef.current += 1;
    return `node-${next}`;
  };

  useEffect(() => {
    idCounterRef.current = 0;
    setRoot(
      buildEditableTree(data, () => {
        const next = idCounterRef.current;
        idCounterRef.current += 1;
        return `node-${next}`;
      }),
    );
  }, [data]);

  useEffect(() => {
    if (!root || !userActionRef.current) return;
    userActionRef.current = false;
    onTreeChange?.(toOrgNode(root));
  }, [root, onTreeChange]);

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

  // ── Zoom / pan ─────────────────────────────────────────────

  const fitToView = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 32;
    const availW = rect.width - pad * 2;
    const availH = rect.height - pad * 2;
    if (availW <= 0 || availH <= 0) return;
    const scaleX = availW / canvasWidth;
    const scaleY = availH / canvasHeight;
    const scale = Math.min(scaleX, scaleY, 1);
    const x = (rect.width - canvasWidth * scale) / 2;
    const y = (rect.height - canvasHeight * scale) / 2;
    setTransform({ scale, x, y });
  }, [canvasWidth, canvasHeight]);

  useEffect(() => {
    fitToView();
  }, [fitToView]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => fitToView());
    obs.observe(el);
    return () => obs.disconnect();
  }, [fitToView]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      if (e.ctrlKey || e.metaKey) {
        const factor = 1 - e.deltaY * 0.01;
        setTransform(prev => {
          const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale * factor));
          const ratio = newScale / prev.scale;
          return { scale: newScale, x: mx - ratio * (mx - prev.x), y: my - ratio * (my - prev.y) };
        });
      } else {
        setTransform(prev => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, a, [role="button"]')) return;

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTx: transform.x,
      startTy: transform.y,
      dragging: false,
    };
    viewportRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (!dragRef.current.dragging && Math.sqrt(dx * dx + dy * dy) < 4) return;

    if (!dragRef.current.dragging) {
      dragRef.current.dragging = true;
      setIsPanning(true);
    }

    setTransform({
      scale: transform.scale,
      x: dragRef.current.startTx + dx,
      y: dragRef.current.startTy + dy,
    });
  };

  const handlePointerUp = () => {
    dragRef.current = null;
    setIsPanning(false);
  };

  const zoomIn = () => {
    setTransform(prev => {
      const newScale = Math.min(MAX_SCALE, prev.scale * ZOOM_STEP);
      if (!viewportRef.current) return { ...prev, scale: newScale };
      const rect = viewportRef.current.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const ratio = newScale / prev.scale;
      return { scale: newScale, x: cx - ratio * (cx - prev.x), y: cy - ratio * (cy - prev.y) };
    });
  };

  const zoomOut = () => {
    setTransform(prev => {
      const newScale = Math.max(MIN_SCALE, prev.scale / ZOOM_STEP);
      if (!viewportRef.current) return { ...prev, scale: newScale };
      const rect = viewportRef.current.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const ratio = newScale / prev.scale;
      return { scale: newScale, x: cx - ratio * (cx - prev.x), y: cy - ratio * (cy - prev.y) };
    });
  };

  // ── Node editing handlers ──────────────────────────────────

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

    userActionRef.current = true;
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
    if (!name) return;

    userActionRef.current = true;
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

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="flex flex-col w-full h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-center gap-3 py-3 px-6 shrink-0 border-b border-slate-100 bg-white/80 backdrop-blur-sm">
        <button
          onClick={() => handleDownload("png")}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Download PNG
        </button>
        <button
          onClick={() => handleDownload("svg")}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-5 py-2 bg-white text-slate-700 font-medium rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
          </svg>
          Download SVG
        </button>
      </div>

      {/* Zoomable viewport */}
      <div
        ref={viewportRef}
        className="flex-1 relative overflow-hidden org-chart-viewport"
        style={{ cursor: isPanning ? "grabbing" : "grab" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Dot-grid canvas background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, #d1d5db 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        {/* Transformed chart layer */}
        <div
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: "0 0",
            willChange: "transform",
          }}
        >
          <div
            ref={chartRef}
            className="org-chart-container relative"
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
                  <defs>
                    <linearGradient id="edge-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a5b4fc" />
                      <stop offset="100%" stopColor="#c7d2fe" />
                    </linearGradient>
                  </defs>
                  {edges.map((edge, index) => {
                    const fromX = edge.fromX + CANVAS_PADDING;
                    const fromY = edge.fromY + CANVAS_PADDING;
                    const toX = edge.toX + CANVAS_PADDING;
                    const toY = edge.toY + CANVAS_PADDING;
                    const cpOffset = (toY - fromY) * 0.45;

                    return (
                      <path
                        key={index}
                        d={`M ${fromX} ${fromY} C ${fromX} ${fromY + cpOffset}, ${toX} ${toY - cpOffset}, ${toX} ${toY}`}
                        fill="none"
                        stroke="url(#edge-grad)"
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

        {/* Zoom controls */}
        <div className="absolute bottom-4 right-4 flex items-center gap-0.5 bg-white/95 backdrop-blur rounded-xl shadow-lg border border-slate-200 p-1 select-none">
          <button
            type="button"
            onClick={zoomOut}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            title="Zoom out"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
            </svg>
          </button>

          <span className="w-12 text-center text-xs font-medium text-slate-600 tabular-nums">
            {Math.round(transform.scale * 100)}%
          </span>

          <button
            type="button"
            onClick={zoomIn}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            title="Zoom in"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>

          <div className="w-px h-5 bg-slate-200 mx-0.5" />

          <button
            type="button"
            onClick={fitToView}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            title="Fit to view"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
          </button>
        </div>

        {/* Keyboard hint */}
        <div className="absolute bottom-4 left-4 text-[11px] text-slate-400 select-none pointer-events-none leading-relaxed">
          Scroll to pan &middot; Ctrl + scroll to zoom
        </div>
      </div>

      {/* Edit / Add dialog */}
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
                <span className="text-sm text-slate-700">Role <span className="text-slate-400 font-normal">(optional)</span></span>
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
                disabled={!dialog.name.trim()}
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
});

export default OrgChart;
