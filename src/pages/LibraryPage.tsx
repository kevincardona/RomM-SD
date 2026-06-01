import React, { useState, useEffect, useRef, useMemo, useCallback, UIEvent } from 'react';
import GameCard from '../components/GameCard';
import FilterBar from '../components/FilterBar';
import type { Game, Library, Config } from '../vite-env';

interface LetterNav {
  scrollToLetter: (letter: string) => void;
  letterOffset: (direction: number) => void;
}

interface LibraryPageProps {
  title: string;
  games: Game[];
  token: string;
  onGameSelect: (game: Game) => void;
  config: Config;
  onRegisterLetterNav?: (nav: LetterNav | null) => void;
  library: Library;
  selectedPlatform: string | null;
  onPlatformChange: (p: string | null) => void;
  downloadedOnly: boolean;
  onDownloadedChange: (v: boolean) => void;
  showDownloadedToggle?: boolean;
  playInBrowserOnly: boolean;
  onPlayInBrowserChange: (v: boolean) => void;
  showPlayInBrowserToggle?: boolean;
  collections?: string[];
  selectedCollection?: string | null;
  onCollectionChange?: (c: string | null) => void;
  onBackToCollectionsRoot?: (() => void) | null;
}

function groupByLetter(games: Game[]): Map<string, Game[]> {
  const out = new Map<string, Game[]>();
  for (const g of games) {
    const ch = (g.title[0] || '').toUpperCase();
    if (!ch) continue;
    if (!out.has(ch)) out.set(ch, []);
    out.get(ch)!.push(g);
  }
  return out;
}

