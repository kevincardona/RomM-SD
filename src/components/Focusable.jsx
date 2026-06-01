import React from 'react';

export function Focusable({ as: Tag = 'div', onActivate, onSecondary, className, style, children, ...rest }) {
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
  return (
    <Tag
      className={className}
      style={style}
      tabIndex={0}
      role={rest.role || 'button'}
      onClick={onActivate}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export default Focusable;
