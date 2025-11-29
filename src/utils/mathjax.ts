// MathJax typesetting utility
declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: (elements?: HTMLElement[]) => Promise<void>;
      startup?: {
        promise?: Promise<void>;
      };
    };
  }
}

export async function typesetElementById(id: string): Promise<void> {
  if (typeof window === 'undefined' || !window.MathJax) return;
  
  const element = document.getElementById(id);
  if (!element) return;

  try {
    if (window.MathJax.startup?.promise) {
      await window.MathJax.startup.promise;
    }
    
    if (window.MathJax.typesetPromise) {
      await window.MathJax.typesetPromise([element]);
    }
  } catch (error) {
    console.warn('MathJax typesetting failed:', error);
  }
}
