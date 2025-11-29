import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Topic = {
  id: string;
  title: string;
  md: string;
  pdf?: string;
  category?: 'rbt' | 'mcm' | string;
};

const FALLBACK_TOPICS: Topic[] = [
  { id: 'red_black_tree', title: 'Red-Black Tree Overview', md: '/dsa-theory/red_black_tree.md', pdf: '/data/rbt_notes.pdf', category: 'rbt' },
  { id: 'rotations', title: 'Rotations (Left / Right)', md: '/dsa-theory/rotations.md', pdf: '/data/rbt_rotations.pdf', category: 'rbt' },
  { id: 'properties', title: 'RBT Properties', md: '/dsa-theory/properties.md', pdf: '/data/rbt_properties.pdf', category: 'rbt' }
];

type LeftPanelProps = {
  collapsed?: boolean;
  selectedTopicId?: string | null;
  onTopicChange?: (id: string) => void;
  mode?: 'rbt' | 'mcm';
};

export default function LeftPanel({ collapsed = false, selectedTopicId, onTopicChange, mode }: LeftPanelProps) {
  const [topics, setTopics] = useState<Topic[]>(FALLBACK_TOPICS);
  const [active, setActive] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [contentsMap, setContentsMap] = useState<Record<string, string>>({});

  // Load topics list dynamically from public/dsa-theory/topics.json if available
  useEffect(() => {
    fetch('/dsa-theory/topics.json')
      .then(res => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data: Topic[] | null) => {
        if (Array.isArray(data) && data.length > 0) {
          setTopics(data);
          // choose an initial active topic that matches the current mode if possible
          if (mode) {
            const match = data.find(t => (t.category ?? '').toLowerCase() === mode);
            const chosen = match ? match.id : data[0].id;
            setActive(prev => prev ?? chosen);
            setExpanded(prev => prev ?? chosen);
          } else {
            setActive(prev => prev ?? data[0].id);
            setExpanded(prev => prev ?? data[0].id);
          }
        } else {
          // keep fallback
          setActive(prev => prev ?? FALLBACK_TOPICS[0].id);
        }
      })
      .catch(() => setActive(prev => prev ?? FALLBACK_TOPICS[0].id));
  }, []);

  // Load markdown content when active/expanded topic changes
  useEffect(() => {
    // allow external selection to override active/expanded
    if (selectedTopicId && selectedTopicId !== active) {
      setActive(selectedTopicId);
      setExpanded(selectedTopicId);
      if (onTopicChange) onTopicChange(selectedTopicId);
      return;
    }
    const idToLoad = expanded ?? active;
    if (!idToLoad) return;
    // if we already loaded this content, do nothing
    if (contentsMap[idToLoad]) return;
    const t = topics.find(x => x.id === idToLoad);
    if (!t) return;

    fetch(t.md)
      .then(res => {
        if (!res.ok) {
          setContentsMap(prev => ({ ...prev, [idToLoad]: 'Could not load notes. Make sure the file exists in public/dsa-theory/' }));
          return '';
        }
        return res.text();
      })
      .then((text: string) => {
        if (text) setContentsMap(prev => ({ ...prev, [idToLoad]: text }));
      })
      .catch(() => setContentsMap(prev => ({ ...prev, [idToLoad]: 'Could not load notes.' })));
  }, [active, topics, expanded, selectedTopicId]);

  // When the mode changes, ensure the active topic matches the mode's category
  useEffect(() => {
    if (!mode || topics.length === 0) return;
    const filtered = topics.filter(t => (t.category ?? '').toLowerCase() === mode);
    if (filtered.length === 0) return;
    if (!active || !filtered.find(f => f.id === active)) {
      setActive(filtered[0].id);
      if (onTopicChange) onTopicChange(filtered[0].id);
    }
  }, [mode, topics]);

  // When expanded content becomes available, request MathJax typesetting for that element
  useEffect(() => {
    if (!expanded) return;
    if (!contentsMap[expanded]) return;
    try {
      const ev = new CustomEvent('leftpanel-typeset', { detail: { id: `topic-content-${expanded}` } });
      window.dispatchEvent(ev as any);
    } catch {}
  }, [expanded, contentsMap]);

  return (
    <aside className={`left-panel ${collapsed ? 'collapsed' : ''}`}>
      <div className="left-panel-header">
        <h3>Theory</h3>
      </div>
      <div className="left-panel-body" style={{ overflowX: 'hidden', padding: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(() => {
            const filtered = topics.filter(t => {
              if (!mode) return true;
              if (mode === 'mcm') return (t.category ?? '').toLowerCase() === 'mcm';
              if (mode === 'rbt') return (t.category ?? '').toLowerCase() === 'rbt';
              return true;
            });
            return filtered.map(t => {
              const isExpanded = expanded === t.id;
              return (
                <div key={t.id} style={{ borderRadius: 8, background: isExpanded ? '#ffffff' : '#f8fafc', color: '#111827', boxShadow: isExpanded ? '0 4px 12px rgba(15,23,42,0.06)' : 'none', overflow: 'hidden', border: isExpanded ? '1px solid #e6edf3' : '1px solid transparent', maxWidth: '100%' }}>
                  <button
                    aria-expanded={isExpanded}
                    onClick={() => {
                      const next = isExpanded ? null : t.id;
                      setExpanded(next);
                      setActive(t.id);
                      if (onTopicChange && next) onTopicChange(t.id);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 8 }}>{t.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {t.pdf ? <div style={{ fontSize: 10, padding: '2px 4px', borderRadius: 4, background: '#eef2f7', color: '#6b7280' }}>PDF</div> : null}
                      <div style={{ width: 24, height: 24, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', border: '1px solid #e6edf3' }}>
                        <span style={{ fontSize: 16, lineHeight: 1, color: '#111827' }}>{isExpanded ? '−' : '+'}</span>
                      </div>
                    </div>
                  </button>
                  {isExpanded ? (
                    <div style={{ padding: 10, borderTop: '1px solid #eef2f7', background: '#ffffff', maxWidth: '100%', boxSizing: 'border-box' }}>
                      <div style={{ marginBottom: 6, fontSize: 12 }}><strong style={{ color: '#111827' }}>{t.title}</strong></div>
                      <div id={`topic-content-${t.id}`} style={{ maxHeight: 200, overflowY: 'auto', overflowX: 'hidden', paddingRight: 4, fontSize: '0.8rem', wordWrap: 'break-word', maxWidth: '100%' }}>
                        {contentsMap[t.id] ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{contentsMap[t.id]}</ReactMarkdown>
                        ) : (
                          <div style={{ color: '#6b7280' }}>Loading...</div>
                        )}
                      </div>
                      {t.pdf ? <div style={{ marginTop: 8, fontSize: '0.8rem' }}><a style={{ color: '#0366d6' }} href={t.pdf} target="_blank" rel="noreferrer">Open PDF</a></div> : null}
                    </div>
                  ) : null}
                </div>
              );
            });
          })()}
        </div>
      </div>
    </aside>
  );
}

// Load MathJax dynamically and typeset expanded content when available
function ensureMathJax(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).MathJax) return resolve();
    // Configure MathJax before loading
    (window as any).MathJax = {
      tex: { inlineMath: [['$', '$'], ['\\(', '\\)']] },
      options: { skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre'] }
    };
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load MathJax'));
    document.head.appendChild(s);
  });
}

// When expanded content is loaded or expanded changes, typeset the math in that area
// (This effect cannot be inside the component due to hooks rules; we will attach a global observer)
const _leftPanelMathObserver = (function () {
  let initialized = false;
  if (typeof window === 'undefined') return null as any;
  return {
    init: () => {
      if (initialized) return;
      initialized = true;
      // Watch for custom event to typeset a specific element id
      window.addEventListener('leftpanel-typeset', async (ev: any) => {
        const detail = ev.detail as { id: string } | undefined;
        if (!detail || !detail.id) return;
        try {
          await ensureMathJax();
          const el = document.getElementById(detail.id);
          if (el && (window as any).MathJax && (window as any).MathJax.typesetPromise) {
            (window as any).MathJax.typesetPromise([el]).catch(() => {});
          }
        } catch (err) {
          // ignore
        }
      });
    }
  };
})();

// Initialize the global observer immediately
try { _leftPanelMathObserver && _leftPanelMathObserver.init(); } catch {}
