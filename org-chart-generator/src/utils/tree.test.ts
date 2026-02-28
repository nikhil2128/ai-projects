import { describe, it, expect } from "vitest";
import type { EditableOrgNode, OrgNode } from "../types/org";
import {
  buildEditableTree,
  updateNodeById,
  addChildById,
  deleteNodeById,
  findNodeById,
  shiftSubtreeX,
  layoutTree,
  flattenNodes,
  flattenEdges,
  NODE_WIDTH,
  NODE_HEIGHT,
  H_GAP,
  LEVEL_GAP,
  CANVAS_PADDING,
} from "./tree";

function makeNode(
  id: string,
  name: string,
  title: string,
  children: EditableOrgNode[] = [],
): EditableOrgNode {
  return { id, name, title, children };
}

describe("tree constants", () => {
  it("exports expected layout constants", () => {
    expect(NODE_WIDTH).toBe(240);
    expect(NODE_HEIGHT).toBe(160);
    expect(H_GAP).toBe(40);
    expect(LEVEL_GAP).toBe(220);
    expect(CANVAS_PADDING).toBe(48);
  });
});

describe("buildEditableTree", () => {
  it("converts a single OrgNode to an EditableOrgNode", () => {
    const org: OrgNode = { name: "Alice", title: "CEO" };
    let counter = 0;
    const result = buildEditableTree(org, () => `n-${counter++}`);

    expect(result).toEqual({
      id: "n-0",
      name: "Alice",
      title: "CEO",
      children: [],
    });
  });

  it("recursively converts children", () => {
    const org: OrgNode = {
      name: "Alice",
      title: "CEO",
      children: [
        { name: "Bob", title: "CTO" },
        {
          name: "Carol",
          title: "CFO",
          children: [{ name: "Dave", title: "Accountant" }],
        },
      ],
    };
    let counter = 0;
    const result = buildEditableTree(org, () => `n-${counter++}`);

    expect(result.id).toBe("n-0");
    expect(result.children).toHaveLength(2);
    expect(result.children[0].name).toBe("Bob");
    expect(result.children[0].id).toBe("n-1");
    expect(result.children[1].name).toBe("Carol");
    expect(result.children[1].id).toBe("n-2");
    expect(result.children[1].children[0].name).toBe("Dave");
    expect(result.children[1].children[0].id).toBe("n-3");
  });

  it("handles undefined children as empty array", () => {
    const org: OrgNode = { name: "Solo", title: "Only" };
    let counter = 0;
    const result = buildEditableTree(org, () => `n-${counter++}`);
    expect(result.children).toEqual([]);
  });
});

describe("updateNodeById", () => {
  const tree = makeNode("1", "Alice", "CEO", [
    makeNode("2", "Bob", "CTO"),
    makeNode("3", "Carol", "CFO"),
  ]);

  it("updates the root node", () => {
    const updated = updateNodeById(tree, "1", {
      name: "Alicia",
      title: "Founder",
    });
    expect(updated.name).toBe("Alicia");
    expect(updated.title).toBe("Founder");
    expect(updated.children).toHaveLength(2);
  });

  it("updates a child node", () => {
    const updated = updateNodeById(tree, "2", {
      name: "Robert",
      title: "VP Engineering",
    });
    expect(updated.name).toBe("Alice");
    expect(updated.children[0].name).toBe("Robert");
    expect(updated.children[0].title).toBe("VP Engineering");
  });

  it("returns unchanged tree when nodeId not found", () => {
    const updated = updateNodeById(tree, "999", {
      name: "X",
      title: "Y",
    });
    expect(updated).toEqual(tree);
  });
});

describe("addChildById", () => {
  const tree = makeNode("1", "Alice", "CEO", [
    makeNode("2", "Bob", "CTO"),
  ]);

  it("adds a child to the specified parent", () => {
    const newChild = makeNode("3", "Carol", "CFO");
    const updated = addChildById(tree, "1", newChild);
    expect(updated.children).toHaveLength(2);
    expect(updated.children[1].name).toBe("Carol");
  });

  it("adds a child to a nested node", () => {
    const newChild = makeNode("3", "Dave", "Engineer");
    const updated = addChildById(tree, "2", newChild);
    expect(updated.children[0].children).toHaveLength(1);
    expect(updated.children[0].children[0].name).toBe("Dave");
  });

  it("returns unchanged tree when parentId not found", () => {
    const newChild = makeNode("3", "X", "Y");
    const updated = addChildById(tree, "999", newChild);
    expect(updated).toEqual(tree);
  });
});

describe("deleteNodeById", () => {
  it("returns null when deleting the root", () => {
    const tree = makeNode("1", "Alice", "CEO");
    expect(deleteNodeById(tree, "1")).toBeNull();
  });

  it("removes a child node", () => {
    const tree = makeNode("1", "Alice", "CEO", [
      makeNode("2", "Bob", "CTO"),
      makeNode("3", "Carol", "CFO"),
    ]);
    const updated = deleteNodeById(tree, "2");
    expect(updated).not.toBeNull();
    expect(updated!.children).toHaveLength(1);
    expect(updated!.children[0].name).toBe("Carol");
  });

  it("removes a deeply nested node", () => {
    const tree = makeNode("1", "Alice", "CEO", [
      makeNode("2", "Bob", "CTO", [makeNode("4", "Dave", "Engineer")]),
      makeNode("3", "Carol", "CFO"),
    ]);
    const updated = deleteNodeById(tree, "4");
    expect(updated!.children[0].children).toHaveLength(0);
  });

  it("returns unchanged tree when nodeId not found", () => {
    const tree = makeNode("1", "Alice", "CEO");
    const updated = deleteNodeById(tree, "999");
    expect(updated).toEqual(tree);
  });
});

