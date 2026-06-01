import React, { forwardRef, useEffect, useRef, CSSProperties, ReactNode, KeyboardEvent, MouseEvent } from 'react';

interface FocusableProps {
  as?: 'div' | 'button' | 'a' | 'span';
  onActivate?: (e: KeyboardEvent | MouseEvent) => void;
  onSecondary?: (e: KeyboardEvent) => void;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  onClick?: (e: MouseEvent) => void;
  autoFocus?: boolean;
  onKeyDown?: (e: KeyboardEvent) => void;
  role?: string;
  id?: string;
  [key: string]: any;
}

export const Focusable = forwardRef<HTMLElement, FocusableProps>(function Focusable(
  { as: Tag = 'div', onActivate, onSecondary, className, style, children, onClick, autoFocus, ...rest },
  ref
) {
  const innerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (autoFocus && innerRef.current) innerRef.current.focus();
  }, [autoFocus]);

  const setRefs = (node: HTMLElement | null) => {
    innerRef.current = node;
    if (typeof ref === 'function') (ref as any)(node);
    else if (ref && 'current' in (ref as any)) (ref as any).current = node;
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate && onActivate(e);
    } else if (onSecondary && (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey))) {
      e.preventDefault();
      onSecondary(e);
    }
    if (rest.onKeyDown) rest.onKeyDown(e);
  };
  const handleClick = (e: MouseEvent) => {
    if (onClick) onClick(e);
    else if (onActivate) onActivate(e);
  };
  return (
    <Tag
      ref={setRefs as any}
      className={className}
      style={style}
      tabIndex={0}
      role={rest.role || 'button'}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      {children}
    </Tag>
  );
});

export default Focusable;
