import React, { useEffect, useRef } from 'react';

export default function Modal({ onClose, children, maxWidth, width }) {
  const ref = useRef(null);
  const previousFocus = useRef(null);

  useEffect(() => {
    previousFocus.current = document.activeElement;
    const first = ref.current?.querySelector('button, [tabindex]:not([tabindex="-1"])');
    if (first) first.focus();
    return () => {
      if (previousFocus.current && document.body.contains(previousFocus.current)) {
        previousFocus.current.focus();
      }
    };
  }, []);

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
