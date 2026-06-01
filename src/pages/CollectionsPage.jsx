import React from 'react';
import AuthImage from '../components/AuthImage';
import Focusable from '../components/Focusable';

export default function CollectionsPage({ collections, library, token, onCollectionSelect }) {
  return (
    <>
      <div className="topbar">
        <h2 style={{ margin: 0 }}>All Collections</h2>
      </div>
      <div className="content-area">
        <div className="game-grid" style={{ '--grid-card-width': '200px' }}>
          {collections.map(c => {
            const games = library.collections[c];
            const coverUrl = games[0]?.coverUrl;
            return (
              <Focusable
                key={c}
                className="game-card"
                onActivate={() => onCollectionSelect(c)}
              >
                {coverUrl ? (
                  <AuthImage src={coverUrl} token={token} className="game-cover" style={{ backgroundSize: 'cover' }} />
                ) : (
                  <div className="game-cover" style={{ background: 'var(--surface)' }}></div>
                )}
                <div className="game-info">
                  <div className="game-title">{c}</div>
                  <div className="game-status">{games.length} Games</div>
                </div>
              </Focusable>
            );
          })}
          {collections.length === 0 && (
            <div style={{ padding: '20px', color: 'var(--text-muted)' }}>No collections found.</div>
          )}
        </div>
      </div>
    </>
  );
}
