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

export default function App() {
  useSpatialNavigation();

  const searchRef = useRef(null);
  const letterNavRef = useRef(null);
  const onSearchFocus = useCallback(() => {
    const el = searchRef.current || document.querySelector('.search-input');
    if (el) { el.focus(); el.select(); }
  }, []);
  const onLetterPrev = useCallback(() => letterNavRef.current?.letterOffset(-1), []);
  const onLetterNext = useCallback(() => letterNavRef.current?.letterOffset(1), []);

  const {
    config, setConfig, library, loading, error,
    selectedGame, setSelectedGame,
    saveAndConnect, downloadGame, deleteGame,
  } = useRomLibrary();

  const [activeTab, setActiveTab] = useState('platforms');
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [showCollectionsRoot, setShowCollectionsRoot] = useState(true);

  useEffect(() => { if (activeTab === 'collections') setShowCollectionsRoot(true); }, [activeTab]);

  useEffect(() => {
    if (!selectedPlatform && library.platforms) {
      const first = Object.keys(library.platforms).sort()[0];
      if (first) setSelectedPlatform(first);
    }
    if (!selectedCollection && library.collections) {
      const first = Object.keys(library.collections).sort()[0];
      if (first) setSelectedCollection(first);
    }
  }, [library.platforms, library.collections, selectedPlatform, selectedCollection]);

  const currentGames = useMemo(() => {
    if (activeTab === 'library_all') return library.all;
    if (activeTab === 'platforms') return library.platforms[selectedPlatform] || [];
    if (activeTab === 'collections') return library.collections[selectedCollection] || [];
    if (activeTab === 'downloaded') return library.all.filter(g => g.downloaded);
    return [];
  }, [activeTab, selectedPlatform, selectedCollection, library]);

  const libraryTitle = useMemo(() => {
    if (activeTab === 'platforms') return selectedPlatform || 'Library';
    if (activeTab === 'collections') return selectedCollection || 'Collection';
    if (activeTab === 'downloaded') return 'Ready to Play (Downloaded)';
    return '';
  }, [activeTab, selectedPlatform, selectedCollection]);

  const onGameSelect = useCallback((game) => setSelectedGame(game), [setSelectedGame]);
  const onCloseModal = useCallback(() => setSelectedGame(null), [setSelectedGame]);
  const onCollectionSelect = useCallback((c) => {
    setSelectedCollection(c);
    setShowCollectionsRoot(false);
  }, [setSelectedCollection]);

  const onContextMenu = useCallback(() => {
    const el = document.activeElement;
    const id = el?.dataset?.gameId || el?.closest?.('.game-card')?.dataset?.gameId;
    if (!id) return;
    const game = library.all.find(g => String(g.id) === String(id));
    if (game) setSelectedGame(game);
  }, [library.all]);

  useController({ onSearchFocus, onLetterPrev, onLetterNext, onContextMenu });

  return (
    <>
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        library={library}
        selectedPlatform={selectedPlatform}
        setSelectedPlatform={setSelectedPlatform}
      />

      <div className="main-content">
        {loading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, flexDirection: 'column' }}>
            <div className="spinner"></div>
            <div style={{ marginTop: '20px', color: 'var(--text-muted)' }}>Loading...</div>
          </div>
        )}

        {activeTab === 'settings' && (
          <SettingsPage config={config} setConfig={setConfig} onSave={saveAndConnect} error={error} />
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
        {activeTab === 'savesync' && <SaveSyncPage />}

        {((activeTab === 'platforms' || activeTab === 'downloaded' || activeTab === 'library_all') || (activeTab === 'collections' && !showCollectionsRoot)) && (
          <LibraryPage
            title={activeTab === 'library_all' ? 'All Games' : libraryTitle}
            games={currentGames}
            token={config.token}
            onGameSelect={onGameSelect}
            config={config}
            onRegisterLetterNav={(nav) => { letterNavRef.current = nav; }}
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
    </>
  );
}
