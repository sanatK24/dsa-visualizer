export type MSResult = {
  m: number[][];
  s: number[][];
};

export function matrixChainOrder(p: number[]): MSResult {
  const n = p.length - 1; // number of matrices
  // initialize m (n+1 x n+1) zero-filled
  const m: number[][] = Array.from({ length: n + 1 }, () => Array(n + 1).fill(0));
  const s: number[][] = Array.from({ length: n + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= n; i++) m[i][i] = 0;

  for (let L = 2; L <= n; L++) {
    for (let i = 1; i <= n - L + 1; i++) {
      const j = i + L - 1;
      m[i][j] = Infinity as any;
      for (let k = i; k <= j - 1; k++) {
        const q = m[i][k] + m[k + 1][j] + p[i - 1] * p[k] * p[j];
        if (q < m[i][j]) {
          m[i][j] = q;
          s[i][j] = k;
        }
      }
    }
  }

  return { m, s };
}

export type TreeNode = {
  id: string;
  label: string;
  left?: TreeNode | null;
  right?: TreeNode | null;
};

let _nodeCounter = 0;
function nextId() { return `n${++_nodeCounter}`; }

export function buildParenthesisTree(s: number[][], i: number, j: number): TreeNode {
  if (i === j) {
    return { id: nextId(), label: `A${i}` };
  }
  const k = s[i][j];
  const left = buildParenthesisTree(s, i, k);
  const right = buildParenthesisTree(s, k + 1, j);
  return { id: nextId(), label: `(${i}-${j})`, left, right };
}

export function parenthesizationFromS(s: number[][], i: number, j: number): string {
  if (i === j) return `A${i}`;
  const k = s[i][j];
  return `(${parenthesizationFromS(s, i, k)} ${parenthesizationFromS(s, k + 1, j)})`;
}