export default function LibraryPage({
  title, games, token, onGameSelect, config, onRegisterLetterNav,
  library, selectedPlatform, onPlatformChange, downloadedOnly, onDownloadedChange, showDownloadedToggle,
  playInBrowserOnly, onPlayInBrowserChange, showPlayInBrowserToggle,
  collections, selectedCollection, onCollectionChange, onBackToCollectionsRoot,
}: LibraryPageProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [visibleCount, setVisibleCount] = useState<number>(50);
  const [overlayKey, setOverlayKey] = useState<number | null>(null);
  const [overlayLetter, setOverlayLetter] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const overlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setVisibleCount(50); }, [games, searchQuery]);

  const sortedGames = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return [...games]
      .filter(g => g.title.toLowerCase().includes(q))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [games, searchQuery]);

  const visibleGames = useMemo(() => sortedGames.slice(0, visibleCount), [sortedGames, visibleCount]);
  const letterMap = useMemo(() => groupByLetter(sortedGames), [sortedGames]);
  const availableLetters = useMemo(() => [...letterMap.keys()].sort(), [letterMap]);

  const showOverlay = useCallback((letter: string) => {
    setOverlayLetter(letter);
    setOverlayKey(k => (k ?? 0) + 1);
    if (overlayTimer.current) clearTimeout(overlayTimer.current);
    overlayTimer.current = setTimeout(() => setOverlayLetter(null), 700);
  }, []);

  const scrollToLetter = useCallback((letter: string) => {
    if (!letter) return;
    const upper = letter.toUpperCase();
    const list = letterMap.get(upper);
    if (!list || list.length === 0) return;
    const target = list[0];
    const index = sortedGames.indexOf(target);
    if (index + 50 > visibleCount) setVisibleCount(index + 50);
    showOverlay(upper);

    let attempts = 0;
    const focus = () => {
      const el = document.getElementById(`game-${target.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        requestAnimationFrame(() => el.focus({ preventScroll: true }));
      } else if (attempts++ < 5) {
        setTimeout(focus, 60);
      }
    };
    requestAnimationFrame(focus);
  }, [letterMap, sortedGames, visibleCount, showOverlay]);

  const findCurrentLetter = useCallback((): string | null => {
    if (availableLetters.length === 0) return null;
    const container = contentRef.current;
    if (!container) return availableLetters[0];
    const containerTop = container.getBoundingClientRect().top;
    const cards = container.querySelectorAll<HTMLElement>('.game-card');
    let best: HTMLElement | null = null;
    let bestDist = Infinity;
    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      if (rect.bottom <= containerTop) return;
      const dist = Math.abs(rect.top - containerTop);
      if (dist < bestDist) { bestDist = dist; best = card; }
    });
    if (!best) return availableLetters[0];
    const id = best.id;
    const game = sortedGames.find(g => `game-${g.id}` === id);
    const letter = (game?.title || '')[0]?.toUpperCase();
    return letter || availableLetters[0];
  }, [sortedGames, availableLetters]);

  const letterOffset = useCallback((direction: number) => {
    if (availableLetters.length === 0) return;
    const currentLetter = findCurrentLetter();
    const idx = availableLetters.indexOf(currentLetter!);
    const nextIdx = idx < 0
      ? (direction > 0 ? 0 : availableLetters.length - 1)
      : (direction > 0 ? Math.min(idx + 1, availableLetters.length - 1) : Math.max(idx - 1, 0));
    scrollToLetter(availableLetters[nextIdx]);
  }, [findCurrentLetter, availableLetters, scrollToLetter]);

  useEffect(() => {
    if (onRegisterLetterNav) onRegisterLetterNav({ scrollToLetter, letterOffset });
    return () => { if (onRegisterLetterNav) onRegisterLetterNav(null); };
  }, [onRegisterLetterNav, scrollToLetter, letterOffset]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') { e.preventDefault(); searchInputRef.current?.focus(); }
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) searchInputRef.current?.blur();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 500 && visibleCount < sortedGames.length) {
      setVisibleCount(prev => Math.min(prev + 50, sortedGames.length));
    }
  };

  const gridVar = config.gridSize === 'small' ? '120px' : config.gridSize === 'large' ? '240px' : '180px';

  return (
    <>
      <div className="topbar">
        <h2 style={{ margin: 0 }}>{title}</h2>
        <input
          ref={searchInputRef}
          type="text"
          className="search-input"
          placeholder="Search games..."
          tabIndex={0}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              window.electronAPI?.showKeyboard();
            }
          }}
        />
      </div>
      {library && (
        <FilterBar
          games={games}
          library={library}
          selectedPlatform={selectedPlatform}
          onPlatformChange={onPlatformChange}
          downloadedOnly={downloadedOnly}
          onDownloadedChange={onDownloadedChange}
          showDownloaded={showDownloadedToggle}
          playInBrowserOnly={playInBrowserOnly}
          onPlayInBrowserChange={onPlayInBrowserChange}
          showPlayInBrowser={showPlayInBrowserToggle}
          collections={collections}
          selectedCollection={selectedCollection}
          onCollectionChange={onCollectionChange}
          onBackToCollectionsRoot={onBackToCollectionsRoot ?? undefined}
        />
      )}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div className="content-area" ref={contentRef} onScroll={handleScroll} style={{ flex: 1 }}>
          <div className="game-grid" style={{ '--grid-card-width': gridVar } as React.CSSProperties}>
            {visibleGames.map(game => (
              <GameCard
                key={game.id}
                id={`game-${game.id}`}
                game={game}
                token={token}
                onClick={onGameSelect}
                onContextMenu={onGameSelect}
                config={config}
              />
            ))}
            {sortedGames.length === 0 && (
              <div style={{ padding: '20px', color: 'var(--text-muted)' }}>No games found.</div>
            )}
          </div>
        </div>

        {availableLetters.length > 1 && (
          <div className="letter-jump" role="navigation" aria-label="Jump to letter">
            {availableLetters.map(letter => (
              <button
                key={letter}
                className="letter-jump-btn"
                tabIndex={0}
                onClick={() => scrollToLetter(letter)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    scrollToLetter(letter);
                  }
                }}
              >
                {letter}
              </button>
            ))}
          </div>
        )}

        {overlayLetter && (
          <div className="letter-overlay" key={overlayKey ?? undefined} aria-hidden="true">{overlayLetter}</div>
        )}
      </div>
    </>
  );
}
