import React from 'react';

interface Hint {
  key: string;
  label: string;
}

interface ControllerHintsProps {
  hints: Hint[];
}

function Btn({ label }: { label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)',
      borderRadius: '5px', padding: '0 7px', height: '20px',
      fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.5px',
      color: 'var(--text-main)', lineHeight: 1,
    }}>{label}</span>
  );
}

export default function ControllerHints({ hints }: ControllerHintsProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
      padding: '5px 40px', borderTop: '1px solid var(--panel-border)',
      background: 'rgba(0,0,0,0.25)', flexShrink: 0,
    }}>
      {hints.map(h => (
        <span key={h.key} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <Btn label={h.key} />
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{h.label}</span>
        </span>
      ))}
    </div>
  );
}
