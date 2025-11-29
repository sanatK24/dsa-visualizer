import { useMemo, useState, useEffect } from 'react';
import { typesetElementById } from '../utils/mathjax';
import { matrixChainOrder, buildParenthesisTree, parenthesizationFromS } from '../core/MatrixChain';
import type { TreeNode } from '../core/MatrixChain';
import type { Step } from '../core/RBTree';

type Props = {
  p?: number[];
  onStepsUpdate?: (steps: Step[]) => void;
  onPreviewSvg?: (svg: string) => void;
  activeStep?: Step | null;
  onDimensionsChange?: (dims: number[]) => void;
};

// Simple tree layout: compute subtree widths and positions
function layoutTree(root: TreeNode, nodeSize = 36) {
  let nodes: any[] = [];
  let edges: any[] = [];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  // post-order compute widths
  function compute(node: TreeNode | undefined | null): { width: number } {
    if (!node) return { width: 0 };
    const L = compute(node.left as any);
    const R = compute(node.right as any);
    const width = Math.max(1, (L.width || 0) + (R.width || 0));
    (node as any)._subWidth = width;
    return { width };
  }
  compute(root);

  // assign positions with in-order spacing
  let cursor = 0;
  const spacingX = Math.max(80, Math.floor(nodeSize * 3.2));
  const spacingY = Math.max(70, Math.floor(nodeSize * 2.8));
  const xOffset = Math.floor(spacingX / 2);
  const yOffset = Math.floor(spacingY / 2);

  function assign(node: TreeNode | undefined | null, depth = 0) {
    if (!node) return;
    const left = node.left as any;
    const right = node.right as any;
    assign(left, depth + 1);
    const x = cursor * spacingX + xOffset; // spacing
    const y = depth * spacingY + yOffset;
    nodes.push({ id: node.id, x, y, label: node.label });
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    cursor++;
    assign(right, depth + 1);
    if (left) edges.push({ from: node.id, to: left.id });
    if (right) edges.push({ from: node.id, to: right.id });
  }
  assign(root);
  // handle empty tree
  if (minX === Infinity) { minX = 0; maxX = spacingX; minY = 0; maxY = spacingY; }
  return { nodes, edges, nodeRadius: Math.max(12, Math.floor(nodeSize / 1.2)), minX, maxX, minY, maxY };
}

