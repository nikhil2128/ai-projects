import dagre from "dagre";
import { Position, type Edge, type Node } from "@xyflow/react";

import type { OrgChart } from "./types";

const NODE_WIDTH = 250;
const NODE_HEIGHT = 106;

export function buildFlowLayout(chart: OrgChart): { nodes: Node[]; edges: Edge[] } {
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({
    rankdir: "TB",
    ranksep: 80,
    nodesep: 40,
    edgesep: 20,
    marginx: 20,
    marginy: 20
  });
  graph.setDefaultEdgeLabel(() => ({}));

  chart.nodes.forEach((node) => {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  chart.edges.forEach((edge) => {
    graph.setEdge(edge.managerId, edge.reportId);
  });

  dagre.layout(graph);

  const nodes: Node[] = chart.nodes.map((node) => {
    const position = graph.node(node.id);
    return {
      id: node.id,
      position: {
        x: position?.x ? position.x - NODE_WIDTH / 2 : 0,
        y: position?.y ? position.y - NODE_HEIGHT / 2 : 0
      },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      data: {
        label: [node.name, node.role, node.team ? `Team: ${node.team}` : ""].filter(Boolean).join("\n")
      },
      style: {
        width: NODE_WIDTH,
        borderRadius: 14,
        border: "1px solid #dae3fb",
        background: "linear-gradient(165deg, #ffffff 0%, #f0f5ff 100%)",
        boxShadow: "0 12px 24px -18px rgba(37, 61, 132, 0.7)",
        padding: 10,
        fontSize: 13,
        fontWeight: 600,
        whiteSpace: "pre-line",
        color: "#1c284d"
      }
    };
  });

  const edges: Edge[] = chart.edges.map((edge) => ({
    id: `${edge.managerId}->${edge.reportId}`,
    source: edge.managerId,
    target: edge.reportId,
    type: "smoothstep",
    animated: false,
    style: {
      stroke: "#7c87a6",
      strokeWidth: 2
    }
  }));

  return { nodes, edges };
}