describe("findNodeById", () => {
  const tree = makeNode("1", "Alice", "CEO", [
    makeNode("2", "Bob", "CTO", [makeNode("4", "Dave", "Engineer")]),
    makeNode("3", "Carol", "CFO"),
  ]);

  it("finds the root node", () => {
    const found = findNodeById(tree, "1");
    expect(found?.name).toBe("Alice");
  });

  it("finds a nested node", () => {
    const found = findNodeById(tree, "4");
    expect(found?.name).toBe("Dave");
  });

  it("returns null when not found", () => {
    expect(findNodeById(tree, "999")).toBeNull();
  });
});

describe("shiftSubtreeX", () => {
  it("shifts node and children by dx", () => {
    const positioned = {
      node: makeNode("1", "A", "A"),
      x: 10,
      y: 0,
      children: [
        {
          node: makeNode("2", "B", "B"),
          x: 5,
          y: 220,
          children: [],
        },
      ],
    };
    const shifted = shiftSubtreeX(positioned, 100);
    expect(shifted.x).toBe(110);
    expect(shifted.children[0].x).toBe(105);
  });

  it("handles negative dx", () => {
    const positioned = {
      node: makeNode("1", "A", "A"),
      x: 100,
      y: 0,
      children: [],
    };
    const shifted = shiftSubtreeX(positioned, -50);
    expect(shifted.x).toBe(50);
  });
});

describe("layoutTree", () => {
  it("lays out a single node at the origin", () => {
    const node = makeNode("1", "Alice", "CEO");
    const { positioned, width, maxDepth } = layoutTree(node);

    expect(width).toBe(NODE_WIDTH);
    expect(maxDepth).toBe(0);
    expect(positioned.x).toBe(0);
    expect(positioned.y).toBe(0);
    expect(positioned.children).toHaveLength(0);
  });

  it("lays out a parent with two children", () => {
    const node = makeNode("1", "Alice", "CEO", [
      makeNode("2", "Bob", "CTO"),
      makeNode("3", "Carol", "CFO"),
    ]);
    const { positioned, width, maxDepth } = layoutTree(node);

    expect(maxDepth).toBe(1);
    expect(width).toBe(NODE_WIDTH * 2 + H_GAP);
    expect(positioned.children).toHaveLength(2);
    expect(positioned.children[0].y).toBe(LEVEL_GAP);
    expect(positioned.children[1].y).toBe(LEVEL_GAP);
    expect(positioned.children[0].x).toBeLessThan(positioned.children[1].x);
  });

  it("respects depth for nested trees", () => {
    const node = makeNode("1", "A", "A", [
      makeNode("2", "B", "B", [makeNode("3", "C", "C")]),
    ]);
    const { maxDepth, positioned } = layoutTree(node);

    expect(maxDepth).toBe(2);
    const leafNode = positioned.children[0].children[0];
    expect(leafNode.y).toBe(2 * LEVEL_GAP);
  });
});

describe("flattenNodes", () => {
  it("flattens a tree of positioned nodes", () => {
    const node = makeNode("1", "A", "A", [
      makeNode("2", "B", "B"),
      makeNode("3", "C", "C"),
    ]);
    const { positioned } = layoutTree(node);
    const flat = flattenNodes(positioned);

    expect(flat).toHaveLength(3);
    const names = flat.map((p) => p.node.name);
    expect(names).toContain("A");
    expect(names).toContain("B");
    expect(names).toContain("C");
  });

  it("returns single node for leaf", () => {
    const node = makeNode("1", "Solo", "Solo");
    const { positioned } = layoutTree(node);
    expect(flattenNodes(positioned)).toHaveLength(1);
  });
});

describe("flattenEdges", () => {
  it("returns empty for a leaf node", () => {
    const node = makeNode("1", "A", "A");
    const { positioned } = layoutTree(node);
    expect(flattenEdges(positioned)).toHaveLength(0);
  });

  it("returns edges for parent-child connections", () => {
    const node = makeNode("1", "A", "A", [
      makeNode("2", "B", "B"),
      makeNode("3", "C", "C"),
    ]);
    const { positioned } = layoutTree(node);
    const edges = flattenEdges(positioned);

    expect(edges).toHaveLength(2);
    edges.forEach((edge) => {
      expect(edge.fromY).toBe(NODE_HEIGHT);
      expect(edge.toY).toBe(LEVEL_GAP);
    });
  });

  it("returns edges for multi-level trees", () => {
    const node = makeNode("1", "A", "A", [
      makeNode("2", "B", "B", [makeNode("4", "D", "D")]),
      makeNode("3", "C", "C"),
    ]);
    const { positioned } = layoutTree(node);
    const edges = flattenEdges(positioned);
    expect(edges).toHaveLength(3);
  });
});
