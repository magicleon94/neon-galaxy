import React from 'react';
import { GameState } from '../types';
import { COLORS } from '../constants';

interface UIProps {
  gameState: GameState;
  score: number;
  hp?: number; // Optional prop as it's not needed in Menu
  setGameState: (state: GameState) => void;
  isMobile: boolean;
}

const UI: React.FC<UIProps> = ({ gameState, score, hp = 100, setGameState, isMobile }) => {
  
  const handleStart = () => {
    // Attempt to enter fullscreen on start interaction
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch((err) => {
        console.log(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else if ((elem as any).webkitRequestFullscreen) { /* Safari */
      (elem as any).webkitRequestFullscreen();
    }
    
    setGameState(GameState.PLAYING);
  };

  // Render Hearts based on HP (20HP = 1 Heart)
  const renderHearts = () => {
    const totalHearts = 5;
    const currentHearts = Math.ceil(hp / 20);
    const hearts = [];
    
    for (let i = 0; i < totalHearts; i++) {
        hearts.push(
            <span 
                key={i} 
                className="text-2xl mr-1 drop-shadow-[0_0_5px_rgba(255,0,255,0.8)]"
                style={{ 
                    color: i < currentHearts ? COLORS.neonPink : '#333' 
                }}
            >
                ♥
            </span>
        );
    }
    return hearts;
  };

  if (gameState === GameState.PLAYING) {
    return (
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none p-6 flex justify-between items-start">
        {/* Health */}
        <div className="flex flex-col">
            <span className="text-pink-500 text-xs tracking-widest mb-1">SYSTEM INTEGRITY</span>
            <div className="flex">
                {renderHearts()}
            </div>
        </div>

        {/* Score */}
        <div className="flex flex-col items-end">
             <span className="text-cyan-400 text-xs tracking-widest">SCORE</span>
             <h2 
                className="text-4xl font-black italic tracking-widest"
                style={{ 
                    color: COLORS.neonYellow, 
                    textShadow: `2px 2px 0px ${COLORS.neonPink}` 
                }}
            >
                {Math.floor(score).toString().padStart(6, '0')}
            </h2>
        </div>
      </div>
    );
  }

  if (gameState === GameState.MENU) {
    return (
      <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/80 backdrop-blur-sm">
        <div className="text-center p-8 border-4 border-cyan-500 bg-black/90 shadow-[0_0_30px_rgba(0,255,255,0.5)] transform hover:scale-105 transition-transform duration-300">
          <h1 className="text-6xl font-black mb-4 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-500 animate-pulse">
            NEON GALAXY
          </h1>
          <p className="text-gray-300 mb-8 font-mono text-sm max-w-md mx-auto">
            SYSTEM ONLINE. PILOT READY.<br/><br/>
            {!isMobile && (
              <>
                <span className="text-pink-500">[WASD]</span> MOVE SHIP<br/>
                <span className="text-green-500">[SPACE]</span> FIRE WEAPONS<br/><br/>
              </>
            )}
            ELIMINATE ENEMY FLEET. DODGE LASERS.<br/>
            COLLECT <span className="text-pink-500">♥</span> TO RESTORE INTEGRITY.
          </p>
          <div className="animate-bounce">
            <button 
              onClick={handleStart}
              className="inline-block px-6 py-2 bg-cyan-600 text-black font-bold text-xl uppercase tracking-widest cursor-pointer hover:bg-cyan-400 focus:outline-none"
            >
              {isMobile ? "TAP TO LAUNCH" : "TAP OR PRESS SPACE TO LAUNCH"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === GameState.GAME_OVER) {
    return (
      <div className="absolute inset-0 flex items-center justify-center z-10 bg-red-900/40 backdrop-blur-sm">
        <div className="text-center p-8 border-4 border-red-500 bg-black/90 shadow-[0_0_50px_rgba(255,0,0,0.5)]">
          <h1 className="text-6xl font-black mb-2 text-red-500 glitch-text">
            M.I.A.
          </h1>
          <div className="mb-6">
            <p className="text-gray-400 text-sm">FINAL SCORE</p>
            <p className="text-5xl font-mono text-white">{Math.floor(score).toString().padStart(6, '0')}</p>
          </div>
          <button 
            onClick={handleStart}
            className="inline-block px-6 py-2 border border-red-500 text-red-500 hover:bg-red-500 hover:text-black font-bold text-xl uppercase tracking-widest cursor-pointer transition-colors focus:outline-none"
          >
             {isMobile ? "TAP TO RETRY" : "TAP OR PRESS SPACE TO RETRY"}
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default UI;