import { useEffect } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function isVisible(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  const style = window.getComputedStyle(el);
  if (style.visibility === 'hidden' || style.display === 'none' || parseFloat(style.opacity || '1') === 0) return false;
  return true;
}

export function useSpatialNavigation(disabled: boolean = false) {
  useEffect(() => {
    if (disabled) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (!keys.includes(e.key)) return;

      const current = document.activeElement as HTMLElement | null;
      const currentModal = current?.closest('.modal-overlay') || null;

      const focusable = (Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)))
        .filter(el => isVisible(el))
        .filter(el => {
          if (currentModal) {
            return el.closest('.modal-overlay') === currentModal;
          }
          return !el.closest('.modal-overlay');
        });

      if (focusable.length === 0) return;

      if (!current || !focusable.includes(current)) {
        focusable[0].focus();
        e.preventDefault();
        return;
      }

      const rect1 = current.getBoundingClientRect();
      let bestMatch: HTMLElement | null = null;
      let minDistance = Infinity;

      focusable.forEach((node) => {
        if (node === current) return;
        const rect2 = node.getBoundingClientRect();

        let dx = 0;
        let dy = 0;
        let valid = false;

        if (e.key === 'ArrowRight' && rect2.left >= rect1.right - 10) {
          dx = rect2.left - rect1.right;
          dy = (rect2.top + rect2.height / 2) - (rect1.top + rect1.height / 2);
          valid = true;
        } else if (e.key === 'ArrowLeft' && rect2.right <= rect1.left + 10) {
          dx = rect1.left - rect2.right;
          dy = (rect2.top + rect2.height / 2) - (rect1.top + rect1.height / 2);
          valid = true;
        } else if (e.key === 'ArrowDown' && rect2.top >= rect1.bottom - 10) {
          dy = rect2.top - rect1.bottom;
          dx = (rect2.left + rect2.width / 2) - (rect1.left + rect1.width / 2);
          valid = true;
        } else if (e.key === 'ArrowUp' && rect2.bottom <= rect1.top + 10) {
          dy = rect1.top - rect2.bottom;
          dx = (rect2.left + rect2.width / 2) - (rect1.left + rect1.width / 2);
          valid = true;
        }

        if (valid) {
          const dist = dx * dx + dy * dy * 5;
          if (dist < minDistance) {
            minDistance = dist;
            bestMatch = node;
          }
        }
      });

      if (bestMatch) {
        bestMatch.focus();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled]);
}
