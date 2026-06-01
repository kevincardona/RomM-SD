import React, { useEffect, useRef } from 'react';

export default function Modal({ onClose, children, maxWidth, width }) {
  const ref = useRef(null);
  const previousFocus = useRef(null);

  useEffect(() => {
    previousFocus.current = document.activeElement;
    return () => {
      if (previousFocus.current && document.body.contains(previousFocus.current)) {
        previousFocus.current.focus();
      }
    };
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const focusable = el.querySelector('button:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled]), input:not([disabled]):not([tabindex="-1"])');
      if (focusable) focusable.focus();
    }, 0);
    return () => clearTimeout(id);
  });

  const refocusFirst = () => {
    const first = ref.current?.querySelector('button:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])');
    if (first) first.focus();
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div
        ref={ref}
        className="modal"
        style={{ maxWidth, width }}
        onClick={(e) => e.stopPropagation()}
      >
        {typeof children === 'function' ? children({ refocusFirst }) : children}
      </div>
    </div>
  );
}
