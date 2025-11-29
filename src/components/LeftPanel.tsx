import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { typesetElementById } from '../utils/mathjax';

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
    // use the shared helper to typeset only the expanded topic content
    typesetElementById(`topic-content-${expanded}`).catch(() => {});
  }, [expanded, contentsMap]);

  return (
    <aside className={`left-panel ${collapsed ? 'collapsed' : ''}`}>
      <div className="left-panel-header">
        <h3>Theory</h3>
      </div>
      <div className="left-panel-body" style={{ overflowX: 'hidden', padding: '12px 8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                <div key={t.id} style={{ borderRadius: 12, background: isExpanded ? '#ffffff' : '#f8fafc', color: '#111827', boxShadow: isExpanded ? '0 6px 18px rgba(15,23,42,0.06)' : 'none', overflow: 'hidden', border: isExpanded ? '1px solid #e6edf3' : '1px solid transparent' }}>
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
                      padding: '14px 16px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{t.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {t.pdf ? <div style={{ fontSize: 12, padding: '4px 6px', borderRadius: 6, background: '#eef2f7', color: '#6b7280' }}>PDF</div> : null}
                      <div style={{ width: 34, height: 34, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', border: '1px solid #e6edf3' }}>
                        <span style={{ fontSize: 18, lineHeight: 1, color: '#111827' }}>{isExpanded ? '−' : '+'}</span>
                      </div>
                    </div>
                  </button>
                  {isExpanded ? (
                    <div style={{ padding: 16, borderTop: '1px solid #eef2f7', background: '#ffffff' }}>
                      <div style={{ marginBottom: 8 }}><strong style={{ color: '#111827' }}>{t.title}</strong></div>
                      <div id={`topic-content-${t.id}`} style={{ maxHeight: 300, overflowY: 'auto', paddingRight: 6 }}>
                        {contentsMap[t.id] ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{contentsMap[t.id]}</ReactMarkdown>
                        ) : (
                          <div style={{ color: '#6b7280' }}>Loading...</div>
                        )}
                      </div>
                      {t.pdf ? <div style={{ marginTop: 12 }}><a style={{ color: '#0366d6' }} href={t.pdf} target="_blank" rel="noreferrer">Open PDF</a></div> : null}
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

// No global event plumbing needed here — components call the shared helper directly.
