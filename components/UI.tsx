import React from 'react';
import { GameState } from '../types';
import { COLORS, PLAYER_HP } from '../constants';

interface UIProps {
  gameState: GameState;
  score: number;
  hp?: number;
  shieldTime?: number;
  multishotTime?: number;
  setGameState: (state: GameState) => void;
  isMobile: boolean;
  screenshot?: Blob | null;
}

const UI: React.FC<UIProps> = ({ 
  gameState, 
  score, 
  hp = PLAYER_HP, 
  shieldTime = 0, 
  multishotTime = 0, 
  setGameState, 
  isMobile,
  screenshot
}) => {
  
  const handleStart = () => {
    // Fullscreen request removed as PWA mode handles layout better on mobile
    setGameState(GameState.PLAYING);
  };

  const handleShare = async () => {
    const text = `I scored ${Math.floor(score)}, challenge me at neon-galaxy.vercel.app`;
    
    if (navigator.share) {
        try {
            const shareData: any = {
                title: 'Neon Galaxy Score',
                text: text,
            };

            // Attempt to attach screenshot if available
            if (screenshot) {
                const file = new File([screenshot], 'neongalaxy-score.png', { type: 'image/png' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    shareData.files = [file];
                } else {
                    // If files not supported, append URL
                    shareData.url = 'https://neon-galaxy.vercel.app';
                }
            } else {
                shareData.url = 'https://neon-galaxy.vercel.app';
            }
            
            await navigator.share(shareData);
        } catch (err) {
            console.error('Share failed', err);
        }
    } else {
        alert('Sharing not supported on this browser.');
    }
  };

  const renderHealthBar = () => {
    const pct = Math.max(0, Math.min(100, (hp / PLAYER_HP) * 100));
    
    return (
        <div className="w-56">
            <div className="flex justify-between items-end mb-1">
                <span className="text-pink-500 text-xs tracking-[0.2em] font-bold">SYSTEM INTEGRITY</span>
                <span className="text-pink-500 text-xs font-mono drop-shadow-[0_0_5px_rgba(255,0,255,0.8)]">{Math.ceil(hp)}/{PLAYER_HP}</span>
            </div>
            <div className="w-full h-4 border border-pink-500/50 bg-gray-900/50 skew-x-[-15deg] p-0.5 backdrop-blur-sm">
                <div 
                    className="h-full bg-gradient-to-r from-pink-600 to-pink-400 shadow-[0_0_10px_rgba(255,0,255,0.6)] transition-all duration-100 ease-linear"
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
  };

  if (gameState === GameState.PLAYING) {
    return (
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none p-6 flex justify-between items-start">
        {/* Health */}
        <div className="flex flex-col">
            {renderHealthBar()}
        </div>

        {/* Right HUD: Score & Powerups */}
        <div className="flex flex-col items-end gap-2">
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

             {/* Powerup Timers */}
             {shieldTime > 0 && (
                 <div className="flex items-center bg-cyan-900/50 px-3 py-1 rounded border border-cyan-500 animate-pulse">
                     <span className="font-bold text-cyan-400 text-sm mr-2">SHIELD</span>
                     <span className="font-mono text-white text-lg">{shieldTime}s</span>
                 </div>
             )}
             
             {multishotTime > 0 && (
                 <div className="flex items-center bg-green-900/50 px-3 py-1 rounded border border-green-500">
                     <span className="font-bold text-green-400 text-sm mr-2">MULTI</span>
                     <span className="font-mono text-white text-lg">{multishotTime}s</span>
                 </div>
             )}
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
          
          <div className="flex flex-col gap-4">
              <button 
                onClick={handleStart}
                className="inline-block px-6 py-2 border border-red-500 text-red-500 hover:bg-red-500 hover:text-black font-bold text-xl uppercase tracking-widest cursor-pointer transition-colors focus:outline-none"
              >
                 {isMobile ? "TAP TO RETRY" : "TAP OR PRESS SPACE TO RETRY"}
              </button>

              {isMobile && (
                <button
                    onClick={handleShare}
                    className="inline-block px-6 py-2 bg-blue-600 text-white font-bold text-sm uppercase tracking-widest cursor-pointer hover:bg-blue-500 transition-colors focus:outline-none shadow-[0_0_10px_rgba(0,100,255,0.5)]"
                >
                    SHARE SCORE
                </button>
              )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default UI;