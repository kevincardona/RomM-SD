import React, { useEffect, useRef, ReactNode } from 'react';

interface ModalProps {
  onClose: () => void;
  children: ReactNode | ((api: { refocusFirst: () => void }) => ReactNode);
  maxWidth?: string | number;
  width?: string | number;
}

export default function Modal({ onClose, children, maxWidth, width }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null;
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
      const focusable = el.querySelector<HTMLElement>('button:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled]), input:not([disabled]):not([tabindex="-1"])');
      if (focusable) focusable.focus();
    }, 0);
    return () => clearTimeout(id);
  });

  const refocusFirst = () => {
    const first = ref.current?.querySelector<HTMLElement>('button:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])');
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
