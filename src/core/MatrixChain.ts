export interface TreeNode {
  id: number;
  label: string;
  left?: TreeNode | null;
  right?: TreeNode | null;
}

export interface MatrixChainResult {
  m: number[][];
  s: number[][];
  minCost: number;
}

/**
 * Matrix Chain Multiplication - compute optimal cost and split points
 * @param p - array of dimensions where matrix i has dimensions p[i-1] x p[i]
 * @returns object containing m table (costs), s table (splits), and minimum cost
 */
export function matrixChainOrder(p: number[]): MatrixChainResult {
  const n = p.length - 1; // number of matrices
  const m: number[][] = Array(n + 1).fill(0).map(() => Array(n + 1).fill(0));
  const s: number[][] = Array(n + 1).fill(0).map(() => Array(n + 1).fill(0));

  // l is chain length
  for (let l = 2; l <= n; l++) {
    for (let i = 1; i <= n - l + 1; i++) {
      const j = i + l - 1;
      m[i][j] = Infinity;
      
      for (let k = i; k <= j - 1; k++) {
        const cost = m[i][k] + m[k + 1][j] + p[i - 1] * p[k] * p[j];
        if (cost < m[i][j]) {
          m[i][j] = cost;
          s[i][j] = k;
        }
      }
    }
  }

  return {
    m,
    s,
    minCost: n > 0 ? m[1][n] : 0
  };
}

/**
 * Build parenthesization tree from split table
 */
export function buildParenthesisTree(s: number[][], i: number, j: number, idCounter = { val: 0 }): TreeNode | null {
  if (i === j) {
    return {
      id: idCounter.val++,
      label: `A${i}`,
      left: null,
      right: null
    };
  }
  
  const k = s[i][j];
  const node: TreeNode = {
    id: idCounter.val++,
    label: `(${i},${j})`,
    left: buildParenthesisTree(s, i, k, idCounter),
    right: buildParenthesisTree(s, k + 1, j, idCounter)
  };
  
  return node;
}

/**
 * Generate parenthesization string from split table
 */
export function parenthesizationFromS(s: number[][], i: number, j: number): string {
  if (i === j) {
    return `A${i}`;
  }
  
  const k = s[i][j];
  const left = parenthesizationFromS(s, i, k);
  const right = parenthesizationFromS(s, k + 1, j);
  
  return `(${left} × ${right})`;
}
