import { useMemo, useState, useRef, useEffect } from 'react';
import type { FC } from 'react';
import type { RBNode, Step } from '../core/RBTree';

interface TreeVisualizerProps {
  step: Step | null;
  width: number;
  height: number;
  showDescription?: boolean;
}

interface LayoutNode extends RBNode {
  x: number;
  y: number;
}

const NODE_RADIUS = 20;
const VERTICAL_SPACING = 60;

const TreeVisualizer: FC<TreeVisualizerProps> = ({ step, width, height, showDescription = true }) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const isSmallViewer = width < 400; // Detect if this is the small preview

  // Reset zoom/pan when step changes (only for small viewer)
  useEffect(() => {
    if (isSmallViewer) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [step?.id, isSmallViewer]);

  // When the step description overlay appears, request MathJax typesetting for it
  useEffect(() => {
    if (!showDescription || !step) return;
    try {
      const ev = new CustomEvent('leftpanel-typeset', { detail: { id: `step-desc-${step.id}` } });
      window.dispatchEvent(ev as any);
    } catch {}
  }, [showDescription, step?.id]);

  const handleWheel = (e: React.WheelEvent) => {
    if (!isSmallViewer) return; // Only allow zoom in small viewer
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.5, Math.min(3, prev * delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isSmallViewer) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !isSmallViewer) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    if (!isSmallViewer) return;
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const layout = useMemo(() => {
    if (!step) return { nodes: [], edges: [] };

    const nodes: LayoutNode[] = [];
    const edges: { id: string; x1: number; y1: number; x2: number; y2: number; color: string }[] = [];

    // Subtree-width layout: assign each subtree a horizontal slice and center nodes within their slice.
    // This guarantees all nodes stay within bounds.
    
    const margin = 40;

    // Count nodes in each subtree
    const countNodes = (node: RBNode | null): number => {
        if (!node) return 1; // count NIL as 1 leaf
        return countNodes(node.left) + countNodes(node.right);
    };

    const traverse = (node: RBNode | null, depth: number, leftBound: number, rightBound: number, parentId: number | null, isLeftChild: boolean) => {
      const y = 50 + depth * VERTICAL_SPACING;
      const midX = (leftBound + rightBound) / 2;

      if (!node) {
        // Render NIL node
        if (parentId !== null) {
            const id = -((parentId * 10) + (isLeftChild ? 1 : 2));
            nodes.push({ 
                id, 
                value: NaN, 
                color: 'BLACK', 
                x: midX, y, 
                left: null, right: null, parentId 
            });
        }
        return;
      }

      // Place this node at the center of its slice
      nodes.push({ ...node, x: midX, y });

      // Divide the slice between left and right subtrees based on their node counts
      const leftCount = countNodes(node.left);
      const rightCount = countNodes(node.right);
      const totalCount = leftCount + rightCount;
      const splitRatio = totalCount > 0 ? leftCount / totalCount : 0.5;
      const splitX = leftBound + (rightBound - leftBound) * splitRatio;

      traverse(node.left, depth + 1, leftBound, splitX, node.id, true);
      traverse(node.right, depth + 1, splitX, rightBound, node.id, false);
    };

    if (step.treeSnapshot) {
      traverse(step.treeSnapshot, 0, margin, width - margin, null, false);
      
      // Second pass to generate edges (now that we have coordinates)
      // We need a map to find parent coordinates easily, but since we have parentId in RBNode,
      // we can just look up the parent node in our 'nodes' array.
      const nodeMap = new Map<number, LayoutNode>();
      nodes.forEach(n => nodeMap.set(n.id, n));

      nodes.forEach(node => {
          // Only process real nodes for outgoing edges
          if (node.id > 0) {
            if (node.left) {
                const child = nodeMap.get(node.left.id);
                if (child) {
                    edges.push({ 
                        id: `${node.id}-${child.id}`,
                        x1: node.x, y1: node.y, 
                        x2: child.x, y2: child.y, 
                        color: 'black' 
                    });
                }
            } else {
                // Edge to Left NIL
                const nilId = -((node.id * 10) + 1);
                const child = nodeMap.get(nilId);
                if (child) {
                    edges.push({ 
                        id: `${node.id}-nil-left`,
                        x1: node.x, y1: node.y, 
                        x2: child.x, y2: child.y, 
                        color: 'black' 
                    });
                }
            }

            if (node.right) {
                const child = nodeMap.get(node.right.id);
                if (child) {
                    edges.push({ 
                        id: `${node.id}-${child.id}`,
                        x1: node.x, y1: node.y, 
                        x2: child.x, y2: child.y, 
                        color: 'black' 
                    });
                }
            } else {
                // Edge to Right NIL
                const nilId = -((node.id * 10) + 2);
                const child = nodeMap.get(nilId);
                if (child) {
                    edges.push({ 
                        id: `${node.id}-nil-right`,
                        x1: node.x, y1: node.y, 
                        x2: child.x, y2: child.y, 
                        color: 'black' 
                    });
                }
            }
          }
      });

    } else if (step.extraNode) {
        nodes.push({ ...step.extraNode, x: width / 2, y: 50 });
    }

    return { nodes, edges };
  }, [step, width]);

  if (!step) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>No data</div>;

  const viewBoxTransform = isSmallViewer 
    ? `translate(${pan.x / zoom}, ${pan.y / zoom}) scale(${zoom})`
    : '';

  return (
    <div 
      style={{ 
        position: 'relative', 
        width: '100%', 
        height: '100%', 
        border: '1px solid #e5e7eb', 
        borderRadius: '0.5rem', 
        backgroundColor: 'white', 
        overflow: 'hidden',
        cursor: isSmallViewer ? (isDragging ? 'grabbing' : 'grab') : 'default',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    >
      <svg 
        ref={svgRef}
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${width} ${height}`} 
        preserveAspectRatio="xMidYMid meet" 
        style={{ maxWidth: '100%', maxHeight: '100%' }}
        onWheel={handleWheel}
      >
        <g transform={viewBoxTransform}>
        {/* Edges */}
        {layout.edges.map((edge) => (
          <line
            key={edge.id}
            x1={edge.x1}
            y1={edge.y1}
            x2={edge.x2}
            y2={edge.y2}
            stroke={edge.color}
            strokeWidth="2"
            style={{ transition: 'all 0.5s ease' }}
          />
        ))}

        {/* Nodes */}
        {layout.nodes.map((node) => {
            const isHighlighted = step.highlightedNodeIds.includes(node.id);
            const isTraversing = step.traversingNodeId === node.id;
            const isNil = node.id < 0;
            
            // Only show highlights during active algorithm steps
            const isActiveStep = step.type === 'TRAVERSE' || step.type === 'COMPARE' || 
                                 step.type === 'ROTATE' || step.type === 'RECOLOR' || 
                                 step.type === 'INSERT';
            const shouldShowHighlight = isHighlighted && isActiveStep;
            
            if (isNil) {
                return (
                    <g key={node.id} style={{ transform: `translate(${node.x}px, ${node.y}px)`, transition: 'transform 0.5s ease' }}>
                        <rect
                            x={-6} y={-6} width={12} height={12}
                            fill="black"
                            stroke={shouldShowHighlight ? "red" : "black"}
                            strokeWidth={shouldShowHighlight ? 3 : 1}
                        />
                        <text
                            dy="20"
                            textAnchor="middle"
                            fontSize="10"
                            fill="#666"
                            style={{ opacity: shouldShowHighlight ? 1 : 0 }}
                        >
                            NIL
                        </text>
                    </g>
                );
            }

            return (
          <g key={node.id} style={{ transform: `translate(${node.x}px, ${node.y}px)`, transition: 'transform 0.5s ease' }}>
            {/* Main node circle */}
            <circle
              r={NODE_RADIUS}
              fill={node.color === 'RED' ? '#ffcccc' : '#e0e0e0'}
              stroke={node.color === 'RED' ? 'red' : 'black'}
              strokeWidth={shouldShowHighlight ? 4 : 2}
              style={{ transition: 'fill 0.3s, stroke 0.3s' }}
            />
            {/* Green traversing circle */}
            {isTraversing && (
              <circle
                r={NODE_RADIUS + 6}
                fill="none"
                stroke="#22c55e"
                strokeWidth={3}
                style={{ transition: 'stroke 0.3s' }}
              />
            )}
            {/* Red highlight circle (only during active algorithm steps) */}
            {shouldShowHighlight && !isTraversing && (
              <circle
                r={NODE_RADIUS + 6}
                fill="none"
                stroke="red"
                strokeWidth={3}
                style={{ transition: 'stroke 0.3s' }}
              />
            )}
            <text
              dy=".3em"
              textAnchor="middle"
              fontSize="14"
              fontWeight="bold"
              fill="black"
            >
              {node.value}
            </text>
            </g>
        )})}
        </g>
      </svg>
      
      {/* Zoom controls for small viewer */}
      {isSmallViewer && (
        <div style={{ position: 'absolute', bottom: '0.5rem', right: '0.5rem', display: 'flex', gap: '0.25rem', zIndex: 10 }}>
          <button
            onClick={(e) => { e.stopPropagation(); setZoom(prev => Math.min(3, prev * 1.2)); }}
            style={{ 
              padding: '0.25rem 0.5rem', 
              backgroundColor: 'rgba(255,255,255,0.9)', 
              border: '1px solid #d1d5db', 
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600
            }}
            title="Zoom in"
          >
            +
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setZoom(prev => Math.max(0.5, prev * 0.8)); }}
            style={{ 
              padding: '0.25rem 0.5rem', 
              backgroundColor: 'rgba(255,255,255,0.9)', 
              border: '1px solid #d1d5db', 
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600
            }}
            title="Zoom out"
          >
            −
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setZoom(1); setPan({ x: 0, y: 0 }); }}
            style={{ 
              padding: '0.25rem 0.5rem', 
              backgroundColor: 'rgba(255,255,255,0.9)', 
              border: '1px solid #d1d5db', 
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600
            }}
            title="Reset view (or double-click)"
          >
            ⟲
          </button>
        </div>
      )}
      
      {/* Step Description Overlay */}
      {showDescription && (
        <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', right: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <div id={`step-desc-${step.id}`} style={{ fontSize: '1.125rem', fontWeight: 500, color: '#1f2937', margin: 0, whiteSpace: 'pre-wrap' }}>{step.description}</div>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem', marginBottom: 0 }}>Step {step.id} • {step.type}</p>
        </div>
      )}
    </div>
  );
};

export default TreeVisualizer;
