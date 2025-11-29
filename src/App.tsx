import { useState, useRef, useEffect } from 'react';
import type { Step } from './core/RBTree';
import { RBTree } from './core/RBTree';
import TreeVisualizer from './components/TreeVisualizer';
import MatrixChainVisualizer from './components/MatrixChainVisualizer';
import LeftPanel from './components/LeftPanel';
import { computeTreeLayout } from './utils/computeLayout';
import './App.css';

function App() {
  const [tree] = useState(() => new RBTree());
  const [steps, setSteps] = useState<Step[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [inputValue, setInputValue] = useState('');
  const [multiInput, setMultiInput] = useState('');
  const [batchOp, setBatchOp] = useState<'INSERT' | 'DELETE'>('INSERT');
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1000);
  const [mode, setMode] = useState<'rbt' | 'mcm'>('rbt');
  const [showBatchInput, setShowBatchInput] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [mcmPreviewSvg, setMcmPreviewSvg] = useState<string | null>(null);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [showTopicDropdown, setShowTopicDropdown] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>('red_black_tree');
  const topicBtnRef = useRef<HTMLButtonElement | null>(null);
  const topicMenuRef = useRef<HTMLDivElement | null>(null);
  const [topicMenuPos, setTopicMenuPos] = useState<{ left: number; top: number; width: number } | null>(null);
  // close topic menu on outside click
  useEffect(() => {
    if (!showTopicDropdown) return;
    // compute and set menu position so it uses fixed coords (avoids header clipping)
    const btn = topicBtnRef.current;
    if (btn) {
      const r = btn.getBoundingClientRect();
      setTopicMenuPos({ left: Math.round(r.left), top: Math.round(r.bottom + 8), width: Math.round(r.width) });
    }

    const onDocClick = (e: MouseEvent) => {
      const btn = topicBtnRef.current;
      const menu = topicMenuRef.current;
      if (!btn || !menu) return;
      const target = e.target as Node;
      if (!btn.contains(target) && !menu.contains(target)) {
        setShowTopicDropdown(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showTopicDropdown]);
  const [mcmDimensions, setMcmDimensions] = useState<number[]>([4, 10, 3, 12, 20, 7]);
  const headerRef = useRef<HTMLElement | null>(null);
  const batchBtnRef = useRef<HTMLButtonElement | null>(null);
  const layerRef = useRef<HTMLDivElement | null>(null);
  const [batchThemeActive, setBatchThemeActive] = useState(false);

  useEffect(() => {
    // when switching mode, open the steps panel and switch left topic
    setRightOpen(true);
    if (mode === 'mcm') setSelectedTopicId('matrix_chain');
    else setSelectedTopicId('red_black_tree');
  }, [mode]);

  // Ensure the color layer is reset if window resizes
  useEffect(() => {
    const onResize = () => {
      if (layerRef.current) {
        // shrink the circle back if resize happens
        layerRef.current.style.transform = 'translate(-50%, -50%) scale(0)';
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Ensure the steps shown match the current mode:
  // - when switching to RBT, load steps from the tree
  // - when switching to MCM, clear steps (MCM visualizer will populate via callback)
  useEffect(() => {
    if (mode === 'rbt') {
      const all = tree.getAllSteps();
      setSteps([...all]);
      setCurrentStepIndex(all.length > 0 ? Math.min(currentStepIndex, all.length - 1) : -1);
    } else {
      setSteps([]);
      setCurrentStepIndex(-1);
    }
  }, [mode, tree]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Animation loop
  useEffect(() => {
    let timer: number;
    if (isPlaying && currentStepIndex < steps.length - 1) {
      timer = window.setTimeout(() => {
        setCurrentStepIndex(prev => prev + 1);
      }, speed);
    } else if (currentStepIndex >= steps.length - 1) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex, steps.length, speed]);

  const handleInsert = () => {
    const val = parseInt(inputValue);
    if (!isNaN(val)) {
      const newSteps = tree.insert(val);
      const allSteps = tree.getAllSteps();
      setSteps([...allSteps]);
      // Jump to the first of the newly added steps so creation (RED) is visible immediately
      if (newSteps && newSteps.length > 0) {
        setCurrentStepIndex(allSteps.length - newSteps.length);
      }
      setIsPlaying(true);
      setInputValue('');
    }
  };

  const handleDelete = () => {
    const val = parseInt(inputValue);
    if (!isNaN(val)) {
      const newSteps = tree.delete(val);
      const allSteps = tree.getAllSteps();
      setSteps([...allSteps]);
      if (newSteps && newSteps.length > 0) {
        setCurrentStepIndex(allSteps.length - newSteps.length);
      }
      setIsPlaying(true);
      setInputValue('');
    }
  };

  const handleSearch = () => {
    const val = parseInt(inputValue);
    if (!isNaN(val)) {
      const newSteps = tree.search(val);
      const allSteps = tree.getAllSteps();
      setSteps([...allSteps]);
      if (newSteps && newSteps.length > 0) {
        setCurrentStepIndex(allSteps.length - newSteps.length);
      }
      setIsPlaying(true);
      setInputValue('');
    }
  };

  const handleInsertBatch = () => {
    // Parse numbers separated by commas or whitespace
    const raw = multiInput.trim();
    if (!raw) return;
    const parts = raw.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
    const values: number[] = parts.map(p => parseInt(p, 10)).filter(n => !isNaN(n));
    if (values.length === 0) return;

    // Start a single grouped INSERT operation so all inserted keys and their
    // internal steps (recolor/rotate/etc.) are grouped together.
    tree.startOperation('INSERT', [values[0]]);
    // If there are more keys, append them by calling insert (tree.insert will detect current operation)
    let firstNewIndex = -1;
    for (let i = 0; i < values.length; ++i) {
      const v = values[i];
      const newSteps = tree.insert(v);
      const allSteps = tree.getAllSteps();
      if (i === 0 && newSteps && newSteps.length > 0) {
        firstNewIndex = allSteps.length - newSteps.length;
      }
    }
    tree.endOperation();

    const allStepsFinal = tree.getAllSteps();
    setSteps([...allStepsFinal]);
    if (firstNewIndex >= 0) setCurrentStepIndex(firstNewIndex);
    setIsPlaying(true);
    setMultiInput('');
  };

  const handleDeleteBatch = () => {
    // Parse numbers separated by commas or whitespace
    const raw = multiInput.trim();
    if (!raw) return;
    const parts = raw.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
    const values: number[] = parts.map(p => parseInt(p, 10)).filter(n => !isNaN(n));
    if (values.length === 0) return;

    // Start a single grouped DELETE operation
    tree.startOperation('DELETE', [values[0]]);
    let firstNewIndex = -1;
    for (let i = 0; i < values.length; ++i) {
      const v = values[i];
      const newSteps = tree.delete(v);
      const allSteps = tree.getAllSteps();
      if (i === 0 && newSteps && newSteps.length > 0) {
        firstNewIndex = allSteps.length - newSteps.length;
      }
    }
    tree.endOperation();

    const allStepsFinal = tree.getAllSteps();
    setSteps([...allStepsFinal]);
    if (firstNewIndex >= 0) setCurrentStepIndex(firstNewIndex);
    setIsPlaying(true);
    setMultiInput('');
  };

  // Compute scale needed to cover the header area from center point (cxLocal, cyLocal)
  const computeScaleForHeader = (cxLocal: number, cyLocal: number, diameter: number) => {
    const header = headerRef.current;
    if (!header) return 1;
    const hr = header.getBoundingClientRect();
    const dx = Math.max(cxLocal, hr.width - cxLocal);
    const dy = Math.max(cyLocal, hr.height - cyLocal);
    const far = Math.hypot(dx, dy);
    const requiredDiameter = far * 2;
    const scale = Math.max(1, (requiredDiameter / diameter) * 1.05);
    return scale;
  };

  const openBatchWithAnimation = () => {
    setShowBatchInput(true);
    setBatchThemeActive(true);
    // position the layer at the batch button center and expand
    requestAnimationFrame(() => {
      const btn = batchBtnRef.current;
      const layer = layerRef.current;
      if (!btn || !layer) return;
      const rect = btn.getBoundingClientRect();
      const diameter = Math.max(rect.width, rect.height, 48);
      // position layer relative to header (local coords)
      const headerRect = headerRef.current!.getBoundingClientRect();
      const cxLocal = rect.left - headerRect.left + rect.width / 2;
      const cyLocal = rect.top - headerRect.top + rect.height / 2;
      layer.style.width = `${diameter}px`;
      layer.style.height = `${diameter}px`;
      layer.style.left = `${cxLocal}px`;
      layer.style.top = `${cyLocal}px`;
      // ensure starting from scale(0)
      layer.style.transform = 'translate(-50%, -50%) scale(0)';
      // force reflow
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      layer.offsetWidth;
      const scale = computeScaleForHeader(cxLocal, cyLocal, diameter);
      layer.classList.add('active');
      layer.style.transform = `translate(-50%, -50%) scale(${scale})`;
    });
  };

  const closeBatchWithAnimation = (immediate = false) => {
    const layer = layerRef.current;
    if (!layer) {
      setShowBatchInput(false);
      setBatchThemeActive(false);
      return;
    }
    if (immediate) {
      layer.classList.remove('active');
      layer.style.transform = 'translate(-50%, -50%) scale(0)';
      setBatchThemeActive(false);
      setShowBatchInput(false);
      return;
    }
    // shrink the layer back to the button
    layer.style.transform = 'translate(-50%, -50%) scale(0)';
    // after transition ends, clear state
    const onEnd = () => {
      layer.classList.remove('active');
      setBatchThemeActive(false);
      setShowBatchInput(false);
      layer.removeEventListener('transitionend', onEnd);
    };
    layer.addEventListener('transitionend', onEnd);
  };

  const handleReset = () => {
    tree.reset();
    setSteps([]);
    setCurrentStepIndex(-1);
    setIsPlaying(false);
  };

  const handleStepBack = () => {
    setIsPlaying(false);
    setCurrentStepIndex(prev => Math.max(-1, prev - 1));
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    setCurrentStepIndex(prev => Math.min(steps.length - 1, prev + 1));
  };

  const handleExport = async () => {
    // Export grouped by operation type (INSERTs together, then DELETEs, then others).
    const margin = 40;
    const headerHeight = 80; // Space for title and description
    
    // Load jsPDF if needed
    if (!(window as any).jspdf) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load jsPDF'));
        document.head.appendChild(script);
      });
    }

    const jspdf = (window as any).jspdf;
    const PDFConstructor = jspdf && jspdf.jsPDF ? jspdf.jsPDF : (window as any).jsPDF;
    if (!PDFConstructor) {
      alert('Could not load jsPDF. Export aborted.');
      return;
    }

    const pdf = new PDFConstructor({ unit: 'px', format: 'a4', orientation: 'landscape' });
    // Actual page size from jsPDF
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    // Gather operations and steps
    const ops = tree.getOperations();
    const allSteps = tree.getAllSteps();

    // Order: INSERT, DELETE, others
    const orderedTypes = ['INSERT', 'DELETE'];
    const otherOps = ops.filter(o => !orderedTypes.includes(o.type)).map(o => o.type);
    const uniqueOtherTypes = Array.from(new Set(otherOps));
    const typeOrder = [...orderedTypes, ...uniqueOtherTypes];

    // Helper to render a single step as a PDF page
    const renderStepPage = async (s: Step) => {
      const treeSnapshot = s.treeSnapshot ?? (s.extraNode ? s.extraNode : null);
      // Use fixed canvas size for layout (subtree-width layout already keeps nodes in bounds)
      const layout = computeTreeLayout(treeSnapshot as any, 800, 400);
      // No need to compute bounding box; layout is already bounded
      const viewBox = `0 0 800 400`;

      const svgString = ((layout: any, viewBox: string) => {
        const { nodes, edges } = layout;
        const ns = 'http://www.w3.org/2000/svg';
        const bg = `<rect width="100%" height="100%" fill="white"/>`;
        const edgeStr = edges.map((e: any) => {
          const from = nodes.find((n: any) => n.id === e.from);
          const to = nodes.find((n: any) => n.id === e.to);
          if (!from || !to) return '';
          return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="#333" stroke-width="2" />`;
        }).join('\n');

        const nodeStr = nodes.map((n: any) => {
          const isNil = n.id < 0;
          if (isNil) return `<rect x="${n.x - 6}" y="${n.y - 6}" width="12" height="12" fill="black" />`;
          const isRed = n.color === 'RED';
          const fill = isRed ? '#ffcccc' : '#e0e0e0';
          const stroke = isRed ? '#dc2626' : '#000000';
          const textColor = '#000000';
          return `<g>
            <circle cx="${n.x}" cy="${n.y}" r="20" fill="${fill}" stroke="${stroke}" stroke-width="2" />
            <text x="${n.x}" y="${n.y}" dy=".35em" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="${textColor}">${n.value}</text>
          </g>`;
        }).join('\n');

        return `<svg xmlns="${ns}" width="800" height="400" viewBox="${viewBox}">${bg}${edgeStr}${nodeStr}</svg>`;
      })(layout, viewBox);

      const imgData = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 800;
          canvas.height = 400;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas context unavailable'));
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, 800, 400);
          try { resolve(canvas.toDataURL('image/png')); } catch (err) { reject(err); }
        };
        img.onerror = () => reject(new Error('Failed to load SVG as image'));
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
      });

      // Add page (caller will add page as needed)
      // Header
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      pdf.setTextColor(30, 30, 30);
      pdf.text(`${s.operationType ?? s.type} — Step ${s.id}: ${s.type}`, margin, margin + 15);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(14);
      pdf.setTextColor(60, 60, 60);
      const descLines = pdf.splitTextToSize(s.description, pageW - (margin * 2));
      pdf.text(descLines, margin, margin + 40);

      // Fit the large image within the printable area while preserving aspect ratio
      const maxImgW = pageW - (margin * 2);
      const maxImgH = pageH - margin - headerHeight - margin;
      let drawW = Math.min(800, maxImgW);
      let drawH = Math.min(400, maxImgH);
      const aspect = 800 / 400;
      if (drawW / drawH > aspect) {
        drawW = drawH * aspect;
      } else {
        drawH = drawW / aspect;
      }
      pdf.addImage(imgData, 'PNG', margin, margin + headerHeight, drawW, drawH);

      pdf.setFontSize(10);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Red-Black Tree Visualizer`, margin, pageH - 15);
      // page numbering for this section is optional; caller sets overall pages
    };

    // Build sections by type
    let globalPageIndex = 0;
    for (const t of typeOrder) {
      const opsOfType = ops.filter(o => o.type === t);
      if (opsOfType.length === 0) continue;

      // For INSERT section, create one page with all insert steps in a grid (5 per row)
      if (t === 'INSERT') {
        const allInsertSteps: Step[] = [];
        opsOfType.forEach(o => {
          const opSteps = allSteps.filter(s => s.operationId === o.id);
          // Filter out TRAVERSE steps (comparing with nodes)
          // Also filter out the temporary root creation step e.g. "Add 20 as ROOT (temporary RED)"
          const filteredSteps = opSteps.filter(s => s.type !== 'TRAVERSE' && !/ROOT \(temporary RED\)/.test(s.description));
          allInsertSteps.push(...filteredSteps);
        });
        
        if (allInsertSteps.length > 0) {
          // Header with all inserted keys
          const allKeys: number[] = [];
          opsOfType.forEach(o => allKeys.push(...o.keys));
          
          // Grid layout: compute cell sizes so columns fit exactly within page width
          const stepsPerRow = 5;
          const gapX = 10;
          const gapY = 10;
          const headerHeight = 35;

          // compute stepWidth so N columns fit inside margins
          const stepWidth = Math.floor((pageW - 2 * margin - (stepsPerRow - 1) * gapX) / stepsPerRow);
          const stepHeight = 120;

          // Calculate how many rows fit on one page using dynamic page height
          const availableHeight = pageH - margin * 2 - headerHeight;
          const rowsPerPage = Math.max(1, Math.floor((availableHeight + gapY) / (stepHeight + gapY)));
          const stepsPerPage = stepsPerRow * rowsPerPage;

          // Fixed tree canvas dimensions for consistent rendering
          const treeCanvasWidth = 600;
          const treeCanvasHeight = 400;
          
          let currentPage = 0;
          
          for (let i = 0; i < allInsertSteps.length; i++) {
            const pageIndex = Math.floor(i / stepsPerPage);
            const indexInPage = i % stepsPerPage;
            
            // Add new page if needed
            if (pageIndex !== currentPage || (globalPageIndex === 0 && i === 0)) {
              if (globalPageIndex > 0 || i > 0) pdf.addPage();
              
              // Add header to each page
              pdf.setFont("helvetica", "bold");
              pdf.setFontSize(18);
              pdf.setTextColor(20, 20, 20);
              pdf.text(`Insertions — Keys: ${allKeys.join(', ')}`, margin, margin + 15);
              
              globalPageIndex++;
              currentPage = pageIndex;
            }
            
            const s = allInsertSteps[i];
            const row = Math.floor(indexInPage / stepsPerRow);
            const col = indexInPage % stepsPerRow;
            const x = margin + col * (stepWidth + gapX);
            const y = margin + headerHeight + row * (stepHeight + gapY);
            
            // Render tree at full resolution then scale down
            const treeSnapshot = s.treeSnapshot ?? (s.extraNode ? s.extraNode : null);
            const layout = computeTreeLayout(treeSnapshot as any, treeCanvasWidth, treeCanvasHeight);
            const viewBox = `0 0 ${treeCanvasWidth} ${treeCanvasHeight}`;
            
            const svgString = ((layout: any, viewBox: string) => {
              const { nodes, edges } = layout;
              const ns = 'http://www.w3.org/2000/svg';
              const bg = `<rect width="100%" height="100%" fill="white"/>`;
              const edgeStr = edges.map((e: any) => {
                const from = nodes.find((n: any) => n.id === e.from);
                const to = nodes.find((n: any) => n.id === e.to);
                if (!from || !to) return '';
                return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="#333" stroke-width="2" />`;
              }).join('\n');
              
              const nodeStr = nodes.map((n: any) => {
                const isNil = n.id < 0;
                if (isNil) return `<rect x="${n.x - 6}" y="${n.y - 6}" width="12" height="12" fill="black" />`;
                const isRed = n.color === 'RED';
                const fill = isRed ? '#ffcccc' : '#e0e0e0';
                const stroke = isRed ? '#dc2626' : '#000000';
                return `<g>
                  <circle cx="${n.x}" cy="${n.y}" r="20" fill="${fill}" stroke="${stroke}" stroke-width="2" />
                  <text x="${n.x}" y="${n.y}" dy=".35em" text-anchor="middle" font-size="14" font-weight="bold">${n.value}</text>
                </g>`;
              }).join('\n');
              
              return `<svg xmlns="${ns}" width="${treeCanvasWidth}" height="${treeCanvasHeight}" viewBox="${viewBox}">${bg}${edgeStr}${nodeStr}</svg>`;
            })(layout, viewBox);
            
            const imgData = await new Promise<string>((resolve, reject) => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = treeCanvasWidth;
                canvas.height = treeCanvasHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Canvas context unavailable'));
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, treeCanvasWidth, treeCanvasHeight);
                try { resolve(canvas.toDataURL('image/png')); } catch (err) { reject(err); }
              };
              img.onerror = () => reject(new Error('Failed to load SVG'));
              img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
            });
            
            // Draw scaled-down image and description
            const displayHeight = stepHeight - 35;
            pdf.addImage(imgData, 'PNG', x, y, stepWidth, displayHeight);
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(5.5);
            pdf.setTextColor(60, 60, 60);
            // Wrap the description text to fit within the cell width
            const wrappedDesc = pdf.splitTextToSize(s.description, stepWidth - 8);
            // Only show first line to prevent overlapping
            if (wrappedDesc.length > 0) {
              pdf.text(wrappedDesc[0], x + stepWidth / 2, y + stepHeight - 5, { align: 'center' });
            }
          }
        }
        continue; // Skip the default step-by-step rendering for INSERT
      }

      // For DELETE section, create pages with delete steps in a grid (5 per row)
      if (t === 'DELETE') {
        const allDeleteSteps: Step[] = [];
        opsOfType.forEach(o => {
          const opSteps = allSteps.filter(s => s.operationId === o.id);
          const filteredSteps = opSteps.filter(s => s.type !== 'TRAVERSE');
          allDeleteSteps.push(...filteredSteps);
        });
        
        if (allDeleteSteps.length > 0) {
          const allKeys: number[] = [];
          opsOfType.forEach(o => allKeys.push(...o.keys));
          
          const stepsPerRow = 5;
          const gapX = 10;
          const gapY = 10;
          const headerHeight = 35;
          const stepWidth = Math.floor((pageW - 2 * margin - (stepsPerRow - 1) * gapX) / stepsPerRow);
          const stepHeight = 120;
          const availableHeight = pageH - margin * 2 - headerHeight;
          const rowsPerPage = Math.max(1, Math.floor((availableHeight + gapY) / (stepHeight + gapY)));
          const stepsPerPage = stepsPerRow * rowsPerPage;
          const treeCanvasWidth = 600;
          const treeCanvasHeight = 400;
          
          let currentPage = 0;
          
          for (let i = 0; i < allDeleteSteps.length; i++) {
            const pageIndex = Math.floor(i / stepsPerPage);
            const indexInPage = i % stepsPerPage;
            
            if (pageIndex !== currentPage || (globalPageIndex === 0 && i === 0)) {
              if (globalPageIndex > 0 || i > 0) pdf.addPage();
              pdf.setFont("helvetica", "bold");
              pdf.setFontSize(18);
              pdf.setTextColor(20, 20, 20);
              pdf.text(`Deletions — Keys: ${allKeys.join(', ')}`, margin, margin + 15);
              globalPageIndex++;
              currentPage = pageIndex;
            }
            
            const s = allDeleteSteps[i];
            const row = Math.floor(indexInPage / stepsPerRow);
            const col = indexInPage % stepsPerRow;
            const x = margin + col * (stepWidth + gapX);
            const y = margin + headerHeight + row * (stepHeight + gapY);
            
            const treeSnapshot = s.treeSnapshot ?? (s.extraNode ? s.extraNode : null);
            const layout = computeTreeLayout(treeSnapshot as any, treeCanvasWidth, treeCanvasHeight);
            const viewBox = `0 0 ${treeCanvasWidth} ${treeCanvasHeight}`;
            
            const svgString = ((layout: any, viewBox: string) => {
              const { nodes, edges } = layout;
              const ns = 'http://www.w3.org/2000/svg';
              const bg = `<rect width="100%" height="100%" fill="white"/>`;
              const edgeStr = edges.map((e: any) => {
                const from = nodes.find((n: any) => n.id === e.from);
                const to = nodes.find((n: any) => n.id === e.to);
                if (!from || !to) return '';
                return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="#333" stroke-width="2" />`;
              }).join('\n');
              
              const nodeStr = nodes.map((n: any) => {
                const isNil = n.id < 0;
                if (isNil) return `<rect x="${n.x - 6}" y="${n.y - 6}" width="12" height="12" fill="black" />`;
                const isRed = n.color === 'RED';
                const fill = isRed ? '#ffcccc' : '#e0e0e0';
                const stroke = isRed ? '#dc2626' : '#000000';
                const textColor = '#000000';
                return `<g><circle cx="${n.x}" cy="${n.y}" r="20" fill="${fill}" stroke="${stroke}" stroke-width="2" /><text x="${n.x}" y="${n.y}" dy=".35em" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="${textColor}">${n.value}</text></g>`;
              }).join('\n');
              
              return `<svg xmlns="${ns}" width="${treeCanvasWidth}" height="${treeCanvasHeight}" viewBox="${viewBox}">${bg}${edgeStr}${nodeStr}</svg>`;
            })(layout, viewBox);
            
            const imgData = await new Promise<string>((resolve, reject) => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = treeCanvasWidth;
                canvas.height = treeCanvasHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Canvas context unavailable'));
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, treeCanvasWidth, treeCanvasHeight);
                try { resolve(canvas.toDataURL('image/png')); } catch (err) { reject(err); }
              };
              img.onerror = () => reject(new Error('Failed to load SVG'));
              img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
            });
            
            const displayHeight = stepHeight - 35;
            pdf.addImage(imgData, 'PNG', x, y, stepWidth, displayHeight);
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(5.5);
            pdf.setTextColor(60, 60, 60);
            // Wrap the description text to fit within the cell width
            const wrappedDesc = pdf.splitTextToSize(s.description, stepWidth - 8);
            // Only show first line to prevent overlapping
            if (wrappedDesc.length > 0) {
              pdf.text(wrappedDesc[0], x + stepWidth / 2, y + stepHeight - 5, { align: 'center' });
            }
          }
        }
        continue; // Skip the default step-by-step rendering for DELETE
      }

      // For other operation types, render each step on a separate page
      for (const op of opsOfType) {
        const opSteps = allSteps.filter(s => s.operationId === op.id);
        if (opSteps.length === 0) continue;
        for (let i = 0; i < opSteps.length; ++i) {
          const s = opSteps[i];
          if (globalPageIndex > 0) pdf.addPage();
          await renderStepPage(s);
          globalPageIndex++;
        }
      }
    }

    // If there were operations not covered by typeOrder (unlikely), append them
    const remainingOps = ops.filter(o => !typeOrder.includes(o.type));
    for (const op of remainingOps) {
      const opSteps = allSteps.filter(s => s.operationId === op.id);
      for (let i = 0; i < opSteps.length; ++i) {
        const s = opSteps[i];
        if (globalPageIndex > 0) pdf.addPage();
        await renderStepPage(s);
        globalPageIndex++;
      }
    }

    // Generate filename based on operations
    const allKeys: number[] = [];
    ops.forEach(op => {
      if (op.keys && op.keys.length > 0) {
        allKeys.push(...op.keys);
      }
    });
    const keysStr = allKeys.length > 0 ? allKeys.join('_') : 'empty';
    pdf.save(`rbt_${keysStr}.pdf`);
  };

  const handleExportMCM = async () => {
    const margin = 40;

    // Load jsPDF if needed
    if (!(window as any).jspdf) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load jsPDF'));
        document.head.appendChild(script);
      });
    }

    const jspdf = (window as any).jspdf;
    const PDFConstructor = jspdf && jspdf.jsPDF ? jspdf.jsPDF : (window as any).jsPDF;
    if (!PDFConstructor) {
      alert('Could not load jsPDF. Export aborted.');
      return;
    }

    const pdf = new PDFConstructor({ unit: 'px', format: 'a4', orientation: 'landscape' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    // Import matrixChainOrder to compute tables
    const { matrixChainOrder } = await import('./core/MatrixChain');
    
    // Use the stored MCM dimensions
    const dims = mcmDimensions;
    const { m, s } = matrixChainOrder(dims);
    const n = dims.length - 1;

    // Header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.setTextColor(30, 30, 30);
    pdf.text(`Matrix Chain Multiplication (p = ${JSON.stringify(dims)})`, margin, margin + 15);

    // Grid layout for level steps: 3 per row
    const stepsPerRow = 3;
    const gapX = 10;
    const gapY = 10;
    const headerHeight = 50;
    
    const cellWidth = Math.floor((pageW - 2 * margin - (stepsPerRow - 1) * gapX) / stepsPerRow);
    
    // Calculate dynamic cell heights for each step independently
    const cellHeights: number[] = [];
    const lineHeight = 8;
    const titleHeight = 20;
    const padding = 10;
    
    steps.forEach((step) => {
      const descLines = step.description.split('\n').slice(1);
      let totalLines = 0;
      descLines.forEach((line) => {
        const wrappedLines = pdf.splitTextToSize(line, cellWidth - 10);
        totalLines += wrappedLines.length;
      });
      const height = titleHeight + (totalLines * lineHeight) + padding;
      cellHeights.push(Math.max(60, height)); // Minimum 60px
    });

    // Render level steps in grid with individual cell heights, with pagination
    let currentY = margin + headerHeight;
    let currentRow = 0;
    let maxRowHeight = 0;
    let currentPage = 1;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const col = i % stepsPerRow;
      
      // Start new row
      if (col === 0 && i > 0) {
        currentY += maxRowHeight + gapY;
        maxRowHeight = 0;
        currentRow++;
      }
      
      const cellHeight = cellHeights[i];
      maxRowHeight = Math.max(maxRowHeight, cellHeight);
      
      // Check if we need a new page (cell would go beyond page boundary)
      if (currentY + cellHeight > pageH - margin) {
        pdf.addPage();
        currentPage++;
        
        // Re-add header on new page
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(20);
        pdf.setTextColor(30, 30, 30);
        pdf.text(`Matrix Chain Multiplication (p = ${JSON.stringify(dims)}) - Page ${currentPage}`, margin, margin + 15);
        
        currentY = margin + headerHeight;
        maxRowHeight = cellHeight;
      }
      
      const x = margin + col * (cellWidth + gapX);

      // Cell border
      pdf.setDrawColor(200, 200, 200);
      pdf.rect(x, currentY, cellWidth, cellHeight);

      // Step title
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(30, 30, 30);
      const stepTitle = step.description.split('\n')[0] || `Step ${i + 1}`;
      pdf.text(stepTitle, x + 5, currentY + 12);

      // Step description - show all lines, wrapped to fit
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6);
      pdf.setTextColor(60, 60, 60);
      const descLines = step.description.split('\n').slice(1);
      let lineY = currentY + 22;
      
      descLines.forEach((line) => {
        const wrappedLines = pdf.splitTextToSize(line, cellWidth - 10);
        wrappedLines.forEach((wrappedLine: string) => {
          pdf.text(wrappedLine, x + 5, lineY);
          lineY += lineHeight;
        });
      });
    }

    // Find the last step with SVG (parenthesization tree)
    const stepWithSvg = [...steps].reverse().find(s => s.svg);

    // Page 2: Parenthesization Tree
    if (stepWithSvg?.svg) {
      pdf.addPage();
      
      try {
        const imgData = await new Promise<string>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = 600;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Failed to get canvas context'));
              return;
            }
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, 800, 600);
            try {
              resolve(canvas.toDataURL('image/png'));
            } catch (err) {
              reject(err);
            }
          };
          img.onerror = () => reject(new Error('Failed to load SVG'));
          img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(stepWithSvg.svg!)}`;
        });

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(20);
        pdf.setTextColor(30, 30, 30);
        pdf.text('Parenthesization Tree', margin, margin + 15);
        
        const treeWidth = pageW - margin * 2;
        const treeHeight = pageH - margin * 2 - 40;
        pdf.addImage(imgData, 'PNG', margin, margin + 40, treeWidth, treeHeight);
      } catch (err) {
        console.error('Failed to render tree SVG:', err);
      }
    }

    // Page 3: M Table
    pdf.addPage();
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.setTextColor(30, 30, 30);
    pdf.text('Cost Table (m)', margin, margin + 15);

    // Draw M table
    const cellSize = Math.min(40, (pageW - margin * 2) / (n + 2));
    let tableY = margin + 40;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    
    // M table headers and content
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= n; j++) {
        const x = margin + j * cellSize;
        const y = tableY + i * cellSize;
        
        pdf.setDrawColor(200, 200, 200);
        pdf.rect(x, y, cellSize, cellSize);
        
        if (i === 0 && j === 0) {
          // Top-left corner (empty)
        } else if (i === 0) {
          // Column headers
          pdf.setFont('helvetica', 'bold');
          pdf.text(String(j), x + cellSize / 2, y + cellSize / 2 + 3, { align: 'center' });
          pdf.setFont('helvetica', 'normal');
        } else if (j === 0) {
          // Row headers
          pdf.setFont('helvetica', 'bold');
          pdf.text(String(i), x + cellSize / 2, y + cellSize / 2 + 3, { align: 'center' });
          pdf.setFont('helvetica', 'normal');
        } else if (i <= j) {
          // Table values
          pdf.text(String(m[i][j]), x + cellSize / 2, y + cellSize / 2 + 3, { align: 'center' });
        }
      }
    }

    // Page 4: S Table
    pdf.addPage();
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.setTextColor(30, 30, 30);
    pdf.text('Split Table (s)', margin, margin + 15);

    // Draw S table
    tableY = margin + 40;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= n; j++) {
        const x = margin + j * cellSize;
        const y = tableY + i * cellSize;
        
        pdf.setDrawColor(200, 200, 200);
        pdf.rect(x, y, cellSize, cellSize);
        
        if (i === 0 && j === 0) {
          // Top-left corner (empty)
        } else if (i === 0) {
          // Column headers
          pdf.setFont('helvetica', 'bold');
          pdf.text(String(j), x + cellSize / 2, y + cellSize / 2 + 3, { align: 'center' });
          pdf.setFont('helvetica', 'normal');
        } else if (j === 0) {
          // Row headers
          pdf.setFont('helvetica', 'bold');
          pdf.text(String(i), x + cellSize / 2, y + cellSize / 2 + 3, { align: 'center' });
          pdf.setFont('helvetica', 'normal');
        } else if (i < j) {
          // Table values (s is only defined for i < j)
          pdf.text(String(s[i][j]), x + cellSize / 2, y + cellSize / 2 + 3, { align: 'center' });
        }
      }
    }

    // Generate filename based on dimensions
    const dimsStr = dims.join('_');
    pdf.save(`mcm_${dimsStr}.pdf`);
  };

  // Jump to start/end and clear all helpers
  const handleSkipBack = () => {
    setIsPlaying(false);
    if (steps.length > 0) setCurrentStepIndex(0);
    else setCurrentStepIndex(-1);
  };

  const handleSkipForward = () => {
    setIsPlaying(false);
    if (steps.length > 0) setCurrentStepIndex(steps.length - 1);
  };

  const handleClearAll = () => {
    // Clear tree and recorded steps
    tree.reset();
    setSteps([]);
    setCurrentStepIndex(-1);
    setIsPlaying(false);
  };

  const handleJumpToStep = (index: number) => {
    setIsPlaying(false);
    setCurrentStepIndex(index);
  };

  const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex] : null;
  const stepsListRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (stepsListRef.current && currentStepIndex >= 0) {
      const activeItem = stepsListRef.current.children[currentStepIndex] as HTMLElement;
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [currentStepIndex]);

  return (
    <div className="app-container">
      <header ref={headerRef} className={`app-header ${batchThemeActive ? 'batch-active' : ''}`}>
        <div ref={layerRef} className="batch-color-layer" />
        <div className="header-left">
          <button className="hamburger" onClick={() => setLeftOpen(v => !v)} aria-label="Toggle Theory Panel">☰</button>
          <h1>DSA visualizer</h1>
        </div>
        <div className="header-center">
          <div className="topic-selector">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="topic-label" style={{ fontSize: '0.9rem', fontWeight: 700 }}>Topic</span>
              <div style={{ position: 'relative' }}>
                <button
                  ref={topicBtnRef}
                  type="button"
                  className="topic-dropdown-button topic-select"
                  aria-haspopup="listbox"
                  aria-expanded={showTopicDropdown}
                  onClick={() => setShowTopicDropdown(v => !v)}
                  style={{ color: 'var(--blue)' }}
                >
                  {selectedTopicId === 'matrix_chain' ? 'Matrix Chain' : 'Red-Black Tree'}
                </button>

                {showTopicDropdown && (
                  <div
                    ref={topicMenuRef}
                    role="listbox"
                    className="topic-dropdown-menu"
                    tabIndex={-1}
                    style={{
                      left: topicMenuPos ? `${topicMenuPos.left}px` : undefined,
                      top: topicMenuPos ? `${topicMenuPos.top}px` : undefined,
                      width: topicMenuPos ? `${topicMenuPos.width}px` : undefined,
                    }}
                  >
                    <div role="option" className={`topic-dropdown-item ${selectedTopicId === 'red_black_tree' ? 'selected' : ''}`} onClick={() => { setSelectedTopicId('red_black_tree'); setShowTopicDropdown(false); }}>Red-Black Tree</div>
                    <div role="option" className={`topic-dropdown-item ${selectedTopicId === 'matrix_chain' ? 'selected' : ''}`} onClick={() => { setSelectedTopicId('matrix_chain'); setShowTopicDropdown(false); }}>Matrix Chain</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="controls">
          {mode === 'rbt' && (
            <>
              <input 
                type="number" 
                value={inputValue} 
                onChange={(e) => setInputValue(e.target.value)} 
                placeholder="Enter number"
                onKeyDown={(e) => e.key === 'Enter' && handleInsert()}
              />
              <button onClick={handleInsert} className="primary">Insert</button>
              <button onClick={handleDelete} className="secondary">Delete</button>
              <button onClick={handleSearch} className="secondary">Search</button>
              <button onClick={() => { if (!showBatchInput) openBatchWithAnimation(); else closeBatchWithAnimation(); }} className="secondary">Batch Operations</button>
            </>
          )}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button onClick={() => setShowModeDropdown(v => !v)} className="secondary">{mode === 'rbt' ? 'RBT' : 'Matrix Chain'} ▾</button>
            {showModeDropdown && (
              <div style={{ position: 'absolute', top: '2.4rem', left: 0, background: 'white', border: '1px solid #ddd', boxShadow: '0 4px 8px rgba(0,0,0,0.05)', zIndex: 40, borderRadius: 4 }}>
                <div style={{ padding: 8, cursor: 'pointer', borderBottom: '1px solid #eee' }} onClick={() => { setMode('rbt'); setShowModeDropdown(false); setMcmPreviewSvg(null); }}>RBT</div>
                <div style={{ padding: 8, cursor: 'pointer' }} onClick={() => { setMode('mcm'); setShowModeDropdown(false); /* hide steps panel until MCM pushes steps */ }}>Matrix Chain</div>
              </div>
            )}
          </div>
          
          {showBatchInput && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => closeBatchWithAnimation()}>
              <div style={{ background: 'white', padding: '2rem', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: 420 }} onClick={(e) => e.stopPropagation()}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Batch Operations</h3>
                <p style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '1rem' }}>Enter numbers separated by commas or spaces</p>

                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="radio" name="batchOp" checked={batchOp === 'INSERT'} onChange={() => setBatchOp('INSERT')} />
                    <span>Insert</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="radio" name="batchOp" checked={batchOp === 'DELETE'} onChange={() => setBatchOp('DELETE')} />
                    <span>Delete</span>
                  </label>
                </div>

                <input
                  type="text"
                  value={multiInput}
                  onChange={(e) => setMultiInput(e.target.value)}
                  placeholder="e.g., 5,10,15 or 5 10 15"
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #ced4da', borderRadius: 4, marginBottom: '1rem', fontSize: '0.875rem' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button onClick={() => {
                    if (batchOp === 'INSERT') handleInsertBatch();
                    else handleDeleteBatch();
                    closeBatchWithAnimation();
                  }}>{batchOp === 'INSERT' ? 'Apply Batch Insert' : 'Apply Batch Delete'}</button>
                  <button onClick={() => { closeBatchWithAnimation(); setMultiInput(''); }} className="secondary">Close</button>
                </div>
              </div>
            </div>
          )}
          
          {steps.length > 0 && (
            <>
              <button onClick={handleSkipBack} disabled={currentStepIndex <= 0} className="primary">Skip Back</button>
              <button onClick={handleStepBack} disabled={currentStepIndex < 0} className="primary">Prev</button>
              <button onClick={() => setIsPlaying(!isPlaying)} className="primary">
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button onClick={handleStepForward} disabled={currentStepIndex >= steps.length - 1} className="primary">Next</button>
              <button onClick={handleSkipForward} disabled={currentStepIndex >= steps.length - 1} className="primary">Skip Forward</button>
            </>
          )}
          
          <button onClick={handleReset} className="danger">Reset</button>
          <button onClick={mode === 'rbt' ? handleExport : handleExportMCM} className="secondary">Export</button>
          <label>
            Speed:
            <input 
              type="range" 
              min="100" 
              max="2000" 
              step="100" 
              value={speed} 
              onChange={(e) => setSpeed(Number(e.target.value))} 
            />
          </label>
        </div>
        {/* Unified Command Bar moved into header for non-floating navbar placement */}
        <nav className="unified-command-bar" role="toolbar" aria-label="Unified Command Bar">

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button data-tooltip="Delete" title="Delete" onClick={handleDelete} aria-label="Delete" className="ucb-mini">
              <span className="ucb-mini-label">Delete</span>
            </button>
            <input className="ucb-input" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Value..." onKeyDown={(e) => e.key === 'Enter' && handleInsert()} aria-label="Value input" />
            <button data-tooltip="Insert" title="Insert" onClick={handleInsert} aria-label="Insert" className="ucb-mini">
              <span className="ucb-mini-label">Insert</span>
            </button>
          </div>



          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button className="ucb-button" data-tooltip="Skip Back" title="Skip Back" onClick={handleSkipBack} aria-hidden={steps.length===0}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="11 19 2 12 11 5"></polyline>
                <line x1="22" y1="19" x2="13" y2="12"></line>
              </svg>
            </button>
            <button className="ucb-button" data-tooltip="Prev" title="Prev" onClick={handleStepBack} aria-hidden={steps.length===0}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <button className="ucb-primary" data-tooltip={isPlaying ? 'Pause' : 'Play'} title="Play/Pause" onClick={() => setIsPlaying(v => !v)}>
              {isPlaying ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              )}
            </button>
            <button className="ucb-button" data-tooltip="Next" title="Next" onClick={handleStepForward} aria-hidden={steps.length===0}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: 'scaleX(-1)' }}>
                <polyline points="11 19 2 12 11 5"></polyline>
                <line x1="22" y1="19" x2="13" y2="12"></line>
              </svg>
            </button>
            <button className="ucb-button" data-tooltip="Skip Forward" title="Skip Forward" onClick={handleSkipForward} aria-hidden={steps.length===0}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="2" y1="12" x2="11" y2="12"></line><polyline points="13 19 22 12 13 5"></polyline></svg>
            </button>
          </div>

          <button className="ucb-chip" data-tooltip="Speed" onClick={() => {
            const presets = [2000, 1000, 500];
            const idx = presets.indexOf(speed);
            const next = presets[(idx + 1) % presets.length];
            setSpeed(next);
          }}>{Math.round(1000 / speed * 10) / 10}x
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 4 }}><path d="M6 9l6 6 6-6"/></svg>
          </button>

          <div className="ucb-sep" />

          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button className="ucb-button" data-tooltip="Search" title="Search" onClick={handleSearch} aria-label="Search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></button>
            <button ref={batchBtnRef} type="button" className="ucb-mini" onClick={(e) => { e.stopPropagation(); if (!showBatchInput) openBatchWithAnimation(); else closeBatchWithAnimation(); }} aria-label="Batch">
              <span className="ucb-mini-label">Batch</span>
            </button>
            <button className="ucb-button" data-tooltip="Export" title="Export" onClick={() => { if (mode === 'rbt') handleExport(); else handleExportMCM(); }} aria-label="Export">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
          </div>
        </nav>
        <div className="header-right">
          <button className="hamburger" onClick={() => setRightOpen(v => !v)} aria-label="Toggle Steps Panel">☰</button>
        </div>
      </header>
      
      
      
      <div className="main-content">
        <LeftPanel collapsed={!leftOpen} selectedTopicId={selectedTopicId} onTopicChange={(id) => setSelectedTopicId(id)} mode={mode} />
        <main className="visualizer-container" ref={containerRef}>
          {mode === 'rbt' ? (
            <TreeVisualizer step={currentStep} width={dimensions.width} height={dimensions.height} />
          ) : (
            <MatrixChainVisualizer
              onStepsUpdate={(s: Step[]) => { setSteps(s); setCurrentStepIndex(s.length > 0 ? 0 : -1); setIsPlaying(false); }}
              onPreviewSvg={(svg) => setMcmPreviewSvg(svg)}
              activeStep={currentStep}
              onDimensionsChange={(dims: number[]) => setMcmDimensions(dims)}
            />
          )}
        </main>
        
        <aside className={`steps-panel ${!rightOpen ? 'collapsed' : ''}`}>
          <div className="diagram-preview">
            {mode === 'rbt' ? (
              <TreeVisualizer step={currentStep} width={280} height={180} showDescription={false} />
            ) : (
              <div style={{ width: 280, height: 180, overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: mcmPreviewSvg ?? '<div style="padding:12px;color:#666">No preview</div>' }} />
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1rem' }}>
            <h3 style={{ margin: 0 }}>Step History</h3>
            {steps.length > 0 && (
              <button 
                onClick={handleClearAll} 
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  fontSize: '1.2rem', 
                  cursor: 'pointer',
                  padding: '0.25rem',
                  color: '#dc2626',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#991b1b'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#dc2626'}
                title="Clear all steps"
                aria-label="Clear all steps"
              >
                🗑️
              </button>
            )}
          </div>
          <ul ref={stepsListRef}>
            {mode === 'rbt' ? (
              (() => {
                const ops = tree.getOperations();
                if (ops.length === 0 || steps.length === 0) return <li className="empty">No steps recorded yet.</li>;
                const items: React.ReactElement[] = [];
                let globalIndex = 0;
                for (const op of ops) {
                  const opSteps = steps.filter(s => s.operationId === op.id);
                  if (opSteps.length === 0) continue; // Skip operations with no steps
                  items.push(
                    <li key={`op-${op.id}`} style={{ backgroundColor: '#f3f4f6', fontWeight: 700, padding: '0.5rem 1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>{op.type} {op.keys && op.keys.length > 0 ? ` — Keys: ${op.keys.join(', ')}` : ''}</div>
                        <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>Steps: {opSteps.length}</div>
                      </div>
                    </li>
                  );
                  opSteps.forEach((step) => {
                    const idx = globalIndex;
                    items.push(
                      <li 
                        key={step.id}
                        className={idx === currentStepIndex ? 'active' : ''}
                        onClick={() => handleJumpToStep(idx)}
                      >
                        <span className="step-number">{idx + 1}</span>
                        <div className="step-info">
                          <span className="step-type">{step.type}</span>
                          <span className="step-desc">{step.description}</span>
                        </div>
                      </li>
                    );
                    globalIndex++;
                  });
                }
                if (items.length === 0) return <li className="empty">No steps recorded yet.</li>;
                return items;
              })()
              ) : (
              // Matrix Chain mode: flat list of steps computed by visualizer
              steps.length === 0 ? <li className="empty">No steps computed yet.</li> : (
                steps.map((step, idx) => {
                  // show only the first line (level title) in the right panel for MCM
                  const firstLine = (step.description || '').split('\n')[0] || step.description || '';
                  return (
                    <li key={step.id} className={idx === currentStepIndex ? 'active' : ''} onClick={() => handleJumpToStep(idx)}>
                      <span className="step-number">{idx + 1}</span>
                      <div className="step-info">
                        <span className="step-type">{step.type}</span>
                        <span className="step-desc">{firstLine}</span>
                      </div>
                    </li>
                  );
                })
              )
            )}
          </ul>
        </aside>
      </div>
      
      <footer className="app-footer">
        <p>Total Steps: {steps.length} | Current: {currentStepIndex + 1}</p>
      </footer>
    </div>
  );
}

export default App;
