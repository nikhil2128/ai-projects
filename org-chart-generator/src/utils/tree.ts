import type { EditableOrgNode, OrgNode } from "../types/org";

export const NODE_WIDTH = 240;
export const NODE_HEIGHT = 160;
export const H_GAP = 40;
export const LEVEL_GAP = 220;
export const CANVAS_PADDING = 48;

export interface PositionedNode {
  node: EditableOrgNode;
  x: number;
  y: number;
  children: PositionedNode[];
}

export function buildEditableTree(
  node: OrgNode,
  getNextId: () => string,
): EditableOrgNode {
  return {
    id: getNextId(),
    name: node.name,
    title: node.title,
    children: (node.children ?? []).map((child) =>
      buildEditableTree(child, getNextId),
    ),
  };
}

export function updateNodeById(
  node: EditableOrgNode,
  nodeId: string,
  updates: Pick<EditableOrgNode, "name" | "title">,
): EditableOrgNode {
  if (node.id === nodeId) {
    return { ...node, ...updates };
  }

  return {
    ...node,
    children: node.children.map((child) =>
      updateNodeById(child, nodeId, updates),
    ),
  };
}

export function addChildById(
  node: EditableOrgNode,
  parentId: string,
  childToAdd: EditableOrgNode,
): EditableOrgNode {
  if (node.id === parentId) {
    return { ...node, children: [...node.children, childToAdd] };
  }

  return {
    ...node,
    children: node.children.map((child) =>
      addChildById(child, parentId, childToAdd),
    ),
  };
}

export function deleteNodeById(
  node: EditableOrgNode,
  nodeId: string,
): EditableOrgNode | null {
  if (node.id === nodeId) {
    return null;
  }

  return {
    ...node,
    children: node.children
      .map((child) => deleteNodeById(child, nodeId))
      .filter((child): child is EditableOrgNode => child !== null),
  };
}

export function findNodeById(
  node: EditableOrgNode,
  nodeId: string,
): EditableOrgNode | null {
  if (node.id === nodeId) return node;

  for (const child of node.children) {
    const found = findNodeById(child, nodeId);
    if (found) return found;
  }

  return null;
}

export function shiftSubtreeX(
  positioned: PositionedNode,
  dx: number,
): PositionedNode {
  return {
    ...positioned,
    x: positioned.x + dx,
    children: positioned.children.map((child) => shiftSubtreeX(child, dx)),
  };
}

export function layoutTree(
  node: EditableOrgNode,
  depth = 0,
): { positioned: PositionedNode; width: number; maxDepth: number } {
  const childLayouts = node.children.map((child) =>
    layoutTree(child, depth + 1),
  );
  const childrenWidth =
    childLayouts.length > 0
      ? childLayouts.reduce((sum, child) => sum + child.width, 0) +
        H_GAP * (childLayouts.length - 1)
      : 0;
  const subtreeWidth = Math.max(NODE_WIDTH, childrenWidth);

  let xCursor = (subtreeWidth - childrenWidth) / 2;
  const positionedChildren = childLayouts.map((child) => {
    const shifted = shiftSubtreeX(child.positioned, xCursor);
    xCursor += child.width + H_GAP;
    return shifted;
  });

  return {
    width: subtreeWidth,
    maxDepth:
      childLayouts.length > 0
        ? Math.max(...childLayouts.map((child) => child.maxDepth))
        : depth,
    positioned: {
      node,
      x: (subtreeWidth - NODE_WIDTH) / 2,
      y: depth * LEVEL_GAP,
      children: positionedChildren,
    },
  };
}

export function flattenNodes(root: PositionedNode): PositionedNode[] {
  return [root, ...root.children.flatMap(flattenNodes)];
}

export function flattenEdges(
  root: PositionedNode,
): Array<{ fromX: number; fromY: number; toX: number; toY: number }> {
  return root.children.flatMap((child) => [
    {
      fromX: root.x + NODE_WIDTH / 2,
      fromY: root.y + NODE_HEIGHT,
      toX: child.x + NODE_WIDTH / 2,
      toY: child.y,
    },
    ...flattenEdges(child),
  ]);
}