export default function MatrixChainVisualizer({ p, onStepsUpdate, onPreviewSvg, activeStep, onDimensionsChange }: Props) {
  // default example from your note
  const defaultDims = p ?? [4, 10, 3, 12, 20, 7];
  const [pInput, setPInput] = useState<string>(defaultDims.join(', '));
  const [dims, setDims] = useState<number[]>(defaultDims);
  const [error, setError] = useState<string | null>(null);
  const [bannerCollapsed, setBannerCollapsed] = useState(false);

  const { m, s } = useMemo(() => matrixChainOrder(dims), [dims.join(',')]);
  const n = dims.length - 1;
  const tree = useMemo(() => buildParenthesisTree(s, 1, n), [s]);

  const layout = useMemo(() => tree ? layoutTree(tree) : { nodes: [], edges: [], minX: 0, maxX: 400, minY: 0, maxY: 200, nodeRadius: 12 }, [tree]);
  const parenthesization = parenthesizationFromS(s, 1, n);

  // Build level-wise explanation steps (compatible with Step type)
  // Updated computeStepsForDims to include SVGs for the parenthesization tree in each step
  function computeStepsForDims(pv: number[]): Step[] {
    const steps: Step[] = [];
    let sid = 1;
    const nloc = pv.length - 1;
    const mloc: number[][] = Array.from({ length: nloc + 1 }, () => Array(nloc + 1).fill(0));
    const sloc: number[][] = Array.from({ length: nloc + 1 }, () => Array(nloc + 1).fill(0));

    // Level 1: all m[i,i] = 0 combined into one step
    const level1Lines: string[] = [];
    for (let i = 1; i <= nloc; i++) {
      mloc[i][i] = 0;
      level1Lines.push(`m[${i},${i}] = 0`);
    }
    steps.push({ id: sid++, type: 'INFO', description: `Level 1:\n${level1Lines.join('\n')}`, treeSnapshot: null, highlightedNodeIds: [], svg: undefined });

    // For each subsequent chain length L, collect all messages for that L and emit a single Step
    for (let L = 2; L <= nloc; L++) {
      const lines: string[] = [];
      lines.push(`Level ${L} (chain length = ${L})`);
      for (let i = 1; i <= nloc - L + 1; i++) {
        const j = i + L - 1;
        if (L === 2) {
          const cost = pv[i - 1] * pv[i] * pv[j];
          mloc[i][j] = cost;
          sloc[i][j] = i;
          lines.push(`m[${i}, ${j}] = ${pv[i - 1]} * ${pv[i]} * ${pv[j]} = ${cost} (k=${i})`);
        } else {
          lines.push(`Compute m[${i}, ${j}] by trying k from ${i} to ${j - 1}`);
          let best = Infinity;
          let bestK = i;
          for (let k = i; k <= j - 1; k++) {
            const q = mloc[i][k] + mloc[k + 1][j] + pv[i - 1] * pv[k] * pv[j];
            lines.push(`when k = ${k}: m[${i},${k}] + m[${k + 1},${j}] + p[${i - 1}]*p[${k}]*p[${j}] = ${mloc[i][k]} + ${mloc[k + 1][j]} + ${pv[i - 1]}*${pv[k]}*${pv[j]} = ${q}`);
            if (q < best) { best = q; bestK = k; }
          }
          mloc[i][j] = best;
          sloc[i][j] = bestK;
          lines.push(`⇒ m[${i}, ${j}] = ${best}, k = ${bestK}`);
        }
      }
      // Only generate SVG for the final level (when the tree is complete)
      if (L === nloc) {
        try {
          const treePreview = buildParenthesisTree(sloc, 1, nloc);
          const svg = buildPreviewSvg(treePreview);
          steps.push({ id: sid++, type: 'INFO', description: lines.join('\n'), treeSnapshot: null, highlightedNodeIds: [], svg });
        } catch (err) {
          // If tree building fails, just add the step without SVG
          steps.push({ id: sid++, type: 'INFO', description: lines.join('\n'), treeSnapshot: null, highlightedNodeIds: [], svg: undefined });
        }
      } else {
        steps.push({ id: sid++, type: 'INFO', description: lines.join('\n'), treeSnapshot: null, highlightedNodeIds: [], svg: undefined });
      }
    }

    // final parenthesization string from sloc
    try {
      const paren = parenthesizationFromS(sloc, 1, nloc);
      const treePreview = buildParenthesisTree(sloc, 1, nloc);
      const svg = buildPreviewSvg(treePreview);
      steps.push({ id: sid++, type: 'INFO', description: `Optimal parenthesization: ${paren}`, treeSnapshot: null, highlightedNodeIds: [], svg });
    } catch (err) {
      // ignore
    }
    return steps;
  }

  function buildPreviewSvg(treeRoot: TreeNode | null) {
    const layout = layoutTree(treeRoot as any, 28);
    const { nodes, edges, minX = 0, minY = 0, maxX = 400, maxY = 200, nodeRadius = 12 } = layout as any;
    const pad = 8;
    const vbX = Math.floor(minX - nodeRadius - pad);
    const vbY = Math.floor(minY - nodeRadius - pad);
    const vbW = Math.ceil((maxX - minX) + nodeRadius * 2 + pad * 2) || 300;
    const vbH = Math.ceil((maxY - minY) + nodeRadius * 2 + pad * 2) || 160;
    const ns = 'http://www.w3.org/2000/svg';
    const edgeStr = edges.map((e: any) => {
      const from = nodes.find((n: any) => n.id === e.from);
      const to = nodes.find((n: any) => n.id === e.to);
      if (!from || !to) return '';
      return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="#222" stroke-width="2"/>`;
    }).join('\n');
    const nodeStr = nodes.map((n: any) => {
      return `<g><circle cx="${n.x}" cy="${n.y}" r="${nodeRadius}" fill="#f8fafc" stroke="#111827" stroke-width="1.5" /><text x="${n.x}" y="${n.y}" dy=".35em" text-anchor="middle" font-size="10">${n.label}</text></g>`;
    }).join('\n');
    return `<svg xmlns="${ns}" viewBox="${vbX} ${vbY} ${vbW} ${vbH}" width="100%">${edgeStr}${nodeStr}</svg>`;
  }

  // When activeStep changes, auto-expand the banner so users see details of new steps
  useEffect(() => {
    setBannerCollapsed(false);
  }, [activeStep?.id]);

  // Request MathJax typesetting for the active-step banner description when it becomes visible
  useEffect(() => {
    if (!activeStep) return;
    // when banner is expanded, request typeset for this banner's description
    try {
      typesetElementById(`matrix-step-desc-${activeStep.id}`).catch(() => {});
    } catch {}
  }, [activeStep?.id, bannerCollapsed]);

  // Emit initial steps and preview for the default dims when component mounts
  useEffect(() => {
    if (!onStepsUpdate) return;
    const initialSteps = computeStepsForDims(dims);
    onStepsUpdate(initialSteps);
    try {
      const { s: ss } = matrixChainOrder(dims);
      const treePreview = buildParenthesisTree(ss, 1, dims.length - 1);
      const svg = buildPreviewSvg(treePreview);
      if (onPreviewSvg) onPreviewSvg(svg);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: 'flex', gap: 8, height: '100%' }}>
      <div style={{ flex: 1, padding: 8, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <h2 style={{ margin: 0, marginBottom: 8 }}>Matrix Chain Parenthesization</h2>
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              value={pInput}
              onChange={(e) => setPInput(e.target.value)}
              placeholder="e.g. 4,10,3,12,20,7"
              style={{ flex: 1, padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
            <button onClick={() => {
              const parts = pInput.split(/[ ,]+/).map(s => s.trim()).filter(Boolean);
              const nums = parts.map(x => Number(x));
              if (nums.length < 2 || nums.some(n => Number.isNaN(n) || n <= 0)) {
                setError('Please enter at least two positive integers separated by commas or spaces.');
                return;
              }
              setError(null);
              setDims(nums);
              if (onDimensionsChange) onDimensionsChange(nums);
              try {
                const computedSteps = computeStepsForDims(nums);
                if (onStepsUpdate) onStepsUpdate(computedSteps);
                const { s: ss } = matrixChainOrder(nums);
                const treePreview = buildParenthesisTree(ss, 1, nums.length - 1);
                const svg = buildPreviewSvg(treePreview);
                if (onPreviewSvg) onPreviewSvg(svg);
              } catch (err) {}
            }}>Compute</button>
            <button onClick={() => { setPInput(defaultDims.join(', ')); setDims(defaultDims); setError(null); if (onDimensionsChange) onDimensionsChange(defaultDims); }} className="secondary">Reset</button>
          </div>
          {error && <div style={{ color: 'crimson', marginTop: 8 }}>{error}</div>}
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'visible' }}>
          {(() => {
            const { minX, maxX, minY, maxY, nodeRadius } = layout as any;
            const pad = 20;
            const vbX = Math.floor(minX - nodeRadius - pad);
            const vbY = Math.floor(minY - nodeRadius - pad);
            const vbW = Math.ceil((maxX - minX) + nodeRadius * 2 + pad * 2) || 400;
            const vbH = Math.ceil((maxY - minY) + nodeRadius * 2 + pad * 2) || 300;
            const svgHeight = Math.max(300, Math.min(1200, vbH));
            return (
              <svg width="100%" viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`} preserveAspectRatio="xMidYMid meet" height={svgHeight}>
                <g>
                  {layout.edges.map((e: any) => {
                    const from = layout.nodes.find((x: any) => x.id === e.from);
                    const to = layout.nodes.find((x: any) => x.id === e.to);
                    if (!from || !to) return null;
                    return <line key={`${e.from}-${e.to}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#222" strokeWidth={2} />;
                  })}
                  {layout.nodes.map((node: any) => {
                    const nodeRadius = (layout as any).nodeRadius ?? 20;
                    const fontSize = Math.max(10, Math.floor(nodeRadius * 0.6));
                    return (
                      <g key={node.id} transform={`translate(${node.x},${node.y})`}>
                        <circle r={nodeRadius} fill="#f8fafc" stroke="#111827" strokeWidth={2} />
                        <text y=".35em" textAnchor="middle" fontSize={fontSize}>{node.label}</text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            );
          })()}
        </div>
        <div style={{ marginTop: 12 }}>
          <strong>Parenthesization:</strong>
          <div style={{ fontFamily: 'monospace', marginTop: 6 }}>{parenthesization}</div>
        </div>
      </div>

      <div style={{ width: 360, padding: 8, borderLeft: '1px solid #eee', overflowY: 'auto', maxHeight: '100%', boxSizing: 'border-box' }}>
        {activeStep ? (
          <div style={{ padding: '8px 12px', background: '#f8fafc', border: '1px solid #e5e7eb', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: 'block' }}>{activeStep.type}</strong>
                <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(activeStep.description || '').split('\n')[0] || ''}</div>
              </div>
              <button aria-label={bannerCollapsed ? 'Expand details' : 'Collapse details'} onClick={() => setBannerCollapsed(v => !v)} style={{ width: 34, height: 34, borderRadius: 999, border: '1px solid #e6edf3', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>{bannerCollapsed ? '+' : '−'}</button>
            </div>
            {!bannerCollapsed ? (
              <div id={`matrix-step-desc-${activeStep.id}`} style={{ color: '#111827', whiteSpace: 'pre-wrap', marginTop: 8, maxHeight: 220, overflowY: 'auto' }}>{activeStep.description}</div>
            ) : null}
          </div>
        ) : null}
        <h3 style={{ marginTop: 0 }}>Dimensions p</h3>
        <div style={{ fontFamily: 'monospace' }}>{JSON.stringify(dims)}</div>

        <h3 style={{ marginTop: 12 }}>Cost table m</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th></th>
                {Array.from({ length: n }).map((_, j) => <th key={j} style={{ border: '1px solid #ddd', padding: 4 }}>{j + 1}</th>)}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: n }).map((_, i) => (
                <tr key={i}>
                  <td style={{ border: '1px solid #ddd', padding: 4 }}>{i + 1}</td>
                  {Array.from({ length: n }).map((_, j) => (
                    <td key={j} style={{ border: '1px solid #eee', padding: 4, textAlign: 'right' }}>{i <= j ? m[i + 1][j + 1] : ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 style={{ marginTop: 12 }}>Split table s</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th></th>
                {Array.from({ length: n }).map((_, j) => <th key={j} style={{ border: '1px solid #ddd', padding: 4 }}>{j + 1}</th>)}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: n }).map((_, i) => (
                <tr key={i}>
                  <td style={{ border: '1px solid #ddd', padding: 4 }}>{i + 1}</td>
                  {Array.from({ length: n }).map((_, j) => (
                    <td key={j} style={{ border: '1px solid #eee', padding: 4, textAlign: 'right' }}>{i < j ? s[i + 1][j + 1] : ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 16 }}>
          <h3>Optimal Parenthesization</h3>
          <div style={{ fontFamily: 'monospace', background: '#fff', padding: 8, border: '1px solid #eef2f7' }}>{parenthesization}</div>
        </div>
      </div>
    </div>
  );
}
