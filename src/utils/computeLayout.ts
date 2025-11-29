import type { RBNode } from '../core/RBTree';

export interface LayoutNode {
  id: number;
  value: number;
  color: string;
  x: number;
  y: number;
  parentId: number | null;
  leftId: number | null;
  rightId: number | null;
}

export interface Layout {
  nodes: LayoutNode[];
  edges: { from: number; to: number }[];
  width: number;
  height: number;
}

// Compute a simple inorder-based layout for a BST-like tree.
export function computeTreeLayout(root: RBNode | null, width = 1000, height = 500): Layout {
  const nodes: LayoutNode[] = [];
  const edges: { from: number; to: number }[] = [];

  if (!root) return { nodes, edges, width, height };

  // Subtree-width layout matching TreeVisualizer
  const margin = 40;

  const countNodes = (n: RBNode | null): number => {
    if (!n) return 1; // NIL counts as 1
    return countNodes(n.left) + countNodes(n.right);
  };

  const traverse = (n: RBNode | null, depth: number, leftBound: number, rightBound: number, parentId: number | null, isLeft: boolean) => {
    const y = 50 + depth * 60;
    const midX = (leftBound + rightBound) / 2;

    if (!n) {
        // Add NIL node
        if (parentId !== null) {
            const id = -((parentId * 10) + (isLeft ? 1 : 2));
            nodes.push({
                id,
                value: NaN,
                color: 'BLACK',
                x: midX, y,
                parentId,
                leftId: null, rightId: null
            });
        }
        return;
    }

    nodes.push({
      id: n.id,
      value: n.value,
      color: n.color,
      x: midX,
      y,
      parentId: n.parentId ?? null,
      leftId: n.left ? n.left.id : null,
      rightId: n.right ? n.right.id : null,
    });

    const leftCount = countNodes(n.left);
    const rightCount = countNodes(n.right);
    const totalCount = leftCount + rightCount;
    const splitRatio = totalCount > 0 ? leftCount / totalCount : 0.5;
    const splitX = leftBound + (rightBound - leftBound) * splitRatio;

    traverse(n.left, depth + 1, leftBound, splitX, n.id, true);
    traverse(n.right, depth + 1, splitX, rightBound, n.id, false);
  };

  traverse(root, 0, margin, width - margin, null, false);

  const nodeMap = new Map<number, LayoutNode>();
  nodes.forEach(n => nodeMap.set(n.id, n));

  // Build edges from parent-child IDs
  nodes.forEach(n => {
    if (n.id > 0) {
        if (n.leftId) edges.push({ from: n.id, to: n.leftId });
        else {
            // Edge to Left NIL
            const nilId = -((n.id * 10) + 1);
            if (nodeMap.has(nilId)) edges.push({ from: n.id, to: nilId });
        }

        if (n.rightId) edges.push({ from: n.id, to: n.rightId });
        else {
            // Edge to Right NIL
            const nilId = -((n.id * 10) + 2);
            if (nodeMap.has(nilId)) edges.push({ from: n.id, to: nilId });
        }
    }
  });

  return { nodes, edges, width, height };
}
