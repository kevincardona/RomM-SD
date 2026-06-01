import React, { useState, useRef, useEffect, CSSProperties, ReactNode } from 'react';
import Focusable from './Focusable';
import { isBrowserPlaySupported } from '../browserPlaySupport';
import type { Game, Library } from '../vite-env';

interface FilterChipProps {
  label: ReactNode;
  active?: boolean;
  onActivate: () => void;
  badge?: number | null;
  style?: CSSProperties;
}

function FilterChip({ label, active, onActivate, badge, style }: FilterChipProps) {
  return (
    <Focusable
      className={`filter-chip ${active ? 'active' : ''}`}
      onActivate={onActivate}
      role="button"
      aria-pressed={active}
      style={style}
    >
      {badge != null && (
        <span style={{
          background: active ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)',
          color: active ? '#000' : 'var(--text-muted)',
          borderRadius: '10px',
          padding: '0 6px',
          fontSize: '0.7rem',
          fontWeight: 700,
          minWidth: '20px',
          textAlign: 'center',
        }}>{badge}</span>
      )}
      {label}
    </Focusable>
  );
}

type DropdownItem = string | { value: any; label: string };

interface DropdownProps {
  label: string;
  items: DropdownItem[];
  selected: any;
  onSelect: (value: any) => void;
  renderItem?: (item: DropdownItem) => ReactNode;
  activeColor?: boolean;
  count?: number;
}

function Dropdown({ label, items, selected, onSelect, renderItem, activeColor = true, count }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onDocClick);
    return () => window.removeEventListener('mousedown', onDocClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => {
      if (chipRef.current) setRect(chipRef.current.getBoundingClientRect());
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open]);

  const handleOpen = () => {
    if (!open && chipRef.current) {
      setRect(chipRef.current.getBoundingClientRect());
    }
    setOpen(o => !o);
  };

  const displayLabel = selected != null
    ? (typeof selected === 'string' ? selected : 'All')
    : label;
  const isActive = !!selected;

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <div ref={chipRef} style={{ display: 'inline-block' }}>
        <FilterChip
          label={displayLabel}
          active={isActive}
          badge={count != null ? count : items.length}
          onActivate={handleOpen}
        />
      </div>
      {open && rect && (
        <div
          className="modal-overlay"
          style={{
            background: 'transparent',
            zIndex: 200,
            display: 'block',
            alignItems: 'stretch',
            justifyContent: 'flex-start',
          }}
          onClick={() => setOpen(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } }}
        >
          <div
            style={{
              position: 'fixed',
              top: Math.min(rect.bottom + 6, window.innerHeight - 60),
              left: Math.min(rect.left, window.innerWidth - 340),
              width: '320px',
              maxWidth: '90vw',
              maxHeight: '60vh',
              overflowY: 'auto',
              padding: '8px',
              background: 'rgba(20, 25, 40, 0.98)',
              border: '1px solid var(--panel-border)',
              borderRadius: '10px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
            }}
          >
            {items.map((item, i) => {
              const value = typeof item === 'string' ? item : item.value;
              const display = typeof item === 'string' ? item : item.label;
              const itemSelected = selected === value;
              const isFirst = i === 0;
              return (
                <Focusable
                  key={value ?? '__all__'}
                  autoFocus={isFirst}
                  className={`filter-chip ${activeColor && itemSelected ? 'active' : ''}`}
                  style={{ width: '100%', justifyContent: 'flex-start', marginBottom: '4px' }}
                  onActivate={() => { onSelect(value); setOpen(false); }}
                >
                  {renderItem ? renderItem(item) : display}
                </Focusable>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface FilterBarProps {
  games: Game[];
  library: Library;
  selectedPlatform: string | null;
  onPlatformChange: (p: string | null) => void;
  downloadedOnly: boolean;
  onDownloadedChange: (v: boolean) => void;
  showDownloaded?: boolean;
  playInBrowserOnly: boolean;
  onPlayInBrowserChange: (v: boolean) => void;
  showPlayInBrowser?: boolean;
  collections?: string[];
  selectedCollection?: string | null;
  onCollectionChange?: (c: string | null) => void;
  onBackToCollectionsRoot?: () => void;
}

export default function FilterBar({
  games,
  library,
  selectedPlatform,
  onPlatformChange,
  downloadedOnly,
  onDownloadedChange,
  showDownloaded,
  playInBrowserOnly,
  onPlayInBrowserChange,
  showPlayInBrowser,
  collections,
  selectedCollection,
  onCollectionChange,
  onBackToCollectionsRoot,
}: FilterBarProps) {
  const platforms = Object.keys(library?.platforms || {}).sort();
  const platformItems: DropdownItem[] = [{ value: null, label: 'All Platforms' }, ...platforms.map(p => ({ value: p, label: p }))];
  const collectionItems: DropdownItem[] = [{ value: null, label: 'All Collections' }, ...((collections || []).map(c => ({ value: c, label: c })))];
  const totalCount = games.length;
  const downloadedCount = games.filter(g => g.downloaded).length;
  const playInBrowserCount = games.filter(g => isBrowserPlaySupported(g.emuFolder)).length;

  return (
    <div className="filter-bar">
      <span className="filter-bar-label">Filters</span>

      {onBackToCollectionsRoot && (
        <FilterChip
          label="← Collections"
          onActivate={onBackToCollectionsRoot}
        />
      )}

      {collections && onCollectionChange && (
        <Dropdown
          label="All Collections"
          items={collectionItems}
          selected={selectedCollection}
          onSelect={onCollectionChange}
        />
      )}

      {platforms.length > 0 && onPlatformChange && (
        <Dropdown
          label="All Platforms"
          items={platformItems}
          selected={selectedPlatform}
          onSelect={onPlatformChange}
        />
      )}

      {showDownloaded && onDownloadedChange && (
        <FilterChip
          label={downloadedOnly ? 'Downloaded ✓' : 'Downloaded'}
          active={downloadedOnly}
          badge={downloadedCount}
          onActivate={() => onDownloadedChange(!downloadedOnly)}
        />
      )}

      {showPlayInBrowser && onPlayInBrowserChange && (
        <FilterChip
          label={playInBrowserOnly ? 'Play in Browser ✓' : 'Play in Browser'}
          active={playInBrowserOnly}
          badge={playInBrowserCount}
          onActivate={() => onPlayInBrowserChange(!playInBrowserOnly)}
        />
      )}

      {totalCount > 0 && (
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {totalCount} {totalCount === 1 ? 'game' : 'games'}
        </span>
      )}
    </div>
  );
}
