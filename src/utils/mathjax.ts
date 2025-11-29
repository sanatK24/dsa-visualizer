// Lightweight MathJax helper: lazy-loads MathJax v3 and typesets a single element by id
let _mathJaxLoading: Promise<void> | null = null;

export function ensureMathJax(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if ((window as any).MathJax) return Promise.resolve();
  if (_mathJaxLoading) return _mathJaxLoading;
  _mathJaxLoading = new Promise((resolve, reject) => {
    try {
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
    } catch (err) {
      reject(err);
    }
  });
  return _mathJaxLoading;
}

export async function typesetElementById(id: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await ensureMathJax();
    const el = document.getElementById(id);
    if (!el) return;
    if ((window as any).MathJax && (window as any).MathJax.typesetPromise) {
      await (window as any).MathJax.typesetPromise([el]).catch(() => {});
    }
  } catch (err) {
    // swallow errors to avoid disrupting UI
  }
}

export async function typesetElement(el: HTMLElement | null): Promise<void> {
  if (!el) return;
  try {
    await ensureMathJax();
    if ((window as any).MathJax && (window as any).MathJax.typesetPromise) {
      await (window as any).MathJax.typesetPromise([el]).catch(() => {});
    }
  } catch {}
}
