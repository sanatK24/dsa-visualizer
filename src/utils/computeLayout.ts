export interface TreeNode {
  id: number;
  value: number;
  color: 'RED' | 'BLACK';
  left: TreeNode | null;
  right: TreeNode | null;
}

export interface LayoutNode {
  id: number;
  value: number;
  color: 'RED' | 'BLACK';
  x: number;
  y: number;
}

export interface LayoutEdge {
  from: number;
  to: number;
}

export interface TreeLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
}

export function computeTreeLayout(
  root: TreeNode | null,
  width: number,
  height: number
): TreeLayout {
  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];

  if (!root) {
    return { nodes, edges };
  }

  // Calculate tree depth for spacing
  const getDepth = (node: TreeNode | null): number => {
    if (!node) return 0;
    return 1 + Math.max(getDepth(node.left), getDepth(node.right));
  };

  const depth = getDepth(root);
  const verticalSpacing = height / (depth + 1);

  // Position nodes using in-order traversal for horizontal spacing
  let inOrderIndex = 0;
  const nodePositions = new Map<number, { x: number; y: number }>();

  const countNodes = (node: TreeNode | null): number => {
    if (!node) return 0;
    return 1 + countNodes(node.left) + countNodes(node.right);
  };

  const totalNodes = countNodes(root);
  const horizontalSpacing = width / (totalNodes + 1);

  const traverse = (node: TreeNode | null, level: number): void => {
    if (!node) return;

    // In-order traversal: left, root, right
    traverse(node.left, level + 1);

    inOrderIndex++;
    const x = inOrderIndex * horizontalSpacing;
    const y = (level + 1) * verticalSpacing;

    nodePositions.set(node.id, { x, y });
    nodes.push({
      id: node.id,
      value: node.value,
      color: node.color,
      x,
      y,
    });

    // Add edges
    if (node.left) {
      edges.push({ from: node.id, to: node.left.id });
    }
    if (node.right) {
      edges.push({ from: node.id, to: node.right.id });
    }

    traverse(node.right, level + 1);
  };

  traverse(root, 0);

  return { nodes, edges };
}
