import React from 'react';
import AuthImage from './AuthImage';
import Focusable from './Focusable';

export default function GameCard({ game, token, onClick, onContextMenu, config, id }) {
  return (
    <Focusable
      id={id}
      className="game-card"
      title={game.title}
      data-game-id={game.id}
      onActivate={() => onClick(game)}
      onSecondary={() => onContextMenu(game)}
      style={{ position: 'relative' }}
    >
      {game.downloaded && <div className="installed-badge">✓</div>}
      <AuthImage
        src={game.coverUrl}
        token={token}
        className="game-cover"
        style={{ backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }}
      />
      {config?.showGameTitles !== false && (
        <div className="game-info">
          <div className="game-title">{game.title}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{game.platform}</div>
        </div>
      )}
    </Focusable>
  );
}
