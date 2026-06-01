import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSpatialNavigation } from './hooks/useSpatialNavigation';
import { useController } from './hooks/useController';
import { useRomLibrary } from './hooks/useRomLibrary';
import './index.css';

import Sidebar from './components/Sidebar';
import GameActionModal from './components/GameActionModal';
import LibraryPage from './pages/LibraryPage';
import CollectionsPage from './pages/CollectionsPage';
import SettingsPage from './pages/SettingsPage';
import FirmwarePage from './pages/FirmwarePage';
import SaveSyncPage from './pages/SaveSyncPage';
import WelcomeWizard from './components/WelcomeWizard';
import ErrorBoundary from './components/ErrorBoundary';
import { isBrowserPlaySupported } from './browserPlaySupport';
import type { Game, Tab } from './vite-env';

export default function App() {
  const {
    config, setConfig, updateConfig, library, loading, error,
    selectedGame, setSelectedGame,
    saveAndConnect, downloadGame, deleteGame,
    showWizard, completeWizard, reopenWizard, closeWizard, testConnection,
  } = useRomLibrary();

  const searchRef = useRef<HTMLInputElement>(null);
  const letterNavRef = useRef<{ scrollToLetter: (l: string) => void; letterOffset: (d: number) => void } | null>(null);
  const onSearchFocus = useCallback(() => {
    const el = searchRef.current || document.querySelector<HTMLInputElement>('.search-input');
    if (el) { el.focus(); el.select(); }
  }, []);
  const onLetterPrev = useCallback(() => letterNavRef.current?.letterOffset(-1), []);
  const onLetterNext = useCallback(() => letterNavRef.current?.letterOffset(1), []);

  useSpatialNavigation(false);

  const [activeTab, setActiveTab] = useState<Tab>('library_all');
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [downloadedOnly, setDownloadedOnly] = useState<boolean>(false);
  const [playInBrowserOnly, setPlayInBrowserOnly] = useState<boolean>(false);
  const [showCollectionsRoot, setShowCollectionsRoot] = useState<boolean>(true);

  useEffect(() => { if (activeTab === 'collections') setShowCollectionsRoot(true); }, [activeTab]);

  useEffect(() => {
    if (!selectedCollection && library.collections && Object.keys(library.collections).length > 0) {
      const first = Object.keys(library.collections).sort()[0];
      if (first) setSelectedCollection(first);
    }
  }, [library.collections, selectedCollection]);

  const currentGames: Game[] = useMemo(() => {
    let list: Game[];
    if (activeTab === 'library_all') list = library.all;
    else if (activeTab === 'platforms') list = library.platforms[selectedPlatform || ''] || [];
    else if (activeTab === 'collections') list = library.collections[selectedCollection || ''] || [];
    else if (activeTab === 'downloaded') list = library.all.filter(g => g.downloaded || isBrowserPlaySupported(g.emuFolder));
    else list = [];
    if (downloadedOnly) list = list.filter(g => g.downloaded);
    if (playInBrowserOnly) list = list.filter(g => isBrowserPlaySupported(g.emuFolder));
    return list;
  }, [activeTab, selectedPlatform, selectedCollection, downloadedOnly, playInBrowserOnly, library]);

  const libraryTitle = useMemo(() => {
    if (activeTab === 'platforms') return selectedPlatform || 'Library';
    if (activeTab === 'collections') return selectedCollection || 'Collection';
    if (activeTab === 'downloaded') return 'Ready to Play';
    return 'My Library';
  }, [activeTab, selectedPlatform, selectedCollection]);

  const onGameSelect = useCallback((game: Game) => setSelectedGame(game), [setSelectedGame]);
  const onCloseModal = useCallback(() => setSelectedGame(null), [setSelectedGame]);
  const onCollectionSelect = useCallback((c: string) => {
    setSelectedCollection(c);
    setShowCollectionsRoot(false);
  }, [setSelectedCollection]);

  const onContextMenu = useCallback(() => {
    const el = document.activeElement as HTMLElement | null;
    const id = el?.dataset?.gameId || el?.closest?.('.game-card')?.getAttribute?.('data-game-id');
    if (!id) return;
    const game = library.all.find(g => String(g.id) === String(id));
    if (game) setSelectedGame(game);
  }, [library.all, setSelectedGame]);

  useController({ onSearchFocus, onLetterPrev, onLetterNext, onContextMenu }, false);

  return (
    <>
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        config={config}
      />

      <div className="main-content">
        {loading && (
          <div className="loading-container">
            <div className="loading-brand">ROMM-SD</div>
            <div className="spinner"></div>
            <div className="loading-text">Loading your library…</div>
          </div>
        )}

        {activeTab === 'settings' && (
          <ErrorBoundary key="settings">
            <SettingsPage config={config} setConfig={setConfig} updateConfig={updateConfig} onSave={saveAndConnect} error={error} onRerunWizard={reopenWizard} />
          </ErrorBoundary>
        )}

        {activeTab === 'collections' && showCollectionsRoot && (
          <CollectionsPage
            collections={Object.keys(library.collections).sort()}
            library={library}
            token={config.token}
            onCollectionSelect={onCollectionSelect}
          />
        )}

        {activeTab === 'firmware' && <FirmwarePage config={config} />}
        {activeTab === 'savesync' && <SaveSyncPage library={library} config={config} enabled={!!config.saveSyncEnabled} />}

        {((activeTab === 'platforms' || activeTab === 'downloaded' || activeTab === 'library_all') || (activeTab === 'collections' && !showCollectionsRoot)) && (
          <LibraryPage
            title={activeTab === 'library_all' ? 'All Games' : libraryTitle}
            games={currentGames}
            token={config.token}
            onGameSelect={onGameSelect}
            config={config}
            onRegisterLetterNav={(nav) => { letterNavRef.current = nav; }}
            library={library}
            selectedPlatform={selectedPlatform}
            onPlatformChange={(p) => {
              setSelectedPlatform(p);
              if (p) setActiveTab('platforms');
            }}
            downloadedOnly={downloadedOnly}
            onDownloadedChange={setDownloadedOnly}
            showDownloadedToggle
            playInBrowserOnly={playInBrowserOnly}
            onPlayInBrowserChange={setPlayInBrowserOnly}
            showPlayInBrowserToggle
            collections={Object.keys(library.collections).sort()}
            selectedCollection={activeTab === 'collections' ? selectedCollection : null}
            onCollectionChange={(c) => {
              if (c) { setSelectedCollection(c); setShowCollectionsRoot(false); }
              else { setShowCollectionsRoot(true); setActiveTab('collections'); }
            }}
            onBackToCollectionsRoot={activeTab === 'collections' ? () => setShowCollectionsRoot(true) : null}
          />
        )}
      </div>

      {selectedGame && (
        <GameActionModal
          game={selectedGame}
          config={config}
          onClose={onCloseModal}
          onDownload={downloadGame}
          onDelete={deleteGame}
        />
      )}

      {showWizard && (
        <WelcomeWizard
          initialConfig={config}
          onTestConnection={testConnection}
          onComplete={completeWizard}
          onClose={closeWizard}
        />
      )}
    </>
  );
}
