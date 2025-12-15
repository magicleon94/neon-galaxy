import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import UI from './components/UI';
import { GameState } from './types';
import { PLAYER_HP } from './constants';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState<number>(0);
  const [hp, setHp] = useState<number>(PLAYER_HP);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkTouch = () => {
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  return (
    <div className="relative w-screen h-[100dvh] flex flex-col items-center justify-center bg-gray-900 overflow-hidden select-none touch-none">
      {/* Container fits screen dynamically. Removed max-w/max-h to allow full scaling */}
      <div className="relative w-full h-full shadow-2xl flex items-center justify-center">
        <GameCanvas 
          gameState={gameState} 
          setGameState={setGameState} 
          score={score} 
          setScore={setScore}
          setHp={setHp}
          isMobile={isMobile}
        />
        <UI 
          gameState={gameState} 
          score={score} 
          hp={hp} 
          setGameState={setGameState}
          isMobile={isMobile}
        />
      </div>
      
      {/* Background decorations for wide screens */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 bg-gradient-to-br from-purple-900/20 to-blue-900/20 pointer-events-none"></div>
    </div>
  );
};

export default App;