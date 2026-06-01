import React, { forwardRef, useEffect, useRef } from 'react';

export const Focusable = forwardRef(function Focusable({ as: Tag = 'div', onActivate, onSecondary, className, style, children, onClick, autoFocus, ...rest }, ref) {
  const innerRef = useRef(null);

  useEffect(() => {
    if (autoFocus && innerRef.current) innerRef.current.focus();
  }, [autoFocus]);

  const setRefs = (node) => {
    innerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate && onActivate(e);
    } else if (onSecondary && (e.key === 'ContextMenu' || e.key === 'F10' && e.shiftKey)) {
      e.preventDefault();
      onSecondary(e);
    }
    if (rest.onKeyDown) rest.onKeyDown(e);
  };
  const handleClick = (e) => {
    if (onClick) onClick(e);
    else if (onActivate) onActivate(e);
  };
  return (
    <Tag
      ref={setRefs}
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
